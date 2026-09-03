"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  FlaskConical,
  Minus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "./ui";
import { Input } from "./ui";
import { Label } from "./ui";
import { NativeSelect, NativeSelectOption } from "./ui";
import {
  analyseExperiment,
  formatInteger,
  formatPValue,
  formatPercent,
  type AnalysisResult,
  type ExperimentInput,
  type TriState,
} from "./statistics";
import "./checker.css";

const DEFAULT_INPUT: ExperimentInput = {
  experimentName: "",
  metricPreSpecified: "yes",
  randomAssignment: "yes",
  analysisUnitMatches: "yes",
  interference: "no",
  monitoringMode: "continuous",
  outcomeWindow: "7-day",
  controlAssigned: 10000,
  controlMature: 7200,
  controlConversions: 720,
  treatmentAssigned: 10000,
  treatmentMature: 7000,
  treatmentConversions: 770,
  expectedTreatmentShare: 0.5,
  minimumWorthwhileGainPp: null,
  maximumTolerableLossPp: null,
};

const EXAMPLE_INPUT: ExperimentInput = {
  experimentName: "Checkout reassurance message",
  metricPreSpecified: "yes",
  randomAssignment: "yes",
  analysisUnitMatches: "yes",
  interference: "no",
  monitoringMode: "fixed",
  outcomeWindow: "7-day",
  controlAssigned: 100000,
  controlMature: 100000,
  controlConversions: 10000,
  treatmentAssigned: 100000,
  treatmentMature: 100000,
  treatmentConversions: 12000,
  expectedTreatmentShare: 0.5,
  minimumWorthwhileGainPp: 0.5,
  maximumTolerableLossPp: 0.25,
};

type CountField =
  | "controlAssigned"
  | "controlMature"
  | "controlConversions"
  | "treatmentAssigned"
  | "treatmentMature"
  | "treatmentConversions";
type ThresholdField = "minimumWorthwhileGainPp" | "maximumTolerableLossPp";
const allocations = [
  { label: "50 / 50", value: 0.5 },
  { label: "60 / 40", value: 0.4 },
  { label: "40 / 60", value: 0.6 },
  { label: "70 / 30", value: 0.3 },
  { label: "30 / 70", value: 0.7 },
];

function signedPoints(value: number | null, digits = 2) {
  return value === null
    ? "Not available"
    : `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)} pp`;
}
function signedPercent(value: number | null, digits = 1) {
  return value === null
    ? "Not available"
    : `${value > 0 ? "+" : ""}${formatPercent(value, digits)}`;
}

