import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseExperiment,
  anytimeDifferenceInterval,
  bernoulliAnytimeConfidenceSequence,
  fisherExactTwoSided,
  InputValidationError,
  newcombeDifferenceInterval,
  type ExperimentInput,
} from "../src/components/experiment/statistics.ts";

const base: ExperimentInput = {
  experimentName: "Reference experiment",
  metricPreSpecified: "yes",
  randomAssignment: "yes",
  analysisUnitMatches: "yes",
  interference: "no",
  monitoringMode: "fixed",
  outcomeWindow: "session",
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

void test("1. clear fixed-horizon benefit supports rollout", () => {
  const result = analyseExperiment(base);
  assert.equal(result.decision.label, "Roll out treatment");
  assert.ok(result.interval.lower > 0.005);
});

void test("2. clear harmful effect supports stopping treatment", () => {
  const result = analyseExperiment({
    ...base,
    controlConversions: 12000,
    treatmentConversions: 10000,
  });
  assert.equal(result.decision.label, "Stop treatment");
  assert.ok(result.interval.upper < -0.0025);
});

void test("3. interval spanning decision regions keeps running", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 1000,
    controlMature: 1000,
    controlConversions: 100,
    treatmentAssigned: 1000,
    treatmentMature: 1000,
    treatmentConversions: 105,
  });
  assert.equal(result.decision.label, "Keep running");
  assert.ok(result.interval.lower < -0.0025);
  assert.ok(result.interval.upper > 0.005);
});

void test("4. precise interval inside indifference region concludes no material effect", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 1000000,
    controlMature: 1000000,
    controlConversions: 100000,
    treatmentAssigned: 1000000,
    treatmentMature: 1000000,
    treatmentConversions: 100100,
    minimumWorthwhileGainPp: 0.5,
    maximumTolerableLossPp: 0.5,
  });
  assert.equal(result.decision.label, "Conclude no material effect");
  assert.ok(result.interval.lower >= -0.005 && result.interval.upper <= 0.005);
});

void test("5. obvious SRM failure overrides attractive uplift", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 90000,
    controlMature: 90000,
    controlConversions: 9000,
    treatmentAssigned: 10000,
    treatmentMature: 10000,
    treatmentConversions: 1400,
  });
  assert.equal(result.srm.passed, false);
  assert.equal(result.decision.label, "Investigate before deciding");
});

void test("6. non-random assignment blocks a decision", () => {
  const result = analyseExperiment({ ...base, randomAssignment: "no" });
  assert.equal(result.decision.label, "Investigate before deciding");
});

void test("7. analysis-unit mismatch blocks a decision", () => {
  const result = analyseExperiment({ ...base, analysisUnitMatches: "no" });
  assert.equal(result.decision.label, "Investigate before deciding");
});

void test("8. cross-group interference blocks a decision", () => {
  const result = analyseExperiment({ ...base, interference: "yes" });
  assert.equal(result.decision.label, "Investigate before deciding");
});

void test("9. post-hoc primary metric is exploratory without strong recommendation", () => {
  const result = analyseExperiment({ ...base, metricPreSpecified: "no" });
  assert.equal(result.evidenceType, "exploratory");
  assert.equal(result.decision.label, "Keep running");
  assert.ok(
    result.warnings.some((warning) => warning.title === "Exploratory evidence"),
  );
});

void test("10. mature denominators drive rates while assigned counts drive SRM", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 10000,
    controlMature: 5000,
    controlConversions: 500,
    treatmentAssigned: 10000,
    treatmentMature: 4000,
    treatmentConversions: 480,
  });
  assert.equal(result.controlRate, 0.1);
  assert.equal(result.treatmentRate, 0.12);
  assert.equal(result.srm.observedTreatmentShare, 0.5);
  assert.equal(result.maturity.totalPending, 11000);
});

void test("11. conversions above mature users fail validation", () => {
  assert.throws(
    () =>
      analyseExperiment({ ...base, controlMature: 20, controlConversions: 21 }),
    (error: unknown) =>
      error instanceof InputValidationError &&
      Boolean(error.fieldErrors.controlConversions),
  );
});

void test("12. mature users above assigned users fail validation", () => {
  assert.throws(
    () =>
      analyseExperiment({
        ...base,
        treatmentAssigned: 20,
        treatmentMature: 21,
        treatmentConversions: 1,
      }),
    (error: unknown) =>
      error instanceof InputValidationError &&
      Boolean(error.fieldErrors.treatmentMature),
  );
});

