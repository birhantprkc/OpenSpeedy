import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./i18n";
import App from "./App";
import { SnackbarProvider } from "./contexts/SnackbarContext";
import { ErrorBoundary, installGlobalErrorHandlers } from "./utils/frontendLog";

// Before React mounts: anything thrown during startup must reach the log file
// instead of leaving an empty window behind.
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SnackbarProvider>
        <App />
      </SnackbarProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
