"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  FlaskConical,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "./ui";
import { Input } from "./ui";
import { Label } from "./ui";
import { NativeSelect, NativeSelectOption } from "./ui";
import {
  analyseExperiment,
  formatPValue,
  formatPercent,
  type AnalysisResult,
  type ExperimentInput,
} from "./statistics";
import "./checker.css";
import "./quick-checker.css";

interface QuickInput {
  experimentName: string;
  controlVisitors: number;
  controlConversions: number;
  treatmentVisitors: number;
  treatmentConversions: number;
  expectedTreatmentShare: number;
}

const DEFAULT_INPUT: QuickInput = {
  experimentName: "",
  controlVisitors: 10000,
  controlConversions: 1200,
  treatmentVisitors: 10000,
  treatmentConversions: 1320,
  expectedTreatmentShare: 0.5,
};

const EXAMPLE_INPUT: QuickInput = {
  experimentName: "Checkout button copy",
  controlVisitors: 25000,
  controlConversions: 2500,
  treatmentVisitors: 25000,
  treatmentConversions: 2775,
  expectedTreatmentShare: 0.5,
};

type CountField =
  | "controlVisitors"
  | "controlConversions"
  | "treatmentVisitors"
  | "treatmentConversions";

function toExperimentInput(input: QuickInput): ExperimentInput {
  return {
    experimentName: input.experimentName,
    metricPreSpecified: "yes",
    randomAssignment: "yes",
    analysisUnitMatches: "yes",
    interference: "no",
    monitoringMode: "fixed",
    outcomeWindow: "session",
    controlAssigned: input.controlVisitors,
    controlMature: input.controlVisitors,
    controlConversions: input.controlConversions,
    treatmentAssigned: input.treatmentVisitors,
    treatmentMature: input.treatmentVisitors,
    treatmentConversions: input.treatmentConversions,
    expectedTreatmentShare: input.expectedTreatmentShare,
    minimumWorthwhileGainPp: null,
    maximumTolerableLossPp: null,
  };
}

function signedPoints(value: number | null) {
  return value === null
    ? "Not available"
    : `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)} pp`;
}

function signedPercent(value: number | null) {
  return value === null
    ? "Not available"
    : `${value > 0 ? "+" : ""}${formatPercent(value, 1)}`;
}

function quickConclusion(result: AnalysisResult) {
  if (!result.srm.passed) {
    return {
      label: "Investigate before interpreting",
      detail:
        "The observed traffic split is unlikely under the expected allocation.",
      tone: "investigate",
      icon: ShieldAlert,
    } as const;
  }
  if (result.interval.lower > 0) {
    return {
      label: "Evidence treatment is ahead",
      detail:
        "The 95% interval excludes no effect. Use the decision suite before making a rollout call.",
      tone: "positive",
      icon: ArrowUpRight,
    } as const;
  }
  if (result.interval.upper < 0) {
    return {
      label: "Evidence treatment is behind",
      detail:
        "The 95% interval excludes no effect. Use the decision suite before making a stop call.",
      tone: "negative",
      icon: ArrowDownRight,
    } as const;
  }
  return {
    label: "No clear difference yet",
    detail:
      "The plausible range still includes no effect. This is not evidence that both variants are equivalent.",
    tone: "uncertain",
    icon: ArrowRight,
  } as const;
}

