import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y #root trong index.html");
}

function showFatal(err) {
  const msg = err?.message || String(err);
  const stack = err?.stack || "";
  const hint =
    "G\u1ee3i \u00fd: m\u1edf F12 \u2192 Console; th\u1eed Ctrl+Shift+R; ch\u1ea1y npm run dev trong TP_FE (d\u00f9ng host: true trong vite.config, kh\u00f4ng c\u1ea7n --host 127.0.0.1).";
  rootEl.innerHTML = `<div style="padding:24px;font-family:system-ui,sans-serif;max-width:720px;margin:40px auto">
<h1 style="color:#b91c1c">\u004c\u1ed7i kh\u1edfi \u0111\u1ed9ng \u1ee9ng d\u1ee5ng</h1>
<p style="color:#374151">Module React kh\u00f4ng t\u1ea3i xong (th\u01b0\u1eddng do l\u1ed7i import/c\u00fa ph\u00e1p trong m\u1ed9t file \u0111\u01b0\u1ee3c import t\u1eeb App).</p>
<pre style="background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:13px;overflow:auto">${msg}\n${stack}</pre>
<p style="color:#6b7280">${hint}</p>
</div>`;
}

async function boot() {
  try {
    const { default: App } = await import("./App.jsx");
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>,
    );
  } catch (err) {
    console.error(err);
    showFatal(err);
  }
}

boot();
