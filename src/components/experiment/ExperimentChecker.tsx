import QuickReadout from "./QuickReadout";

export default function ExperimentChecker() {
  return <section className="experiment-checker" aria-label="Experiment Decision Checker">
    <div className="tool-mode-header">
      <h1>Experiment Decision Checker</h1>
      <p>Understand the evidence before making a decision.</p>
    </div>
    <QuickReadout />
  </section>;
}
