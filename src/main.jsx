import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/tokens.css";
import { applyPalette, cachedPalette } from "./lib/palettes";
import App from "./App.jsx";

applyPalette(cachedPalette());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
