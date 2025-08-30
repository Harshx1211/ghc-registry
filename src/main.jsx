import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { RegistryProvider } from "./store/RegistryContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <RegistryProvider>
        <App />
      </RegistryProvider>
    </BrowserRouter>
  </React.StrictMode>
);
