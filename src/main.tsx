import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { persistLovablePreviewToken } from "./lib/lovablePreview";

persistLovablePreviewToken();

createRoot(document.getElementById("root")!).render(<App />);
