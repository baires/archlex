import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app mount point");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