void test("13. equal conversion rates produce zero effect and p = 1", () => {
  const result = analyseExperiment({
    ...base,
    controlConversions: 10000,
    treatmentConversions: 10000,
  });
  assert.equal(result.absoluteEffect, 0);
  assert.equal(result.relativeUplift, 0);
  assert.equal(result.pValue, 1);
});

void test("14. zero conversions are handled at the parameter boundary", () => {
  const fixed = analyseExperiment({
    ...base,
    controlAssigned: 50,
    controlMature: 50,
    controlConversions: 0,
    treatmentAssigned: 50,
    treatmentMature: 50,
    treatmentConversions: 0,
  });
  assert.equal(fixed.absoluteEffect, 0);
  assert.equal(fixed.pValue, 1);
  const sequential = analyseExperiment({
    ...base,
    monitoringMode: "continuous",
    controlAssigned: 50,
    controlMature: 50,
    controlConversions: 0,
    treatmentAssigned: 50,
    treatmentMature: 50,
    treatmentConversions: 1,
  });
  assert.ok(Number.isFinite(sequential.interval.lower));
  assert.ok(Number.isFinite(sequential.interval.upper));
});

void test("15. sparse table selects Fisher exact test", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 8,
    controlMature: 8,
    controlConversions: 6,
    treatmentAssigned: 5,
    treatmentMature: 5,
    treatmentConversions: 1,
  });
  assert.equal(result.hypothesisMethod, "Fisher exact test");
  assert.ok(Math.abs((result.pValue ?? 0) - 0.10256410256410257) < 1e-12);
});

void test("16. fixed-horizon methods match published reference calculations", () => {
  // SciPy fisher_exact([[6, 2], [1, 4]]).pvalue = 0.10256410256410257.
  assert.ok(
    Math.abs(fisherExactTwoSided(6, 8, 1, 5) - 0.10256410256410257) < 1e-12,
  );
  // Newcombe method 10 / Wilson hybrid for 10% vs 12%, n=1,000 each.
  const interval = newcombeDifferenceInterval(100, 1000, 120, 1000);
  assert.ok(Math.abs(interval.lower - -0.007492167515211052) < 1e-12);
  assert.ok(Math.abs(interval.upper - 0.047550667456339055) < 1e-12);
});

void test("17. anytime-valid arm sequence matches an analytic beta-binomial case", () => {
  // For s=f=1 and Jeffreys mix, e(p) = 1 / (8p(1-p)). At alpha .025,
  // the boundary solves p(1-p)=1/320 exactly.
  const expectedLower = (1 - Math.sqrt(1 - 1 / 80)) / 2;
  const expectedUpper = 1 - expectedLower;
  const interval = bernoulliAnytimeConfidenceSequence(1, 2, 0.025);
  assert.ok(Math.abs(interval.lower - expectedLower) < 1e-12);
  assert.ok(Math.abs(interval.upper - expectedUpper) < 1e-12);
});

void test("18. sequential interval narrows with compatible accumulating evidence", () => {
  const early = anytimeDifferenceInterval(10, 100, 12, 100);
  const later = anytimeDifferenceInterval(1000, 10000, 1200, 10000);
  assert.ok(later.width < early.width);
});

void test("19. continuous monitoring never exposes a fixed-horizon p-value", () => {
  const result = analyseExperiment({ ...base, monitoringMode: "continuous" });
  assert.equal(result.interval.label, "95% anytime-valid interval");
  assert.equal(result.pValue, null);
  assert.equal(result.hypothesisMethod, null);
});

void test("20. balanced 50/50 assignment passes SRM", () => {
  const result = analyseExperiment(base);
  assert.equal(result.srm.passed, true);
  assert.equal(result.srm.pValue, 1);
});

void test("21. healthy non-50/50 expected assignment is recognised", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 60000,
    controlMature: 60000,
    controlConversions: 6000,
    treatmentAssigned: 40000,
    treatmentMature: 40000,
    treatmentConversions: 4800,
    expectedTreatmentShare: 0.4,
  });
  assert.equal(result.srm.passed, true);
  assert.equal(result.srm.observedTreatmentShare, 0.4);
});

void test("22. materially different maturity proportions trigger a diagnostic", () => {
  const result = analyseExperiment({
    ...base,
    controlAssigned: 10000,
    controlMature: 9000,
    controlConversions: 900,
    treatmentAssigned: 10000,
    treatmentMature: 7000,
    treatmentConversions: 840,
  });
  assert.equal(result.maturity.imbalance, true);
  assert.ok(
    result.warnings.some(
      (warning) => warning.title === "Maturity differs materially by variant",
    ),
  );
});
