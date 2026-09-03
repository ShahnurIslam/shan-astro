/**
 * Statistical core for the Experiment Decision Checker.
 *
 * Fixed horizon:
 * - Newcombe's uncorrected hybrid-score interval (method 10), built from
 *   Wilson score intervals for each independent proportion.
 * - A pooled two-proportion score/z test when expected cells are adequate.
 * - A two-sided Fisher exact test for sparse or degenerate 2x2 tables.
 *
 * Continuous monitoring:
 * - A Bernoulli confidence sequence formed by inverting the beta-binomial
 *   mixture likelihood-ratio e-process with a Jeffreys Beta(1/2, 1/2) mix.
 * - Each arm receives alpha/2; the treatment-control interval is the
 *   conservative difference of simultaneous arm bounds (union bound).
 *
 * Decision logic:
 * - Design/data-integrity blockers override downstream evidence.
 * - Commercial decisions compare the valid effect interval with asymmetric
 *   harm and worthwhile-gain thresholds supplied by the user.
 */

export type TriState = "yes" | "no" | "unsure";
export type MonitoringMode = "continuous" | "fixed";
export type OutcomeWindow =
  "session" | "1-day" | "3-day" | "7-day" | "14-day" | "custom";
export type DecisionLabel =
  | "Decision incomplete"
  | "Roll out treatment"
  | "Keep running"
  | "Stop treatment"
  | "Conclude no material effect"
  | "Investigate before deciding";
export type DecisionTone =
  "incomplete" | "rollout" | "running" | "stop" | "neutral" | "investigate";

export interface ExperimentInput {
  experimentName?: string;
  metricPreSpecified: TriState;
  randomAssignment: TriState;
  analysisUnitMatches: TriState;
  interference: TriState;
  monitoringMode: MonitoringMode;
  outcomeWindow: OutcomeWindow;
  customOutcomeWindow?: string;
  controlAssigned: number;
  controlMature: number;
  controlConversions: number;
  treatmentAssigned: number;
  treatmentMature: number;
  treatmentConversions: number;
  expectedTreatmentShare: number;
  minimumWorthwhileGainPp: number | null;
  maximumTolerableLossPp: number | null;
}

export interface Warning {
  title: string;
  detail: string;
  severity: "note" | "caution" | "blocker";
}

export interface Interval {
  lower: number;
  upper: number;
  width: number;
  label:
    | "95% fixed-horizon interval"
    | "95% anytime-valid interval"
    | "Interval unavailable";
  method:
    | "Newcombe hybrid-score"
    | "Beta-binomial mixture confidence sequence"
    | "Insufficient mature data";
}

export interface AnalysisResult {
  experimentName: string;
  monitoringMode: MonitoringMode;
  evidenceType: "confirmatory" | "exploratory" | "uncertain";
  controlRate: number | null;
  treatmentRate: number | null;
  absoluteEffect: number | null;
  relativeUplift: number | null;
  interval: Interval;
  pValue: number | null;
  hypothesisMethod:
    "Pooled two-proportion score test" | "Fisher exact test" | null;
  sparseData: boolean;
  srm: {
    passed: boolean;
    pValue: number;
    method: "Normal allocation test" | "Exact binomial allocation test";
    observedControlShare: number;
    observedTreatmentShare: number;
    expectedTreatmentShare: number;
  };
  maturity: {
    totalAssigned: number;
    totalMature: number;
    totalPending: number;
    overallRate: number;
    controlRate: number;
    treatmentRate: number;
    imbalance: boolean;
    comparisonPValue: number;
  };
  thresholds: {
    complete: boolean;
    harmBoundary: number | null;
    benefitBoundary: number | null;
  };
  integrity: Array<{
    label: string;
    status: "pass" | "warn" | "fail";
    detail: string;
  }>;
  decision: {
    label: DecisionLabel;
    tone: DecisionTone;
    reason: string;
    detail: string;
  };
  warnings: Warning[];
}

export class InputValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Please correct the highlighted inputs.");
    this.name = "InputValidationError";
    this.fieldErrors = fieldErrors;
  }
}

