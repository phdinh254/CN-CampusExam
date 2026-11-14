import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { BoCungCapUngDung } from "./app/boCungCap";
import "./styles/chung.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BoCungCapUngDung>
      <App />
    </BoCungCapUngDung>
  </StrictMode>,
);
