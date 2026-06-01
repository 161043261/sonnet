import {
  type DiagnosticResult,
  type SDKOptions,
  type NetworkInfo,
  type ApiCheckResult,
  type ResourceCheckResult,
  type LocationInfo,
  type DiagnosticCallback,
  DiagnosticTaskId,
} from "./types";

class Bus<
  TResult extends { id: string },
  TCallback extends (results: TResult[]) => void,
> {
  protected listeners = new Set<TCallback>();
  protected results: TResult[] = [];

  public subscribe(callback: TCallback) {
    this.listeners.add(callback);
    callback([...this.results]);
    return () => {
      this.listeners.delete(callback);
    };
  }

  protected emit() {
    this.listeners.forEach((listener) => listener([...this.results]));
  }

  protected addResult(result: TResult) {
    const existingIndex = this.results.findIndex((r) => r.id === result.id);
    if (existingIndex >= 0) {
      this.results[existingIndex] = result;
    } else {
      this.results.push(result);
    }
    this.emit();
  }

  protected updateResult(id: string, updates: Partial<TResult>) {
    const index = this.results.findIndex((r) => r.id === id);
    if (index >= 0) {
      this.results[index] = { ...this.results[index], ...updates };
      this.emit();
    }
  }

  public getResults() {
    return this.results;
  }
}

class NetworkDiagnoseSDK extends Bus<DiagnosticResult, DiagnosticCallback> {
  private config: SDKOptions;

  constructor(config: SDKOptions) {
    super();
    this.config = { ...config, lang: config.lang || "en" };
    if (config.onResultsUpdate) {
      this.subscribe(config.onResultsUpdate);
    }
    this.setupNetworkListeners();
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.config.t ? this.config.t(key, params) : key;
  }

  private get context(): SDKOptions {
    return { ...this.config, updateResult: this.updateResult.bind(this) };
  }

  public setLang(lang: "en" | "zh") {
    this.config.lang = lang;
  }

  private setupNetworkListeners() {
    const handleChange = () => {
      const hasResult = this.results.some(
        (r) => r.id === DiagnosticTaskId.NetworkStatus,
      );
      if (hasResult) this.checkNetworkStatus();
    };
    window.addEventListener("online", handleChange);
    window.addEventListener("offline", handleChange);
    navigator.connection?.addEventListener("change", handleChange);
  }

  private createRepairFn(id: string, taskFn: () => Promise<void>) {
    let isRepairing = false;
    return async () => {
      if (isRepairing) return false;
      isRepairing = true;
      this.updateResult(id, {
        repairStatus: "repairing",
        message: this.t("repair.running"),
      });
      try {
        await taskFn();
        return true;
      } finally {
        isRepairing = false;
      }
    };
  }

  public async runFullDiagnosis() {
    this.results = [];
    this.emit();
    const tasks = [
      this.checkNetworkStatus(),
      this.checkLocation(),
      this.checkSpeed(),
      this.checkApiConnectivity(),
      this.checkResources(),
      ...this.runCustomTasks(),
    ];
    await Promise.allSettled(tasks);
  }

