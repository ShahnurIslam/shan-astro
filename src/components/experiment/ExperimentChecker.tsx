import { useRef, useState, type KeyboardEvent } from "react";
import DecisionSuite from "./DecisionSuite";
import QuickReadout from "./QuickReadout";

type Mode = "quick" | "suite";

export default function ExperimentChecker() {
  const [mode, setMode] = useState<Mode>("quick");
  const quickRef = useRef<HTMLButtonElement>(null);
  const suiteRef = useRef<HTMLButtonElement>(null);

  function selectMode(next: Mode) {
    setMode(next);
    requestAnimationFrame(() =>
      (next === "quick" ? quickRef : suiteRef).current?.focus(),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectMode(
      event.key === "ArrowLeft" || event.key === "Home" ? "quick" : "suite",
    );
  }

  return (
    <section
      className="experiment-checker"
      aria-label="Experiment Decision Checker"
    >
      <div className="tool-mode-header">
        <div>
          <p className="tool-mode-header__eyebrow">Interactive decision tool</p>
          <h1>Experiment Decision Checker</h1>
        </div>
        <div
          className="tool-mode-tabs"
          role="tablist"
          aria-label="Checker mode"
          onKeyDown={handleKeyDown}
        >
          <button
            ref={quickRef}
            id="tab-quick"
            role="tab"
            aria-selected={mode === "quick"}
            aria-controls="panel-quick"
            tabIndex={mode === "quick" ? 0 : -1}
            onClick={() => setMode("quick")}
          >
            Quick Readout
          </button>
          <button
            ref={suiteRef}
            id="tab-suite"
            role="tab"
            aria-selected={mode === "suite"}
            aria-controls="panel-suite"
            tabIndex={mode === "suite" ? 0 : -1}
            onClick={() => setMode("suite")}
          >
            Decision Suite
          </button>
        </div>
      </div>
      <div
        id={mode === "quick" ? "panel-quick" : "panel-suite"}
        role="tabpanel"
        aria-labelledby={mode === "quick" ? "tab-quick" : "tab-suite"}
      >
        {mode === "quick" ? (
          <QuickReadout onOpenSuite={() => setMode("suite")} />
        ) : (
          <DecisionSuite />
        )}
      </div>
    </section>
  );
}