const Z_95 = 1.959963984540054;
const SRM_ALPHA = 0.01;
const OVERALL_ALPHA = 0.05;
const MATURITY_IMBALANCE_MINIMUM = 0.05;
const MATURITY_IMBALANCE_ALPHA = 0.01;
const PENDING_COMMUNICATION_SHARE = 0.25;
const JEFFREYS_A = 0.5;
const JEFFREYS_B = 0.5;

function twoSidedNormalPValue(zScore: number) {
  if (zScore === 0) return 1;
  const z = Math.abs(zScore) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  // Complementary-error-function approximation evaluated directly in the
  // tail. Avoiding 1 - CDF prevents genuine, extreme SRM p-values from
  // collapsing to zero through floating-point cancellation.
  const coefficients = [
    0.17087277, -0.82215223, 1.48851587, -1.13520398, 0.27886807, -0.18628806,
    0.09678418, 0.37409196, 1.00002368,
  ];
  let polynomial = coefficients[0];
  for (let index = 1; index < coefficients.length; index += 1) {
    polynomial = coefficients[index] + t * polynomial;
  }
  const pValue = t * Math.exp(-z * z - 1.26551223 + t * polynomial);
  return Math.max(0, Math.min(1, pValue));
}

// Lanczos log-gamma approximation; stable for the positive arguments used here.
export function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (value < 0.5) {
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value)
    );
  }
  const shifted = value - 1;
  let series = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) {
    series += coefficients[index] / (shifted + index + 1);
  }
  const t = shifted + coefficients.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(series)
  );
}

