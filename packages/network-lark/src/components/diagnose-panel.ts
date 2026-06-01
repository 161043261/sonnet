import { View } from "@lark.js/mvc";
import template from "./diagnose-panel.html";
import { useDiagnoseStore } from "@/diagnose-store";
import { t } from "@/locales/i18n";
import type {
  DiagnosticResult,
  ApiCheckResult,
  ResourceCheckResult,
  LocationInfo,
  SpeedTestResult,
  NetworkInfo,
} from "@/sdk/types";
import { DiagnosticTaskId } from "@/sdk/types";

function prepareDetailData(item: DiagnosticResult): Record<string, unknown> {
  if (!item.details) return {};

  if (item.id === DiagnosticTaskId.NetworkStatus) {
    const info = item.details as NetworkInfo & { online: boolean };
    return {
      detailOnline: info.online,
      detailEffectiveType: info.effectiveType || "",
      detailDownlink:
        info.downlink !== undefined ? `${info.downlink} Mbps` : t("ui.unknown"),
      detailRtt: info.rtt !== undefined ? `${info.rtt} ms` : t("ui.unknown"),
      detailHasSaveData: info.saveData !== undefined,
      detailSaveData: !!info.saveData,
    };
  }

  if (item.id === DiagnosticTaskId.LocationCheck) {
    const info = item.details as LocationInfo;
    return {
      detailIp: info.ip || "",
      detailCity: info.city || "",
      detailRegion: info.region || "",
      detailCountry: info.country || "",
      detailIsp: info.isp || "",
    };
  }

  if (item.id === DiagnosticTaskId.SpeedTest) {
    const info = item.details as SpeedTestResult;
    return {
      detailSpeed: String(info.downloadSpeedMbps),
      detailLatency: info.latencyMs != null ? String(info.latencyMs) : "?",
    };
  }

  if (item.id === DiagnosticTaskId.ApiCheck) {
    const list = item.details as ApiCheckResult[];
    return {
      detailList: list.map((api) => ({
        url: api.url,
        status: String(api.status),
        ok: api.ok,
        timeMs: String(api.timeMs),
      })),
    };
  }

  if (item.id === DiagnosticTaskId.ResourceCheck) {
    const list = item.details as ResourceCheckResult[];
    return {
      detailList: list.map((res) => ({
        url: res.url,
        loaded: res.loaded,
        timeMs: String(res.timeMs),
      })),
    };
  }

  return {};
}

export default View.extend({
  template,

  init() {
    const store = useDiagnoseStore(this);

    const syncToView = () => {
      const s = useDiagnoseStore();
      const displayResults = (s.results || []).map(
        (item: DiagnosticResult) => ({
          ...item,
          hasRepair: !!item.repair && item.status === "failure",
          hasDetails: !!item.details,
          ...prepareDetailData(item),
        }),
      );

      this.updater.digest({
        isOpen: s.isOpen || false,
        results: displayResults,
        isRunning: s.isRunning || false,
        hasFailures: s.hasFailures || false,
        sessionId: s.sessionId || "",
        showToast: s.showToast || false,
        panelTitle: t("ui.title"),
        btnText: t("ui.btn_text"),
        startMsg: t("ui.start_msg"),
        startBtn: t("ui.start_btn"),
        diagnosingBtn: t("ui.diagnosing_btn"),
        onCallBtn: t("ui.on_call_btn"),
        diagIdLabel: t("ui.diag_id"),
        recommendationLabel: t("ui.recommendation"),
        repairBtn: t("ui.repair_btn"),
        repairingBtn: t("ui.repairing_btn"),
        uiOnline: t("ui.online"),
        uiYes: t("ui.yes"),
        uiNo: t("ui.no"),
        uiNetworkType: t("ui.network_type"),
        uiDownlink: t("ui.downlink"),
        uiRtt: t("ui.rtt"),
        uiDataSaver: t("ui.data_saver"),
        uiOn: t("ui.on"),
        uiOff: t("ui.off"),
        uiUnknown: t("ui.unknown"),
        uiIp: t("ui.ip"),
        uiLocation: t("ui.location"),
        uiIsp: t("ui.isp"),
        uiDownloadSpeed: t("ui.download_speed"),
        uiLatency: t("ui.latency"),
        uiOk: t("ui.ok"),
        uiFail: t("ui.fail"),
      });
    };

    store.observe(
      this,
      ["isOpen", "results", "isRunning", "hasFailures", "showToast", "lang"],
      syncToView,
    );
    syncToView();
  },

  "onOpenPanel<click>"() {
    useDiagnoseStore().openPanel();
  },

  "onClosePanel<click>"() {
    useDiagnoseStore().closePanel();
  },

  "onStartDiagnosis<click>"() {
    void useDiagnoseStore().startDiagnosis();
  },

  "onRepair<click>"(e: Record<string, unknown>) {
    const params = e.params as Record<string, string> | undefined;
    if (params?.id) useDiagnoseStore().repairItem(params.id);
  },

  "onTriggerOnCall<click>"() {
    useDiagnoseStore().triggerOnCall();
  },
});
