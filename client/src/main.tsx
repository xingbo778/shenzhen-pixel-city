import { createRoot } from "react-dom/client";
import App from "./App";
import { getAnalyticsConfig, injectAnalyticsScript } from "./lib/analytics";
import "./index.css";

const analyticsConfig = getAnalyticsConfig(import.meta.env);
if (analyticsConfig) {
  injectAnalyticsScript(document, analyticsConfig);
}

createRoot(document.getElementById("root")!).render(<App />);
