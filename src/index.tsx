// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PrimeReactProvider } from "primereact/api";

// (Optional) global css if not already included
// import "primereact/resources/themes/lara-light-blue/theme.css";
// import "primereact/resources/primereact.min.css";
// import "primeicons/primeicons.css";
import "./index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <PrimeReactProvider
      value={{
        ripple: true,
        inputStyle: "outlined",
        // optional defaults; adjust to your app’s needs
        zIndex: { modal: 1100, overlay: 1000, menu: 1000, tooltip: 1200 },
        // if you use unstyled variants, set unstyled: true
      }}
    >
      <App />
    </PrimeReactProvider>
  </React.StrictMode>
);