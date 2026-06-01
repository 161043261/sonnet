import { defineStore } from "@lark.js/mvc";
import type { DiagnosticResult, Lang, SDKOptions } from "@/sdk/types";
import NetworkDiagnoseSDK from "@/sdk/network-diagnose-sdk";
import { t, setLang, getLang } from "@/locales/i18n";

interface DiagnoseStoreAPI {
  isOpen: boolean;
  results: DiagnosticResult[];
  isRunning: boolean;
  hasFailures: boolean;
  sessionId: string;
  lang: Lang;
  showToast: boolean;

  openPanel: () => void;
  closePanel: () => void;
  startDiagnosis: () => void;
  repairItem: (id: string) => void;
  changeLang: (lang: Lang) => void;
  triggerOnCall: () => void;
  dismissToast: () => void;
}

const diagnosticConfig: Omit<SDKOptions, "onResultsUpdate" | "lang" | "t"> = {
  apiList: [
    "https://api.github.com",
    "https://jsonplaceholder.typicode.com/todos/1",
    "https://httpbin.org/get",
  ],
  resourceList: [
    "https://vitejs.dev/logo.svg",
    "https://react.dev/favicon.ico",
    "https://www.google.com/favicon.ico",
  ],
  speedTestFileUrl:
    "https://upload.wikimedia.org/wikipedia/commons/3/3d/LARGE_elevation.jpg",
};

export const useDiagnoseStore = defineStore<DiagnoseStoreAPI>(
  "diagnose",
  (store) => {
    let sdk: NetworkDiagnoseSDK | null = null;

    function getSDK(): NetworkDiagnoseSDK {
      if (!sdk) {
        sdk = new NetworkDiagnoseSDK({
          ...diagnosticConfig,
          lang: store.lang,
          t,
          onResultsUpdate: (newResults) => {
            store.results = newResults;
          },
        });
      }
      return sdk;
    }

    function openPanel() {
      store.isOpen = true;
    }

    function closePanel() {
      store.isOpen = false;
    }

    async function startDiagnosis() {
      store.isRunning = true;
      await getSDK().runFullDiagnosis();
      store.isRunning = false;
      store.hasFailures = store.results.some((r) => r.status === "failure");
    }

    function repairItem(id: string) {
      const item = store.results.find((r) => r.id === id);
      if (item?.repair) {
        void item.repair();
      }
    }

    function changeLang(lang: Lang) {
      store.lang = lang;
      setLang(lang);
      getSDK().setLang(lang);
    }

    function triggerOnCall() {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: store.lang,
        results: store.results,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/on/call", payload);
      } else {
        fetch("/on/call", {
          method: "POST",
          body: payload,
          keepalive: true,
        }).catch(console.error);
      }

      // Show toast since no onCallAction callback is configured
      store.showToast = true;
      setTimeout(() => {
        store.showToast = false;
      }, 3000);
    }

    function dismissToast() {
      store.showToast = false;
    }

    return {
      isOpen: false,
      results: [] as DiagnosticResult[],
      isRunning: false,
      hasFailures: false,
      sessionId: Date.now().toString().slice(-6),
      lang: getLang(),
      showToast: false,
      openPanel,
      closePanel,
      startDiagnosis,
      repairItem,
      changeLang,
      triggerOnCall,
      dismissToast,
    };
  },
);