function Readout({
  result,
  stale,
  onOpenSuite,
}: {
  result: AnalysisResult;
  stale: boolean;
  onOpenSuite: () => void;
}) {
  const conclusion = quickConclusion(result);
  const ConclusionIcon = conclusion.icon;
  return (
    <section
      className="quick-results"
      data-stale={stale}
      aria-labelledby="quick-result-title"
      aria-live="polite"
    >
      {stale ? (
        <output className="stale-notice">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>Inputs changed</strong>
            <span>Recalculate before using this readout.</span>
          </span>
        </output>
      ) : null}
      <div className="quick-results__heading">
        <div>
          <p className="eyebrow">Readout</p>
          <h2 id="quick-result-title">
            {result.experimentName || "Experiment result"}
          </h2>
        </div>
        <span
          className={`quick-srm quick-srm--${result.srm.passed ? "pass" : "fail"}`}
        >
          {result.srm.passed ? (
            <Check aria-hidden="true" />
          ) : (
            <AlertTriangle aria-hidden="true" />
          )}
          SRM {result.srm.passed ? "passed" : "detected"}
        </span>
      </div>

      <dl className="quick-metrics">
        <div>
          <dt>Control rate</dt>
          <dd>{formatPercent(result.controlRate ?? 0, 2)}</dd>
        </div>
        <div>
          <dt>Treatment rate</dt>
          <dd>{formatPercent(result.treatmentRate ?? 0, 2)}</dd>
        </div>
        <div>
          <dt>Absolute uplift</dt>
          <dd>{signedPoints(result.absoluteEffect)}</dd>
          <span>treatment − control</span>
        </div>
        <div>
          <dt>Relative uplift</dt>
          <dd>{signedPercent(result.relativeUplift)}</dd>
        </div>
      </dl>

      <article
        className={`quick-conclusion quick-conclusion--${conclusion.tone}`}
      >
        <ConclusionIcon aria-hidden="true" />
        <div>
          <p>Statistical signal</p>
          <h3>{conclusion.label}</h3>
          <span>{conclusion.detail}</span>
        </div>
      </article>

      <dl className="quick-diagnostics">
        <div>
          <dt>95% confidence interval</dt>
          <dd>
            {signedPoints(result.interval.lower)} to{" "}
            {signedPoints(result.interval.upper)}
          </dd>
          <span>Newcombe score interval</span>
        </div>
        <div>
          <dt>Two-sided p-value</dt>
          <dd>{formatPValue(result.pValue ?? 1)}</dd>
          <span>{result.hypothesisMethod}</span>
        </div>
        <div>
          <dt>Observed allocation</dt>
          <dd>
            {formatPercent(result.srm.observedControlShare, 1)} /{" "}
            {formatPercent(result.srm.observedTreatmentShare, 1)}
          </dd>
          <span>SRM p-value {formatPValue(result.srm.pValue)}</span>
        </div>
      </dl>

      <button className="suite-cta" type="button" onClick={onOpenSuite}>
        <div>
          <strong>Need an action recommendation?</strong>
          <span>
            Add design integrity, maturity, monitoring and commercial
            thresholds.
          </span>
        </div>
        <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}

export default function QuickReadout({
  onOpenSuite,
}: {
  onOpenSuite: () => void;
}) {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [analysedInput, setAnalysedInput] = useState(DEFAULT_INPUT);
  const [result, setResult] = useState(() =>
    analyseExperiment(toExperimentInput(DEFAULT_INPUT)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isStale = JSON.stringify(input) !== JSON.stringify(analysedInput);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "check_ab_test_readout",
        title: "Check an A/B test readout",
        description:
          "Calculate conversion rates, uplift, a fixed-horizon 95% interval, p-value and sample-ratio-mismatch check, then update the visible quick readout.",
        inputSchema: {
          type: "object",
          properties: {
            experimentName: { type: "string" },
            controlVisitors: { type: "integer", minimum: 1 },
            controlConversions: { type: "integer", minimum: 0 },
            treatmentVisitors: { type: "integer", minimum: 1 },
            treatmentConversions: { type: "integer", minimum: 0 },
            expectedTreatmentShare: {
              type: "number",
              exclusiveMinimum: 0,
              exclusiveMaximum: 1,
            },
          },
          required: [
            "controlVisitors",
            "controlConversions",
            "treatmentVisitors",
            "treatmentConversions",
          ],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(rawInput) {
          const nextInput = {
            ...DEFAULT_INPUT,
            ...(rawInput as Partial<QuickInput>),
          };
          const nextResult = analyseExperiment(toExperimentInput(nextInput));
          setInput(nextInput);
          setAnalysedInput(nextInput);
          setResult(nextResult);
          setErrors({});
          return {
            conclusion: quickConclusion(nextResult).label,
            absoluteUplift: nextResult.absoluteEffect,
            relativeUplift: nextResult.relativeUplift,
            interval: nextResult.interval,
            pValue: nextResult.pValue,
            srmPassed: nextResult.srm.passed,
          };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => lifecycle.abort());
    return () => lifecycle.abort();
  }, []);

  function updateNumber(field: CountField, rawValue: string) {
    setInput((current) => ({
      ...current,
      [field]: rawValue === "" ? Number.NaN : Number(rawValue),
    }));
  }

  function run(nextInput = input) {
    try {
      const nextResult = analyseExperiment(toExperimentInput(nextInput));
      setResult(nextResult);
      setAnalysedInput(nextInput);
      setErrors({});
      if (window.innerWidth < 900)
        window.requestAnimationFrame(() =>
          document
            .getElementById("quick-result-title")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    } catch (error) {
      if (error && typeof error === "object" && "fieldErrors" in error) {
        const source = (error as { fieldErrors: Record<string, string> })
          .fieldErrors;
        setErrors({
          controlVisitors: source.controlAssigned,
          controlConversions: source.controlConversions,
          treatmentVisitors: source.treatmentAssigned,
          treatmentConversions: source.treatmentConversions,
        });
      }
    }
  }

  function load(nextInput: QuickInput) {
    setInput(nextInput);
    run(nextInput);
  }

  return (
    <div className="checker-main quick-page">
      <section className="quick-intro">
        <div>
          <p className="eyebrow">A/B test readout</p>
          <h1>
            A/B Test
            <br />
            Quick Readout
          </h1>
        </div>
        <div>
          <p>
            Enter a two-variant conversion result for a fast, technically sound
            readout. No setup questionnaire required.
          </p>
          <div className="quick-actions">
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
        </div>
      </section>

      <div className="quick-workspace">
        <section className="quick-input" aria-labelledby="quick-input-title">
          <div className="quick-section-heading">
            <div>
              <p className="eyebrow">Inputs</p>
              <h2 id="quick-input-title">Experiment totals</h2>
            </div>
            <span>Fixed-horizon readout</span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run();
            }}
            noValidate
          >
            <div className="field quick-name">
              <Label htmlFor="quick-name">
                Experiment name <span>Optional</span>
              </Label>
              <Input
                id="quick-name"
                value={input.experimentName}
                placeholder="e.g. Checkout button copy"
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    experimentName: event.target.value,
                  }))
                }
              />
            </div>
            {(["control", "treatment"] as const).map((variant) => {
              const visitors = `${variant}Visitors` as CountField;
              const conversions = `${variant}Conversions` as CountField;
              return (
                <fieldset className="quick-variant" key={variant}>
                  <legend>{variant[0].toUpperCase() + variant.slice(1)}</legend>
                  <div>
                    <div className="field">
                      <Label htmlFor={visitors}>Visitors</Label>
                      <Input
                        id={visitors}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={
                          Number.isNaN(input[visitors]) ? "" : input[visitors]
                        }
                        aria-invalid={Boolean(errors[visitors])}
                        onChange={(event) =>
                          updateNumber(visitors, event.target.value)
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
                          updateNumber(conversions, event.target.value)
                        }
                      />
                    </div>
                  </div>
                  {errors[visitors] || errors[conversions] ? (
                    <p className="field-error">
                      {errors[visitors] || errors[conversions]}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
            <div className="field quick-allocation">
              <Label htmlFor="quick-allocation">Expected allocation</Label>
              <NativeSelect
                id="quick-allocation"
                value={input.expectedTreatmentShare}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    expectedTreatmentShare: Number(event.target.value),
                  }))
                }
              >
                <NativeSelectOption value="0.5">50 / 50</NativeSelectOption>
                <NativeSelectOption value="0.4">60 / 40</NativeSelectOption>
                <NativeSelectOption value="0.6">40 / 60</NativeSelectOption>
                <NativeSelectOption value="0.3">70 / 30</NativeSelectOption>
                <NativeSelectOption value="0.7">30 / 70</NativeSelectOption>
              </NativeSelect>
            </div>
            <Button type="submit" className="quick-submit">
              Check the result <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </section>
        <Readout result={result} stale={isStale} onOpenSuite={onOpenSuite} />
      </div>
      <footer className="product-footer">
        <p>Fixed-horizon statistical readout · 95% confidence level</p>
        <p>No experiment data leaves this page.</p>
      </footer>
    </div>
  );
}