  private runCustomTasks() {
    if (!this.config.customTasks) return [];
    return this.config.customTasks.map(async (task) => {
      this.addResult({ id: task.id, name: task.name, status: "running" });
      const start = performance.now();
      const repairFn = task.repair
        ? async () => {
            this.updateResult(task.id, { repairStatus: "repairing" });
            try {
              const success = (await task.repair?.(this.context)) ?? false;
              this.updateResult(task.id, {
                repairStatus: success ? "success" : "failure",
                message: success
                  ? this.t("repair.success")
                  : this.t("repair.failure"),
              });
              if (success) {
                this.updateResult(task.id, { status: "running" });
                const newDetails = await task.run(this.context);
                this.updateResult(task.id, {
                  status: "success",
                  details: newDetails,
                  error: undefined,
                  recommendation: undefined,
                });
              }
              return success;
            } catch {
              this.updateResult(task.id, {
                repairStatus: "failure",
                message: this.t("repair.failure"),
              });
              return false;
            }
          }
        : undefined;
      try {
        const details = await task.run(this.context);
        this.updateResult(task.id, {
          status: "success",
          details,
          duration: Math.round(performance.now() - start),
          repair: repairFn,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown Error";
        this.updateResult(task.id, {
          status: "failure",
          error: message,
          duration: Math.round(performance.now() - start),
          repair: repairFn,
        });
      }
    });
  }

  private async checkNetworkStatus() {
    const id = DiagnosticTaskId.NetworkStatus;
    this.addResult({
      id,
      name: this.t("task.network_status.name"),
      status: "running",
    });
    try {
      const online = navigator.onLine;
      const info: NetworkInfo & { online: boolean } = {
        online,
        effectiveType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt,
        saveData: navigator.connection?.saveData,
      };
      if (!online) throw new Error(this.t("task.network_status.offline_error"));
      const effectiveTypeStr = info.effectiveType || "Unknown";
      const dataSaverStr = info.saveData ? " (Data Saver Mode)" : "";
      this.updateResult(id, {
        status: "success",
        details: info,
        message: this.t("task.network_status.success", {
          effectiveType: effectiveTypeStr,
          dataSaver: dataSaverStr,
          rtt: info.rtt || "?",
        }),
        duration: 0,
      });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : this.t("task.network_status.unknown_error");
      this.updateResult(id, {
        status: "failure",
        error: message,
        recommendation: this.t("task.network_status.recommendation"),
        repair: this.createRepairFn(id, this.checkNetworkStatus.bind(this)),
      });
    }
  }

  private async checkLocation() {
    const id = DiagnosticTaskId.LocationCheck;
    this.addResult({
      id,
      name: this.t("task.location.name"),
      status: "running",
    });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok)
        throw new Error(
          this.t("task.location.http_error", { status: response.status }),
        );
      const data = await response.json();
      const location: LocationInfo = {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        isp: data.org,
      };
      this.updateResult(id, {
        status: "success",
        details: location,
        message: this.t("task.location.success", {
          city: location.city,
          region: location.region,
          country: location.country,
          isp: location.isp,
        }),
        duration: 0,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      this.updateResult(id, {
        status: "failure",
        error: this.t("task.location.error", { message }),
        recommendation: this.t("task.location.recommendation"),
        repair: this.createRepairFn(id, this.checkLocation.bind(this)),
      });
    }
  }

  private async checkSpeed() {
    const id = DiagnosticTaskId.SpeedTest;
    const testUrl =
      this.config.speedTestFileUrl ||
      "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png";
    this.addResult({ id, name: this.t("task.speed.name"), status: "running" });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(new Error("Timeout")),
        10_000,
      );
      const startTime = performance.now();
      const response = await fetch(`${testUrl}?t=${startTime}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(this.t("task.speed.download_error"));
      }
      const blob = await response.blob();
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const mbps = (
        (blob.size * 8) /
        ((endTime - startTime) / 1000) /
        (1024 * 1024)
      ).toFixed(2);
      this.updateResult(id, {
        status: "success",
        details: {
          downloadSpeedMbps: parseFloat(mbps),
          latencyMs: Math.round(endTime - startTime),
        },
        message: this.t("task.speed.success", { mbps }),
        duration: Math.round(endTime - startTime),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      this.updateResult(id, {
        status: "failure",
        error: this.t("task.speed.error", { message }),
        recommendation: this.t("task.speed.recommendation"),
        repair: this.createRepairFn(id, this.checkSpeed.bind(this)),
      });
    }
  }

  private async checkApiConnectivity() {
    const id = DiagnosticTaskId.ApiCheck;
    const apiList = this.config.apiList || [];
    if (apiList.length === 0) {
      this.addResult({
        id,
        name: this.t("task.api.name"),
        status: "skipped",
        message: this.t("task.api.skipped"),
      });
      return;
    }
    this.addResult({ id, name: this.t("task.api.name"), status: "running" });
    const results: ApiCheckResult[] = [];
    let failures = 0;
    for (const url of apiList) {
      const start = performance.now();
      try {
        const res = await fetch(url, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
        results.push({
          url,
          status: res.status,
          ok: res.type === "opaque" ? true : res.ok,
          timeMs: Math.round(performance.now() - start),
        });
      } catch {
        failures++;
        results.push({
          url,
          status: 0,
          ok: false,
          timeMs: Math.round(performance.now() - start),
        });
      }
    }
    const allOk = failures === 0;
    this.updateResult(id, {
      status: allOk ? "success" : "failure",
      details: results,
      message: this.t("task.api.success", {
        reachable: results.length - failures,
        total: results.length,
      }),
      recommendation: !allOk ? this.t("task.api.recommendation") : undefined,
      duration: Math.max(...results.map((r) => r.timeMs)),
      repair: !allOk
        ? this.createRepairFn(id, this.checkApiConnectivity.bind(this))
        : undefined,
    });
  }

  private async checkResources() {
    const id = DiagnosticTaskId.ResourceCheck;
    const resourceList = this.config.resourceList || [];
    if (resourceList.length === 0) {
      this.addResult({
        id,
        name: this.t("task.resource.name"),
        status: "skipped",
        message: this.t("task.resource.skipped"),
      });
      return;
    }
    this.addResult({
      id,
      name: this.t("task.resource.name"),
      status: "running",
    });
    const results: ResourceCheckResult[] = [];
    let failures = 0;
    const checkImage = (url: string): Promise<ResourceCheckResult> =>
      new Promise((resolve) => {
        const start = performance.now();
        const img = new Image();
        img.onload = () =>
          resolve({
            url,
            loaded: true,
            timeMs: Math.round(performance.now() - start),
          });
        img.onerror = () =>
          resolve({
            url,
            loaded: false,
            timeMs: Math.round(performance.now() - start),
          });
        img.src = `${url}?t=${Date.now()}`;
      });
    const checks = await Promise.all(resourceList.map(checkImage));
    for (const res of checks) {
      if (!res.loaded) failures++;
      results.push(res);
    }
    const allOk = failures === 0;
    this.updateResult(id, {
      status: allOk ? "success" : "failure",
      details: results,
      message: this.t("task.resource.success", {
        loaded: results.length - failures,
        total: results.length,
      }),
      recommendation: !allOk
        ? this.t("task.resource.recommendation")
        : undefined,
      duration: Math.max(...results.map((r) => r.timeMs)),
      repair: !allOk
        ? this.createRepairFn(id, this.checkResources.bind(this))
        : undefined,
    });
  }
}

export default NetworkDiagnoseSDK;
