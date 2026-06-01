import "./main.css";
import { Framework, registerViewClass } from "@lark.js/mvc";
import type { FrameworkConfig } from "@lark.js/mvc";
import HomeView from "./views/home";
import DiagnosePanelView from "./components/diagnose-panel";

// // Unregister any leftover MSW service worker from other projects
// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker.getRegistrations().then((registrations) => {
//     for (const registration of registrations) {
//       registration.unregister();
//     }
//   });
// }

registerViewClass("home", HomeView);
registerViewClass("components/diagnose-panel", DiagnosePanelView);

const config: FrameworkConfig = {
  rootId: "app",
  defaultPath: "/home",
  defaultView: "home",
  routes: {
    "/home": "home",
  },
  error(e: Error) {
    console.error("Lark error:", e);
  },
};

Framework.boot(config);
