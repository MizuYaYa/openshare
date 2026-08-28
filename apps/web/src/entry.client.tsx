import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

ReactDOM.hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>,
);