function logBeta(a: number, b: number) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logCombination(n: number, k: number) {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function logHypergeometric(
  groupOneSuccesses: number,
  groupOneSize: number,
  groupTwoSize: number,
  totalSuccesses: number,
) {
  return (
    logCombination(groupOneSize, groupOneSuccesses) +
    logCombination(groupTwoSize, totalSuccesses - groupOneSuccesses) -
    logCombination(groupOneSize + groupTwoSize, totalSuccesses)
  );
}

/**
 * Two-sided Fisher-Irwin exact p-value. Tables with probability no greater
 * than the observed table are summed, matching the SciPy/R two-sided rule.
 */
export function fisherExactTwoSided(
  controlSuccesses: number,
  controlTotal: number,
  treatmentSuccesses: number,
  treatmentTotal: number,
) {
  const totalSuccesses = controlSuccesses + treatmentSuccesses;
  const minimum = Math.max(0, totalSuccesses - treatmentTotal);
  const maximum = Math.min(controlTotal, totalSuccesses);
  const observedLogProbability = logHypergeometric(
    controlSuccesses,
    controlTotal,
    treatmentTotal,
    totalSuccesses,
  );
  const included: number[] = [];
  for (let value = minimum; value <= maximum; value += 1) {
    const logProbability = logHypergeometric(
      value,
      controlTotal,
      treatmentTotal,
      totalSuccesses,
    );
    if (logProbability <= observedLogProbability + 1e-10) {
      included.push(logProbability);
    }
  }
  if (included.length === 0) return 0;
  const maximumLog = Math.max(...included);
  const scaledSum = included.reduce(
    (sum, logProbability) => sum + Math.exp(logProbability - maximumLog),
    0,
  );
  return Math.min(1, Math.exp(maximumLog) * scaledSum);
}

function binomialTwoSidedPValue(
  successes: number,
  total: number,
  probability: number,
) {
  const observedLogProbability =
    logCombination(total, successes) +
    successes * Math.log(probability) +
    (total - successes) * Math.log1p(-probability);
  const included: number[] = [];
  for (let value = 0; value <= total; value += 1) {
    const logProbability =
      logCombination(total, value) +
      value * Math.log(probability) +
      (total - value) * Math.log1p(-probability);
    if (logProbability <= observedLogProbability + 1e-10)
      included.push(logProbability);
  }
  const maximumLog = Math.max(...included);
  return Math.min(
    1,
    Math.exp(maximumLog) *
      included.reduce(
        (sum, logProbability) => sum + Math.exp(logProbability - maximumLog),
        0,
      ),
  );
}

export function wilsonInterval(successes: number, total: number, z = Z_95) {
  if (total === 0) return { lower: 0, upper: 1 };
  const proportion = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (proportion + (z * z) / (2 * total)) / denominator;
  const halfWidth =
    (z / denominator) *
    Math.sqrt(
      (proportion * (1 - proportion)) / total + (z * z) / (4 * total * total),
    );
  return {
    lower: Math.max(0, centre - halfWidth),
    upper: Math.min(1, centre + halfWidth),
  };
}

/**
 * Newcombe (1998) hybrid-score interval, method 10, without continuity
 * correction, for treatment proportion minus control proportion.
 */
export function newcombeDifferenceInterval(
  controlSuccesses: number,
  controlTotal: number,
  treatmentSuccesses: number,
  treatmentTotal: number,
) {
  const controlRate = controlSuccesses / controlTotal;
  const treatmentRate = treatmentSuccesses / treatmentTotal;
  const difference = treatmentRate - controlRate;
  const controlWilson = wilsonInterval(controlSuccesses, controlTotal);
  const treatmentWilson = wilsonInterval(treatmentSuccesses, treatmentTotal);
  const lower =
    difference -
    Math.sqrt(
      (treatmentRate - treatmentWilson.lower) ** 2 +
        (controlWilson.upper - controlRate) ** 2,
    );
  const upper =
    difference +
    Math.sqrt(
      (treatmentWilson.upper - treatmentRate) ** 2 +
        (controlRate - controlWilson.lower) ** 2,
    );
  const boundedLower = Math.max(-1, lower);
  const boundedUpper = Math.min(1, upper);
  return {
    lower: boundedLower,
    upper: boundedUpper,
    width: boundedUpper - boundedLower,
  };
}

function twoProportionTest(
  controlSuccesses: number,
  controlTotal: number,
  treatmentSuccesses: number,
  treatmentTotal: number,
) {
  const pooled =
    (controlSuccesses + treatmentSuccesses) / (controlTotal + treatmentTotal);
  const expected = [
    controlTotal * pooled,
    controlTotal * (1 - pooled),
    treatmentTotal * pooled,
    treatmentTotal * (1 - pooled),
  ];
  const sparse = expected.some((count) => count < 5);
  if (sparse) {
    return {
      pValue: fisherExactTwoSided(
        controlSuccesses,
        controlTotal,
        treatmentSuccesses,
        treatmentTotal,
      ),
      method: "Fisher exact test" as const,
      sparse: true,
    };
  }
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / controlTotal + 1 / treatmentTotal),
  );
  return {
    pValue:
      standardError === 0
        ? 1
        : twoSidedNormalPValue(
            (treatmentSuccesses / treatmentTotal -
              controlSuccesses / controlTotal) /
              standardError,
          ),
    method: "Pooled two-proportion score test" as const,
    sparse: false,
  };
}

function betaBinomialLogEValue(
  candidate: number,
  successes: number,
  total: number,
  a = JEFFREYS_A,
  b = JEFFREYS_B,
) {
  const failures = total - successes;
  const mixtureLogLikelihood =
    logBeta(a + successes, b + failures) - logBeta(a, b);
  if (candidate === 0) {
    return successes === 0 ? mixtureLogLikelihood : Number.POSITIVE_INFINITY;
  }
  if (candidate === 1) {
    return failures === 0 ? mixtureLogLikelihood : Number.POSITIVE_INFINITY;
  }
  return (
    mixtureLogLikelihood -
    successes * Math.log(candidate) -
    failures * Math.log1p(-candidate)
  );
}

/**
 * Time-uniform Bernoulli confidence sequence obtained by inverting the
 * beta-binomial mixture e-process at level alpha.
 */
