import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { registerServiceWorker, setupSyncMessageHandler } from "./services/serviceWorker";
import "./index.css";

// Register Service Worker for background sync
if (typeof window !== "undefined") {
  registerServiceWorker().catch((error) => {
    console.warn("Failed to register Service Worker:", error);
  });
  
  // Setup message handler for Service Worker sync operations
  setupSyncMessageHandler();
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

