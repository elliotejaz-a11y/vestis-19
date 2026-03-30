import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// On iOS, ensure focused inputs scroll into view within their scrollable container
// instead of the whole viewport shifting down behind the keyboard.
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document.addEventListener("focusin", (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      // Small delay to let the keyboard finish animating open
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }, 300);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
