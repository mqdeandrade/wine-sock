import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Blind tasting, less admin</p>
        <h1>Wine Sock</h1>
        <p>
          Create a tasting, share a code, and let everyone lock one varietal
          guess per sock-covered bottle.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