export function bernoulliAnytimeConfidenceSequence(
  successes: number,
  total: number,
  alpha: number,
) {
  if (total === 0) return { lower: 0, upper: 1 };
  const estimate = successes / total;
  const threshold = Math.log(1 / alpha);
  let lower = 0;
  let upper = 1;

  if (successes > 0) {
    let outside = 0;
    let inside = estimate;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const midpoint = (outside + inside) / 2;
      if (betaBinomialLogEValue(midpoint, successes, total) > threshold) {
        outside = midpoint;
      } else {
        inside = midpoint;
      }
    }
    lower = inside;
  }

  if (successes < total) {
    let inside = estimate;
    let outside = 1;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const midpoint = (inside + outside) / 2;
      if (betaBinomialLogEValue(midpoint, successes, total) > threshold) {
        outside = midpoint;
      } else {
        inside = midpoint;
      }
    }
    upper = inside;
  }

  return { lower, upper };
}

export function anytimeDifferenceInterval(
  controlSuccesses: number,
  controlTotal: number,
  treatmentSuccesses: number,
  treatmentTotal: number,
  alpha = OVERALL_ALPHA,
) {
  const perArmAlpha = alpha / 2;
  const control = bernoulliAnytimeConfidenceSequence(
    controlSuccesses,
    controlTotal,
    perArmAlpha,
  );
  const treatment = bernoulliAnytimeConfidenceSequence(
    treatmentSuccesses,
    treatmentTotal,
    perArmAlpha,
  );
  const lower = treatment.lower - control.upper;
  const upper = treatment.upper - control.lower;
  return { lower, upper, width: upper - lower, control, treatment };
}

function validateCount(
  errors: Record<string, string>,
  key: keyof ExperimentInput,
  value: number,
  label: string,
  allowZero: boolean,
) {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    errors[key] =
      label +
      (allowZero
        ? " must be a whole number of zero or more."
        : " must be a whole number above zero.");
  }
}

function validateInput(input: ExperimentInput) {
  const errors: Record<string, string> = {};
  validateCount(
    errors,
    "controlAssigned",
    input.controlAssigned,
    "Control assigned users",
    false,
  );
  validateCount(
    errors,
    "controlMature",
    input.controlMature,
    "Control mature users",
    true,
  );
  validateCount(
    errors,
    "controlConversions",
    input.controlConversions,
    "Control conversions",
    true,
  );
  validateCount(
    errors,
    "treatmentAssigned",
    input.treatmentAssigned,
    "Treatment assigned users",
    false,
  );
  validateCount(
    errors,
    "treatmentMature",
    input.treatmentMature,
    "Treatment mature users",
    true,
  );
  validateCount(
    errors,
    "treatmentConversions",
    input.treatmentConversions,
    "Treatment conversions",
    true,
  );

  if (input.controlMature > input.controlAssigned) {
    errors.controlMature = "Control mature users cannot exceed assigned users.";
  }
  if (input.treatmentMature > input.treatmentAssigned) {
    errors.treatmentMature =
      "Treatment mature users cannot exceed assigned users.";
  }
  if (input.controlConversions > input.controlMature) {
    errors.controlConversions =
      "Control conversions cannot exceed mature users.";
  }
  if (input.treatmentConversions > input.treatmentMature) {
    errors.treatmentConversions =
      "Treatment conversions cannot exceed mature users.";
  }
  if (
    !Number.isFinite(input.expectedTreatmentShare) ||
    input.expectedTreatmentShare <= 0 ||
    input.expectedTreatmentShare >= 1
  ) {
    errors.expectedTreatmentShare =
      "Expected allocation must give traffic to both variants.";
  }
  for (const [key, value, label] of [
    [
      "minimumWorthwhileGainPp",
      input.minimumWorthwhileGainPp,
      "Minimum worthwhile gain",
    ],
    [
      "maximumTolerableLossPp",
      input.maximumTolerableLossPp,
      "Maximum tolerable loss",
    ],
  ] as const) {
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      errors[key] = label + " must be a positive number of percentage points.";
    }
  }
  if (input.outcomeWindow === "custom" && !input.customOutcomeWindow?.trim()) {
    errors.customOutcomeWindow = "Describe the custom outcome window.";
  }

  if (Object.keys(errors).length > 0) throw new InputValidationError(errors);
}