function ChoiceButtons({
  label,
  value,
  onChange,
  helper,
  goodValue = "yes",
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
  helper: string;
  goodValue?: TriState;
}) {
  return (
    <div className="choice-question">
      <div>
        <span className="choice-question__label">{label}</span>
        <span className="choice-question__helper">{helper}</span>
      </div>
      <fieldset className="choice-buttons">
        <legend className="sr-only">{label}</legend>
        {(["yes", "no", "unsure"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "is-selected" : ""}
            data-good={option === goodValue ? "true" : undefined}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
function IntegrityIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <Check aria-hidden="true" />;
  if (status === "fail") return <X aria-hidden="true" />;
  return <CircleHelp aria-hidden="true" />;
}
function DecisionIcon({ result }: { result: AnalysisResult }) {
  if (result.decision.tone === "rollout")
    return <ArrowUpRight aria-hidden="true" />;
  if (result.decision.tone === "stop")
    return <ArrowDownRight aria-hidden="true" />;
  if (result.decision.tone === "investigate")
    return <ShieldAlert aria-hidden="true" />;
  if (result.decision.tone === "neutral") return <Minus aria-hidden="true" />;
  if (result.decision.tone === "incomplete")
    return <CircleHelp aria-hidden="true" />;
  return <Clock3 aria-hidden="true" />;
}

function EffectRange({ result }: { result: AnalysisResult }) {
  const harm = result.thresholds.harmBoundary;
  const benefit = result.thresholds.benefitBoundary;
  const estimate = result.absoluteEffect;
  if (harm === null || benefit === null || estimate === null) return null;
  const minimum = Math.min(result.interval.lower, harm, 0, benefit);
  const maximum = Math.max(result.interval.upper, harm, 0, benefit);
  const padding = Math.max(maximum - minimum, 0.001) * 0.16;
  const low = minimum - padding;
  const span = maximum + padding - low;
  const position = (value: number) =>
    Math.max(0, Math.min(100, ((value - low) / span) * 100));
  const harmPosition = position(harm);
  const zeroPosition = position(0);
  const benefitPosition = position(benefit);
  const intervalStart = position(result.interval.lower);
  const intervalEnd = position(result.interval.upper);
  return (
    <figure className="effect-range" aria-labelledby="effect-range-title">
      <figcaption>
        <div>
          <p className="eyebrow">Commercial range</p>
          <h3 id="effect-range-title">Where the plausible effect sits</h3>
        </div>
        <span>{result.interval.label}</span>
      </figcaption>
      <div className="effect-range__labels" aria-hidden="true">
        <span>Unacceptable harm</span>
        <span>Commercially immaterial</span>
        <span>Worthwhile gain</span>
      </div>
      <div className="effect-range__plot">
        <div
          className="range-zone range-zone--harm"
          style={{ width: `${harmPosition}%` }}
        />
        <div
          className="range-zone range-zone--neutral"
          style={{
            left: `${harmPosition}%`,
            width: `${benefitPosition - harmPosition}%`,
          }}
        />
        <div
          className="range-zone range-zone--benefit"
          style={{
            left: `${benefitPosition}%`,
            width: `${100 - benefitPosition}%`,
          }}
        />
        <span
          className="range-marker range-marker--harm"
          style={{ left: `${harmPosition}%` }}
        />
        <span
          className="range-marker range-marker--zero"
          style={{ left: `${zeroPosition}%` }}
        />
        <span
          className="range-marker range-marker--benefit"
          style={{ left: `${benefitPosition}%` }}
        />
        <span
          className="range-interval"
          style={{
            left: `${intervalStart}%`,
            width: `${intervalEnd - intervalStart}%`,
          }}
        />
        <span
          className="range-estimate"
          style={{ left: `${position(estimate)}%` }}
        />
      </div>
      <div className="effect-range__ticks" aria-hidden="true">
        <span style={{ left: `${harmPosition}%` }}>{signedPoints(harm)}</span>
        <span style={{ left: `${zeroPosition}%` }}>0 pp</span>
        <span style={{ left: `${benefitPosition}%` }}>
          {signedPoints(benefit)}
        </span>
      </div>
      <p className="effect-range__summary">
        Estimate {signedPoints(estimate)} · interval{" "}
        {signedPoints(result.interval.lower)} to{" "}
        {signedPoints(result.interval.upper)}
      </p>
    </figure>
  );
}

function Results({
  result,
  stale,
}: {
  result: AnalysisResult;
  stale: boolean;
}) {
  return (
    <section
      className="results"
      data-stale={stale}
      aria-labelledby="results-title"
      aria-live="polite"
    >
      {stale ? (
        <output className="stale-notice">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>Inputs changed</strong>
            <span>Recalculate before using this decision.</span>
          </span>
        </output>
      ) : null}
      <article
        className={`decision-card decision-card--${result.decision.tone}`}
      >
        <div className="decision-card__icon">
          <DecisionIcon result={result} />
        </div>
        <div>
          <div className="decision-card__meta">
            <span>Decision</span>
            <span>{result.evidenceType} evidence</span>
            <span>{result.monitoringMode} monitoring</span>
          </div>
          <h2 id="results-title">{result.decision.label}</h2>
          <p className="decision-card__reason">{result.decision.reason}</p>
          <p className="decision-card__detail">{result.decision.detail}</p>
        </div>
      </article>

      <section className="result-section" aria-labelledby="integrity-title">
        <div className="result-section__heading">
          <div>
            <p className="eyebrow">01 · Trust</p>
            <h3 id="integrity-title">Integrity checks</h3>
          </div>
          <span
            className={`srm-pill srm-pill--${result.srm.passed ? "pass" : "fail"}`}
          >
            {result.srm.passed ? (
              <ShieldCheck aria-hidden="true" />
            ) : (
              <ShieldAlert aria-hidden="true" />
            )}{" "}
            SRM {result.srm.passed ? "passed" : "detected"}
          </span>
        </div>
        <ul className="integrity-list">
          {result.integrity.map((item) => (
            <li
              key={item.label}
              className={`integrity-item integrity-item--${item.status}`}
            >
              <span className="integrity-item__icon">
                <IntegrityIcon status={item.status} />
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="result-section" aria-labelledby="maturity-title">
        <div className="result-section__heading">
          <div>
            <p className="eyebrow">02 · Maturity</p>
            <h3 id="maturity-title">Who has completed the outcome window</h3>
          </div>
          <span>{formatPercent(result.maturity.overallRate, 1)} mature</span>
        </div>
        <dl className="maturity-metrics">
          <Metric
            label="Total assigned"
            value={formatInteger(result.maturity.totalAssigned)}
          />
          <Metric
            label="Mature"
            value={formatInteger(result.maturity.totalMature)}
          />
          <Metric
            label="Pending"
            value={formatInteger(result.maturity.totalPending)}
            detail="not extrapolated"
          />
        </dl>
        <div className="maturity-bars">
          <div>
            <span>Control</span>
            <i>
              <b style={{ width: `${result.maturity.controlRate * 100}%` }} />
            </i>
            <strong>{formatPercent(result.maturity.controlRate, 1)}</strong>
          </div>
          <div>
            <span>Treatment</span>
            <i>
              <b style={{ width: `${result.maturity.treatmentRate * 100}%` }} />
            </i>
            <strong>{formatPercent(result.maturity.treatmentRate, 1)}</strong>
          </div>
        </div>
      </section>

      <section className="result-section" aria-labelledby="effect-title">
        <div className="result-section__heading">
          <div>
            <p className="eyebrow">03 · Effect</p>
            <h3 id="effect-title">Conversion effect and uncertainty</h3>
          </div>
          <span>{result.experimentName || "Untitled experiment"}</span>
        </div>
        <dl className="effect-metrics">
          <Metric
            label="Control rate"
            value={
              result.controlRate === null
                ? "Not available"
                : formatPercent(result.controlRate, 2)
            }
          />
          <Metric
            label="Treatment rate"
            value={
              result.treatmentRate === null
                ? "Not available"
                : formatPercent(result.treatmentRate, 2)
            }
          />
          <Metric
            label="Absolute effect"
            value={signedPoints(result.absoluteEffect)}
            detail="treatment − control"
          />
          <Metric
            label="Relative uplift"
            value={signedPercent(result.relativeUplift)}
          />
        </dl>
        <div className="interval-callout">
          <div>
            <span>{result.interval.label}</span>
            <strong>
              {signedPoints(result.interval.lower)} to{" "}
              {signedPoints(result.interval.upper)}
            </strong>
          </div>
          <p>
            {result.monitoringMode === "continuous"
              ? "Valid under continuous monitoring. Deliberately more conservative than a fixed-horizon interval."
              : "Newcombe hybrid-score interval, using Wilson score bounds for both proportions."}
          </p>
        </div>
        <EffectRange result={result} />
      </section>

      {result.warnings.length ? (
        <aside className="warnings" aria-labelledby="warnings-title">
          <div className="result-section__heading">
            <div>
              <p className="eyebrow">Review</p>
              <h3 id="warnings-title">Warnings and context</h3>
            </div>
            <AlertTriangle aria-hidden="true" />
          </div>
          <ul>
            {result.warnings.map((warning) => (
              <li
                key={warning.title}
                className={`warning warning--${warning.severity}`}
              >
                <strong>{warning.title}</strong>
                <span>{warning.detail}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <details className="technical-details">
        <summary>Detailed statistical readout</summary>
        <dl>
          <Metric label="Inference method" value={result.interval.method} />
          <Metric
            label="Two-sided p-value"
            value={
              result.pValue === null
                ? "Not reported"
                : formatPValue(result.pValue)
            }
            detail={
              result.pValue === null
                ? "Not used for continuously monitored evidence"
                : (result.hypothesisMethod ?? undefined)
            }
          />
          <Metric
            label="SRM p-value"
            value={formatPValue(result.srm.pValue)}
            detail={`${result.srm.method} · α = 0.01`}
          />
          <Metric
            label="Observed allocation"
            value={`${formatPercent(result.srm.observedControlShare, 1)} / ${formatPercent(result.srm.observedTreatmentShare, 1)}`}
            detail="control / treatment"
          />
        </dl>
      </details>
    </section>
  );
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="field-error">{children}</p> : null;
}

export default function Checker() {
  const [input, setInput] = useState<ExperimentInput>(DEFAULT_INPUT);
  const [analysedInput, setAnalysedInput] =
    useState<ExperimentInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<AnalysisResult>(() =>
    analyseExperiment(DEFAULT_INPUT),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const expectedControlShare = useMemo(
    () => 1 - input.expectedTreatmentShare,
    [input.expectedTreatmentShare],
  );
  const isStale = JSON.stringify(input) !== JSON.stringify(analysedInput);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "check_experiment_decision",
        title: "Check experiment decision readiness",
        description:
          "Analyse a two-variant binary conversion experiment, update the visible checker, and return integrity, maturity, uncertainty, SRM and the rule-based commercial decision.",
        inputSchema: {
          type: "object",
          properties: {
            experimentName: { type: "string" },
            monitoringMode: { type: "string", enum: ["continuous", "fixed"] },
            controlAssigned: { type: "integer", minimum: 1 },
            controlMature: { type: "integer", minimum: 0 },
            controlConversions: { type: "integer", minimum: 0 },
            treatmentAssigned: { type: "integer", minimum: 1 },
            treatmentMature: { type: "integer", minimum: 0 },
            treatmentConversions: { type: "integer", minimum: 0 },
            expectedTreatmentShare: {
              type: "number",
              exclusiveMinimum: 0,
              exclusiveMaximum: 1,
            },
            minimumWorthwhileGainPp: { type: "number", exclusiveMinimum: 0 },
            maximumTolerableLossPp: { type: "number", exclusiveMinimum: 0 },
          },
          required: [
            "controlAssigned",
            "controlMature",
            "controlConversions",
            "treatmentAssigned",
            "treatmentMature",
            "treatmentConversions",
          ],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(rawInput) {
          const values = rawInput as Partial<ExperimentInput>;
          const nextInput: ExperimentInput = { ...DEFAULT_INPUT, ...values };
          const nextResult = analyseExperiment(nextInput);
          setInput(nextInput);
          setAnalysedInput(nextInput);
          setErrors({});
          setResult(nextResult);
          return {
            decision: nextResult.decision.label,
            reason: nextResult.decision.reason,
            interval: nextResult.interval,
            absoluteEffect: nextResult.absoluteEffect,
            srmPassed: nextResult.srm.passed,
            matureShare: nextResult.maturity.overallRate,
            warnings: nextResult.warnings.map((warning) => warning.title),
          };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => lifecycle.abort());
    return () => lifecycle.abort();
  }, []);

  const updateCount = (field: CountField, raw: string) =>
    setInput((current) => ({
      ...current,
      [field]: raw === "" ? Number.NaN : Number(raw),
    }));
  const updateThreshold = (field: ThresholdField, raw: string) =>
    setInput((current) => ({
      ...current,
      [field]: raw === "" ? null : Number(raw),
    }));
  function run(nextInput = input, scroll = true) {
    try {
      const nextResult = analyseExperiment(nextInput);
      setErrors({});
      setResult(nextResult);
      setAnalysedInput(nextInput);
      if (scroll && window.innerWidth < 980)
        window.requestAnimationFrame(() =>
          document
            .getElementById("results-title")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    } catch (error) {
      if (error && typeof error === "object" && "fieldErrors" in error)
        setErrors(
          (error as { fieldErrors: Record<string, string> }).fieldErrors,
        );
    }
  }
  function load(values: ExperimentInput) {
    setInput(values);
    run(values, false);
  }

  return (
    <div className="checker-main">
      <section className="hero">
        <p className="eyebrow">Decision suite · Full assessment</p>
        <h1>
          Experiment
          <br />
          Decision Checker
        </h1>
        <p className="hero__deck">
          For rollout and stop decisions: assess design validity, outcome
          maturity, monitoring, uncertainty and commercial relevance.
        </p>
        <div className="hero__actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => load(EXAMPLE_INPUT)}
          >
            <FlaskConical aria-hidden="true" /> Try an example
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => load(DEFAULT_INPUT)}
          >
            <RotateCcw aria-hidden="true" /> Reset
          </Button>
        </div>
      </section>

      <div className="workspace">
        <section className="input-panel" aria-labelledby="input-title">
          <div className="panel-heading">
            <p className="eyebrow">Experiment brief</p>
            <h2 id="input-title">Evidence in</h2>
            <p>
              Start with validity. Then report only users who have completed the
              outcome window.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run();
            }}
            noValidate
          >
            <details className="config-section" open>
              <summary>
                <span>01</span>
                <div>
                  <strong>Design and monitoring</strong>
                  <small>Can this comparison support the claim?</small>
                </div>
              </summary>
              <div className="config-section__body">
                <div className="field">
                  <Label htmlFor="experiment-name">
                    Experiment name <span>Optional</span>
                  </Label>
                  <Input
                    id="experiment-name"
                    value={input.experimentName ?? ""}
                    placeholder="e.g. Checkout reassurance message"
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        experimentName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <span className="field-label">Monitoring plan</span>
                  <fieldset className="mode-switch">
                    <legend className="sr-only">Monitoring plan</legend>
                    <button
                      type="button"
                      className={
                        input.monitoringMode === "continuous"
                          ? "is-selected"
                          : ""
                      }
                      aria-pressed={input.monitoringMode === "continuous"}
                      onClick={() =>
                        setInput((current) => ({
                          ...current,
                          monitoringMode: "continuous",
                        }))
                      }
                    >
                      Continuous <small>Anytime-valid</small>
                    </button>
                    <button
                      type="button"
                      className={
                        input.monitoringMode === "fixed" ? "is-selected" : ""
                      }
                      aria-pressed={input.monitoringMode === "fixed"}
                      onClick={() =>
                        setInput((current) => ({
                          ...current,
                          monitoringMode: "fixed",
                        }))
                      }
                    >
                      Fixed horizon <small>One planned look</small>
                    </button>
                  </fieldset>
                  <p className="field-help">
                    {input.monitoringMode === "continuous"
                      ? "Use when results may be checked repeatedly. The interval remains valid under optional stopping."
                      : "Use only when the sample or end date was fixed in advance and the result is read once."}
                  </p>
                </div>
                <div className="design-questions">
                  <ChoiceButtons
                    label="Primary metric chosen before looking?"
                    helper="Post-hoc metrics are exploratory."
                    value={input.metricPreSpecified}
                    onChange={(value) =>
                      setInput((current) => ({
                        ...current,
                        metricPreSpecified: value,
                      }))
                    }
                  />
                  <ChoiceButtons
                    label="Random assignment?"
                    helper="Required for a standard causal comparison."
                    value={input.randomAssignment}
                    onChange={(value) =>
                      setInput((current) => ({
                        ...current,
                        randomAssignment: value,
                      }))
                    }
                  />
                  <ChoiceButtons
                    label="Analysis unit matches randomisation?"
                    helper="Users, sessions or clusters must align."
                    value={input.analysisUnitMatches}
                    onChange={(value) =>
                      setInput((current) => ({
                        ...current,
                        analysisUnitMatches: value,
                      }))
                    }
                  />
                  <ChoiceButtons
                    label="Cross-group interference?"
                    helper="Shared supply, pricing, inventory or networks."
                    value={input.interference}
                    goodValue="no"
                    onChange={(value) =>
                      setInput((current) => ({
                        ...current,
                        interference: value,
                      }))
                    }
                  />
                </div>
              </div>
            </details>

            <details className="config-section" open>
              <summary>
                <span>02</span>
                <div>
                  <strong>Outcome maturity and counts</strong>
                  <small>Separate assignment from completed outcomes.</small>
                </div>
              </summary>
              <div className="config-section__body">
                <div className="two-column-fields">
                  <div className="field">
                    <Label htmlFor="outcome-window">Outcome window</Label>
                    <NativeSelect
                      id="outcome-window"
                      value={input.outcomeWindow}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          outcomeWindow: event.target
                            .value as ExperimentInput["outcomeWindow"],
                        }))
                      }
                    >
                      <NativeSelectOption value="session">
                        Same session
                      </NativeSelectOption>
                      <NativeSelectOption value="1-day">
                        1 day
                      </NativeSelectOption>
                      <NativeSelectOption value="3-day">
                        3 days
                      </NativeSelectOption>
                      <NativeSelectOption value="7-day">
                        7 days
                      </NativeSelectOption>
                      <NativeSelectOption value="14-day">
                        14 days
                      </NativeSelectOption>
                      <NativeSelectOption value="custom">
                        Custom
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                  <div className="field">
                    <Label htmlFor="expected-allocation">
                      Expected allocation
                    </Label>
                    <NativeSelect
                      id="expected-allocation"
                      value={input.expectedTreatmentShare}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          expectedTreatmentShare: Number(event.target.value),
                        }))
                      }
                    >
                      {allocations.map((allocation) => (
                        <NativeSelectOption
                          key={allocation.label}
                          value={allocation.value}
                        >
                          {allocation.label} (control / treatment)
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <p className="field-help">
                      Expected {formatPercent(expectedControlShare, 0)} control
                    </p>
                  </div>
                </div>
                {input.outcomeWindow === "custom" ? (
                  <div className="field">
                    <Label htmlFor="custom-window">Custom outcome window</Label>
                    <Input
                      id="custom-window"
                      value={input.customOutcomeWindow ?? ""}
                      placeholder="e.g. 21 days after assignment"
                      aria-invalid={Boolean(errors.customOutcomeWindow)}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          customOutcomeWindow: event.target.value,
                        }))
                      }
                    />
                    <FieldError>{errors.customOutcomeWindow}</FieldError>
                  </div>
                ) : null}
                <p className="maturity-note">
                  <Clock3 aria-hidden="true" /> A user is mature only after
                  their full outcome window has elapsed. Pending users are
                  excluded, never extrapolated.
                </p>
                {(["control", "treatment"] as const).map((variant) => {
                  const assigned = `${variant}Assigned` as CountField;
                  const mature = `${variant}Mature` as CountField;
                  const conversions = `${variant}Conversions` as CountField;
                  return (
                    <fieldset className="variant-group" key={variant}>
                      <legend>
                        <span
                          className={`variant-dot variant-dot--${variant}`}
                        />
                        {variant[0].toUpperCase() + variant.slice(1)}
                      </legend>
                      <div className="variant-fields">
                        <div className="field">
                          <Label htmlFor={assigned}>Assigned</Label>
                          <Input
                            id={assigned}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={
                              Number.isNaN(input[assigned])
                                ? ""
                                : input[assigned]
                            }
                            aria-invalid={Boolean(errors[assigned])}
                            onChange={(event) =>
                              updateCount(assigned, event.target.value)
                            }
                          />
                        </div>
                        <div className="field">
                          <Label htmlFor={mature}>Mature</Label>
                          <Input
                            id={mature}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={
                              Number.isNaN(input[mature]) ? "" : input[mature]
                            }
                            aria-invalid={Boolean(errors[mature])}
                            onChange={(event) =>
                              updateCount(mature, event.target.value)
                            }
                          />
                        </div>
                        <div className="field">
                          <Label htmlFor={conversions}>Conversions</Label>
                          <Input
                            id={conversions}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={
                              Number.isNaN(input[conversions])
                                ? ""
                                : input[conversions]
                            }
                            aria-invalid={Boolean(errors[conversions])}
                            onChange={(event) =>
                              updateCount(conversions, event.target.value)
                            }
                          />
                        </div>
                      </div>
                      <FieldError>
                        {errors[assigned] ||
                          errors[mature] ||
                          errors[conversions]}
                      </FieldError>
                    </fieldset>
                  );
                })}
              </div>
            </details>

            <details className="config-section" open>
              <summary>
                <span>03</span>
                <div>
                  <strong>Commercial boundaries</strong>
                  <small>Define what would change the decision.</small>
                </div>
              </summary>
              <div className="config-section__body">
                <p className="section-note">
                  No defaults: set these from the economics and risk of this
                  decision, not from the observed result.
                </p>
                <div className="two-column-fields">
                  <div className="field">
                    <Label htmlFor="worthwhile-gain">
                      Minimum worthwhile gain <span>pp</span>
                    </Label>
                    <Input
                      id="worthwhile-gain"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g. 0.50"
                      value={input.minimumWorthwhileGainPp ?? ""}
                      aria-invalid={Boolean(errors.minimumWorthwhileGainPp)}
                      onChange={(event) =>
                        updateThreshold(
                          "minimumWorthwhileGainPp",
                          event.target.value,
                        )
                      }
                    />
                    <FieldError>{errors.minimumWorthwhileGainPp}</FieldError>
                  </div>
                  <div className="field">
                    <Label htmlFor="tolerable-loss">
                      Maximum tolerable loss <span>pp</span>
                    </Label>
                    <Input
                      id="tolerable-loss"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g. 0.25"
                      value={input.maximumTolerableLossPp ?? ""}
                      aria-invalid={Boolean(errors.maximumTolerableLossPp)}
                      onChange={(event) =>
                        updateThreshold(
                          "maximumTolerableLossPp",
                          event.target.value,
                        )
                      }
                    />
                    <FieldError>{errors.maximumTolerableLossPp}</FieldError>
                  </div>
                </div>
              </div>
            </details>
            <Button type="submit" size="lg" className="check-button">
              Check decision readiness <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </section>
        <Results result={result} stale={isStale} />
      </div>
      <footer className="product-footer">
        <p>Binary outcome · Two variants · 95% uncertainty intervals</p>
        <p>No experiment data leaves this page.</p>
      </footer>
    </div>
  );
}
