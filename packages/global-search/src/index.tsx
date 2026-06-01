import "./main.css";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");

async function enableMocking() {
  if (!import.meta.env.DEV) return;

  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

async function bootstrap() {
  await enableMocking();

  if (!container) return;

  createRoot(container).render(<App />);
}

bootstrap();