function allocationCheck(
  controlAssigned: number,
  treatmentAssigned: number,
  expectedTreatmentShare: number,
) {
  const total = controlAssigned + treatmentAssigned;
  const expectedTreatment = total * expectedTreatmentShare;
  const expectedControl = total * (1 - expectedTreatmentShare);
  const useExact =
    total <= 5000 && Math.min(expectedTreatment, expectedControl) < 5;
  const pValue = useExact
    ? binomialTwoSidedPValue(treatmentAssigned, total, expectedTreatmentShare)
    : twoSidedNormalPValue(
        (treatmentAssigned - expectedTreatment) /
          Math.sqrt(
            total * expectedTreatmentShare * (1 - expectedTreatmentShare),
          ),
      );
  return {
    passed: pValue >= SRM_ALPHA,
    pValue,
    method: useExact
      ? ("Exact binomial allocation test" as const)
      : ("Normal allocation test" as const),
    observedControlShare: controlAssigned / total,
    observedTreatmentShare: treatmentAssigned / total,
    expectedTreatmentShare,
  };
}

function maturitySummary(input: ExperimentInput) {
  const totalAssigned = input.controlAssigned + input.treatmentAssigned;
  const totalMature = input.controlMature + input.treatmentMature;
  const controlRate = input.controlMature / input.controlAssigned;
  const treatmentRate = input.treatmentMature / input.treatmentAssigned;
  const comparison = twoProportionTest(
    input.controlMature,
    input.controlAssigned,
    input.treatmentMature,
    input.treatmentAssigned,
  );
  return {
    totalAssigned,
    totalMature,
    totalPending: totalAssigned - totalMature,
    overallRate: totalMature / totalAssigned,
    controlRate,
    treatmentRate,
    imbalance:
      Math.abs(treatmentRate - controlRate) >= MATURITY_IMBALANCE_MINIMUM &&
      comparison.pValue < MATURITY_IMBALANCE_ALPHA,
    comparisonPValue: comparison.pValue,
  };
}

function integritySummary(input: ExperimentInput, srmPassed: boolean) {
  const toStatus = (
    value: TriState,
    good: TriState,
  ): "pass" | "warn" | "fail" =>
    value === good ? "pass" : value === "unsure" ? "warn" : "fail";
  return [
    {
      label: "Primary metric chosen in advance",
      status: input.metricPreSpecified === "yes" ? "pass" : "warn",
      detail:
        input.metricPreSpecified === "yes"
          ? "Confirmatory interpretation is appropriate."
          : input.metricPreSpecified === "no"
            ? "This readout is exploratory because the metric was selected after seeing results."
            : "Confirm whether the metric was selected before results were reviewed.",
    },
    {
      label: "Random assignment",
      status: toStatus(input.randomAssignment, "yes"),
      detail:
        input.randomAssignment === "yes"
          ? "Assignment supports a causal comparison."
          : input.randomAssignment === "no"
            ? "A standard A/B causal comparison is not valid without random assignment."
            : "Random assignment has not been confirmed.",
    },
    {
      label: "Analysis unit matches randomisation",
      status: toStatus(input.analysisUnitMatches, "yes"),
      detail:
        input.analysisUnitMatches === "yes"
          ? "Counts use the same unit that was randomised."
          : input.analysisUnitMatches === "no"
            ? "The analysis and randomisation units do not match."
            : "Confirm that users, sessions or events match the randomisation unit.",
    },
    {
      label: "No cross-group interference indicated",
      status:
        input.interference === "no"
          ? "pass"
          : input.interference === "unsure"
            ? "warn"
            : "fail",
      detail:
        input.interference === "no"
          ? "Independent user-level analysis is plausible."
          : input.interference === "yes"
            ? "Treatment may change outcomes for control users."
            : "Shared capacity, inventory, pricing or network effects have not been ruled out.",
    },
    {
      label: "No sample ratio mismatch detected",
      status: srmPassed ? "pass" : "fail",
      detail: srmPassed
        ? "Assigned traffic is compatible with the expected allocation."
        : "Observed assignment is unlikely under the expected randomisation ratio.",
    },
  ] as AnalysisResult["integrity"];
}

