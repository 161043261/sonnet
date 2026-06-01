import "./main.css";
import { Framework, registerViewClass } from "@lark.js/mvc";
import type { FrameworkConfig } from "@lark.js/mvc";
import HomeView from "./views/home";
import SearchView from "./components/search";

// Register View classes
registerViewClass("home", HomeView);
registerViewClass("components/search", SearchView);

async function enableMocking() {
  if (!import.meta.env.DEV) return;

  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

async function bootstrap() {
  await enableMocking();

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
}

bootstrap();
