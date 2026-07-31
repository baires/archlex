import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app mount point");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