function outcomeWindowLabel(input: ExperimentInput) {
  if (input.outcomeWindow === "custom")
    return input.customOutcomeWindow?.trim() || "custom";
  const labels: Record<Exclude<OutcomeWindow, "custom">, string> = {
    session: "same-session",
    "1-day": "1-day",
    "3-day": "3-day",
    "7-day": "7-day",
    "14-day": "14-day",
  };
  return labels[input.outcomeWindow];
}

function makeDecision(
  input: ExperimentInput,
  interval: Interval,
  absoluteEffect: number | null,
  maturity: AnalysisResult["maturity"],
  srmPassed: boolean,
): AnalysisResult["decision"] {
  const blockers = [
    input.randomAssignment === "no",
    input.analysisUnitMatches === "no",
    input.interference === "yes",
    !srmPassed,
  ];
  if (blockers.some(Boolean)) {
    return {
      label: "Investigate before deciding",
      tone: "investigate",
      reason:
        "A validity or data-integrity issue overrides the apparent treatment effect.",
      detail:
        "Resolve the failed integrity checks before using this readout for rollout or stopping decisions.",
    };
  }

  const missingThresholds = [
    input.minimumWorthwhileGainPp === null ? "minimum worthwhile gain" : null,
    input.maximumTolerableLossPp === null ? "maximum tolerable loss" : null,
  ].filter((value): value is string => value !== null);
  if (missingThresholds.length > 0) {
    return {
      label: "Decision incomplete",
      tone: "incomplete",
      reason:
        absoluteEffect === null
          ? "Mature observations and the commercial decision boundaries are not yet complete."
          : "The statistical readout is available, but the commercial decision boundaries are not fully defined.",
      detail: `Add the ${missingThresholds.join(
        " and ",
      )}. Both thresholds are required for Roll out, Keep running, Stop or No material effect recommendations.`,
    };
  }

  if (absoluteEffect === null) {
    return {
      label: "Keep running",
      tone: "running",
      reason: "There are not yet mature observations in both variants.",
      detail:
        "Wait for users to complete the outcome window; pending users are not extrapolated.",
    };
  }

  if (input.metricPreSpecified === "no") {
    return {
      label: "Keep running",
      tone: "running",
      reason:
        "This metric was selected after the results were seen, so the evidence is exploratory.",
      detail:
        "Use the pattern to form a hypothesis, then confirm it with a fresh pre-specified experiment before a strong rollout or stop decision.",
    };
  }

  const benefit = input.minimumWorthwhileGainPp! / 100;
  const harm = input.maximumTolerableLossPp! / 100;
  if (interval.lower > benefit) {
    return {
      label: "Roll out treatment",
      tone: "rollout",
      reason:
        "The remaining plausible effects are all above your minimum worthwhile gain.",
      detail:
        "Evidence supports rollout under the commercial thresholds you supplied. Continue to consider operational and guardrail context outside this binary metric.",
    };
  }
  if (interval.upper < -harm) {
    return {
      label: "Stop treatment",
      tone: "stop",
      reason:
        "The remaining plausible effects are all worse than your maximum tolerable loss.",
      detail:
        "The evidence supports stopping treatment under the commercial threshold you supplied.",
    };
  }
  if (interval.lower >= -harm && interval.upper <= benefit) {
    return {
      label: "Conclude no material effect",
      tone: "neutral",
      reason:
        "The plausible effect range sits entirely inside your commercial indifference region.",
      detail:
        "The remaining effects are commercially immaterial under your thresholds; this does not mean the true effect is exactly zero.",
    };
  }

  const pendingShare = maturity.totalPending / maturity.totalAssigned;
  const direction =
    absoluteEffect > 0
      ? "The treatment is promising, but uncertainty still crosses a decision boundary."
      : absoluteEffect < 0
        ? "The treatment is concerning, but uncertainty still crosses a decision boundary."
        : "The current interval still spans more than one commercial decision region.";
  return {
    label: "Keep running",
    tone: "running",
    reason: direction,
    detail:
      pendingShare >= PENDING_COMMUNICATION_SHARE
        ? "A substantial share of assigned users is still pending. Later mature cohorts can change the aggregate readout, and no pending conversions are extrapolated."
        : "More mature outcome data is needed to distinguish worthwhile gain, acceptable outcomes and unacceptable harm.",
  };
}

