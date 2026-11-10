import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// UI font (shadcn / Paper design): Geist. Reference screens are drawn in Inter.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
