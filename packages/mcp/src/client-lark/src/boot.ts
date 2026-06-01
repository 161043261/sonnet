import "./main.css";
import { Framework, registerViewClass } from "@lark.js/mvc";
import type { FrameworkConfig } from "@lark.js/mvc";
import HomeView from "./views/home";
import PromptFormView from "./components/prompt-form";

registerViewClass("home", HomeView);
registerViewClass("components/prompt-form", PromptFormView);

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