export function analyseExperiment(input: ExperimentInput): AnalysisResult {
  validateInput(input);

  const srm = allocationCheck(
    input.controlAssigned,
    input.treatmentAssigned,
    input.expectedTreatmentShare,
  );
  const maturity = maturitySummary(input);
  const hasMatureData = input.controlMature > 0 && input.treatmentMature > 0;
  const controlRate = hasMatureData
    ? input.controlConversions / input.controlMature
    : null;
  const treatmentRate = hasMatureData
    ? input.treatmentConversions / input.treatmentMature
    : null;
  const absoluteEffect =
    controlRate === null || treatmentRate === null
      ? null
      : treatmentRate - controlRate;
  const relativeUplift =
    absoluteEffect === null || controlRate === null || controlRate === 0
      ? null
      : absoluteEffect / controlRate;

  let interval: Interval;
  let pValue: number | null = null;
  let hypothesisMethod: AnalysisResult["hypothesisMethod"] = null;
  let sparseData = false;

  if (!hasMatureData) {
    interval = {
      lower: -1,
      upper: 1,
      width: 2,
      label: "Interval unavailable",
      method: "Insufficient mature data",
    };
  } else if (input.monitoringMode === "fixed") {
    const fixed = newcombeDifferenceInterval(
      input.controlConversions,
      input.controlMature,
      input.treatmentConversions,
      input.treatmentMature,
    );
    const test = twoProportionTest(
      input.controlConversions,
      input.controlMature,
      input.treatmentConversions,
      input.treatmentMature,
    );
    interval = {
      ...fixed,
      label: "95% fixed-horizon interval",
      method: "Newcombe hybrid-score",
    };
    pValue = test.pValue;
    hypothesisMethod = test.method;
    sparseData = test.sparse;
  } else {
    const sequential = anytimeDifferenceInterval(
      input.controlConversions,
      input.controlMature,
      input.treatmentConversions,
      input.treatmentMature,
    );
    interval = {
      lower: sequential.lower,
      upper: sequential.upper,
      width: sequential.width,
      label: "95% anytime-valid interval",
      method: "Beta-binomial mixture confidence sequence",
    };
    const fixedTest = twoProportionTest(
      input.controlConversions,
      input.controlMature,
      input.treatmentConversions,
      input.treatmentMature,
    );
    sparseData = fixedTest.sparse;
  }

  const evidenceType =
    input.metricPreSpecified === "yes"
      ? "confirmatory"
      : input.metricPreSpecified === "no"
        ? "exploratory"
        : "uncertain";
  const decision = makeDecision(
    input,
    interval,
    absoluteEffect,
    maturity,
    srm.passed,
  );
  const integrity = integritySummary(input, srm.passed);
  const thresholdsComplete =
    input.minimumWorthwhileGainPp !== null &&
    input.maximumTolerableLossPp !== null;

  const warnings: Warning[] = [];
  if (!srm.passed) {
    warnings.push({
      title: "Sample ratio mismatch detected",
      detail:
        "SRM indicates the observed assigned allocation is unlikely under the expected randomisation ratio. Investigate assignment, eligibility, logging, filtering and exposure before interpreting effects.",
      severity: "blocker",
    });
  }
  if (input.randomAssignment === "no") {
    warnings.push({
      title: "Assignment was not random",
      detail:
        "A standard A/B causal interpretation is not appropriate without random assignment.",
      severity: "blocker",
    });
  } else if (input.randomAssignment === "unsure") {
    warnings.push({
      title: "Random assignment is unconfirmed",
      detail:
        "Confirm how users entered each variant before treating the comparison as causal.",
      severity: "caution",
    });
  }
  if (input.analysisUnitMatches === "no") {
    warnings.push({
      title: "Analysis unit does not match randomisation",
      detail:
        "If users were randomised, counts should represent users rather than sessions or events. Rebuild the readout at the randomised unit.",
      severity: "blocker",
    });
  } else if (input.analysisUnitMatches === "unsure") {
    warnings.push({
      title: "Analysis unit needs confirmation",
      detail:
        "Check that the reported counts use the same unit that was randomised.",
      severity: "caution",
    });
  }
  if (input.interference === "yes") {
    warnings.push({
      title: "Cross-group interference is plausible",
      detail:
        "A standard independent user-level analysis may be inappropriate when treatment changes control outcomes. Cluster, geo or switchback designs may be more appropriate.",
      severity: "blocker",
    });
  } else if (input.interference === "unsure") {
    warnings.push({
      title: "Interference has not been ruled out",
      detail:
        "Consider shared marketplace capacity, pricing, inventory, network effects or competition between users.",
      severity: "caution",
    });
  }
  if (input.metricPreSpecified === "no") {
    warnings.push({
      title: "Exploratory evidence",
      detail:
        "The primary metric was selected after results were seen. Avoid a strong confirmatory rollout or stop claim until the pattern is tested in a fresh pre-specified experiment.",
      severity: "caution",
    });
  } else if (input.metricPreSpecified === "unsure") {
    warnings.push({
      title: "Metric pre-specification is unclear",
      detail:
        "Confirm whether this outcome was chosen before the results were reviewed.",
      severity: "note",
    });
  }
  if (maturity.imbalance) {
    warnings.push({
      title: "Maturity differs materially by variant",
      detail:
        "The mature shares differ by at least 5 percentage points and the allocation comparison has p < 0.01. Check enrolment timing, ramps, filtering and instrumentation; do not automatically attribute this to treatment.",
      severity: "caution",
    });
  }
  if (
    maturity.totalPending / maturity.totalAssigned >=
    PENDING_COMMUNICATION_SHARE
  ) {
    warnings.push({
      title: "A substantial share of outcomes is pending",
      detail:
        String(maturity.totalPending) +
        " assigned users have not completed the " +
        outcomeWindowLabel(input) +
        " outcome window and are excluded from the effect estimate.",
      severity: "note",
    });
  }
  if (input.outcomeWindow !== "session" && hasMatureData) {
    warnings.push({
      title: "Timing can matter",
      detail:
        "Treatment may change when users convert, not only whether they convert. An early advantage can disappear over a longer outcome window.",
      severity: "note",
    });
  }
  if (sparseData && hasMatureData) {
    warnings.push({
      title: "Sparse-data method used",
      detail:
        input.monitoringMode === "fixed"
          ? "At least one expected cell is small, so the p-value uses Fisher’s exact test rather than a large-sample approximation."
          : "The anytime-valid interval remains defined at boundary counts; interpret rare-event estimates cautiously.",
      severity: "note",
    });
  }
  if (!thresholdsComplete) {
    warnings.push({
      title: "Commercial thresholds are incomplete",
      detail:
        "The effect and uncertainty can still be read, but commercial decision readiness requires both a worthwhile gain and an unacceptable loss threshold.",
      severity: "note",
    });
  }

  return {
    experimentName: input.experimentName?.trim() ?? "",
    monitoringMode: input.monitoringMode,
    evidenceType,
    controlRate,
    treatmentRate,
    absoluteEffect,
    relativeUplift,
    interval,
    pValue,
    hypothesisMethod,
    sparseData,
    srm,
    maturity,
    thresholds: {
      complete: thresholdsComplete,
      harmBoundary:
        input.maximumTolerableLossPp === null
          ? null
          : -input.maximumTolerableLossPp / 100,
      benefitBoundary:
        input.minimumWorthwhileGainPp === null
          ? null
          : input.minimumWorthwhileGainPp / 100,
    },
    integrity,
    decision,
    warnings,
  };
}

export function formatPercent(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPValue(value: number) {
  if (value < 0.0001) return "< 0.0001";
  return value.toFixed(4);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}
