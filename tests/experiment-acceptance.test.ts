import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseExperiment,
  InputValidationError,
  type ExperimentInput,
} from "../src/components/experiment/statistics.ts";

const fixedBase: ExperimentInput = {
  experimentName: "QA reference",
  metricPreSpecified: "yes",
  randomAssignment: "yes",
  analysisUnitMatches: "yes",
  interference: "no",
  monitoringMode: "fixed",
  outcomeWindow: "session",
  controlAssigned: 10_000,
  controlMature: 10_000,
  controlConversions: 1_200,
  treatmentAssigned: 10_000,
  treatmentMature: 10_000,
  treatmentConversions: 1_320,
  expectedTreatmentShare: 0.5,
  minimumWorthwhileGainPp: 0.5,
  maximumTolerableLossPp: 0.25,
};

function analyse(overrides: Partial<ExperimentInput> = {}) {
  return analyseExperiment({ ...fixedBase, ...overrides });
}

function close(actual: number | null, expected: number, tolerance: number) {
  assert.notEqual(actual, null);
  assert.ok(
    Math.abs((actual as number) - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, received ${actual}`,
  );
}

// Fixed-horizon numerical anchors below were independently reproduced with
// SciPy 1.13.1 and statsmodels 0.14.6. Sequential anchors were independently
// computed in qa/reference_calculations.py.
void test("QA 01: quick positive reference matches trusted fixed-horizon values", () => {
  const result = analyse({
    minimumWorthwhileGainPp: null,
    maximumTolerableLossPp: null,
  });
  close(result.controlRate, 0.12, 1e-12);
  close(result.treatmentRate, 0.132, 1e-12);
  close(result.absoluteEffect, 0.012, 1e-12);
  close(result.relativeUplift, 0.1, 1e-12);
  close(result.pValue, 0.010558899038851658, 1e-8);
  close(result.interval.lower, 0.002801436595135303, 1e-12);
  close(result.interval.upper, 0.021200322131384612, 1e-12);
  assert.equal(result.srm.pValue, 1);
  assert.equal(result.decision.label, "Decision incomplete");
});

void test("QA 02: statistically and commercially positive result rolls out", () => {
  const result = analyse({
    controlAssigned: 20_000,
    controlMature: 20_000,
    controlConversions: 2_000,
    treatmentAssigned: 20_000,
    treatmentMature: 20_000,
    treatmentConversions: 2_200,
    minimumWorthwhileGainPp: 0.25,
  });
  close(result.pValue, 0.0011060019738741123, 1e-8);
  close(result.interval.lower, 0.00399202049110018, 1e-12);
  close(result.interval.upper, 0.01600977290825191, 1e-12);
  assert.equal(result.decision.label, "Roll out treatment");
  assert.match(result.decision.reason, /minimum worthwhile gain/i);
});

void test("QA 03: clearly harmful result stops treatment", () => {
  const result = analyse({
    controlAssigned: 20_000,
    controlMature: 20_000,
    controlConversions: 2_000,
    treatmentAssigned: 20_000,
    treatmentMature: 20_000,
    treatmentConversions: 1_800,
    minimumWorthwhileGainPp: 0.25,
  });
  close(result.pValue, 0.000648516267211183, 1e-8);
  close(result.interval.lower, -0.015748858136236745, 1e-12);
  close(result.interval.upper, -0.004253607679213568, 1e-12);
  assert.equal(result.decision.label, "Stop treatment");
});

void test("QA 04: statistical significance alone does not trigger rollout", () => {
  const result = analyse();
  assert.ok((result.pValue ?? 1) < 0.05);
  assert.ok(result.interval.lower < 0.005);
  assert.equal(result.decision.label, "Keep running");
});

void test("QA 05: precise commercial equivalence concludes no material effect", () => {
  const result = analyse({
    controlAssigned: 100_000,
    controlMature: 100_000,
    controlConversions: 10_000,
    treatmentAssigned: 100_000,
    treatmentMature: 100_000,
    treatmentConversions: 10_050,
    minimumWorthwhileGainPp: 0.5,
    maximumTolerableLossPp: 0.5,
  });
  close(result.pValue, 0.709695757843412, 1e-8);
  close(result.interval.lower, -0.0021326040204485168, 1e-12);
  close(result.interval.upper, 0.0031326249735824947, 1e-12);
  assert.equal(result.decision.label, "Conclude no material effect");
  assert.doesNotMatch(result.decision.detail, /there is no effect/i);
  assert.match(result.decision.detail, /commercially immaterial/i);
});

void test("QA 06: continuous maturity anchor uses mature denominators and assigned SRM", () => {
  const result = analyse({
    monitoringMode: "continuous",
    outcomeWindow: "7-day",
    controlAssigned: 10_000,
    controlMature: 7_200,
    controlConversions: 720,
    treatmentAssigned: 10_000,
    treatmentMature: 7_000,
    treatmentConversions: 770,
  });
  assert.deepEqual(
    [
      result.maturity.totalAssigned,
      result.maturity.totalMature,
      result.maturity.totalPending,
    ],
    [20_000, 14_200, 5_800],
  );
  close(result.maturity.overallRate, 0.71, 1e-12);
  close(result.maturity.controlRate, 0.72, 1e-12);
  close(result.maturity.treatmentRate, 0.7, 1e-12);
  close(result.controlRate, 0.1, 1e-12);
  close(result.treatmentRate, 0.11, 1e-12);
  close(result.interval.lower, -0.019722796763325987, 1e-10);
  close(result.interval.upper, 0.03972423928133027, 1e-10);
  assert.equal(result.srm.pValue, 1);
  assert.equal(result.pValue, null);
  assert.equal(result.decision.label, "Keep running");
});

void test("QA 07: continuous evidence can support rollout", () => {
  const result = analyse({
    monitoringMode: "continuous",
    controlAssigned: 500_000,
    controlMature: 500_000,
    controlConversions: 50_000,
    treatmentAssigned: 500_000,
    treatmentMature: 500_000,
    treatmentConversions: 55_000,
  });
  close(result.interval.lower, 0.006032321631682783, 1e-10);
  close(result.interval.upper, 0.013967119673940681, 1e-10);
  assert.equal(result.decision.label, "Roll out treatment");
});

void test("QA 08: continuous harmful evidence can support stopping", () => {
  const result = analyse({
    monitoringMode: "continuous",
    controlAssigned: 500_000,
    controlMature: 500_000,
    controlConversions: 50_000,
    treatmentAssigned: 500_000,
    treatmentMature: 500_000,
    treatmentConversions: 45_000,
    maximumTolerableLossPp: 0.5,
  });
  close(result.interval.lower, -0.013794236089802916, 1e-10);
  close(result.interval.upper, -0.006205205218399651, 1e-10);
  assert.equal(result.decision.label, "Stop treatment");
});

void test("QA 09: continuous equivalence supports no material effect wording", () => {
  const result = analyse({
    monitoringMode: "continuous",
    controlAssigned: 500_000,
    controlMature: 500_000,
    controlConversions: 50_000,
    treatmentAssigned: 500_000,
    treatmentMature: 500_000,
    treatmentConversions: 50_000,
    maximumTolerableLossPp: 0.5,
  });
  close(result.interval.lower, -0.0038839622597176687, 1e-10);
  close(result.interval.upper, 0.0038839622597176687, 1e-10);
  assert.equal(result.decision.label, "Conclude no material effect");
  assert.doesNotMatch(result.decision.detail, /there is no effect/i);
});

void test("QA 10: extreme SRM retains a finite tail p-value and overrides uplift", () => {
  const result = analyse({
    controlAssigned: 6_000,
    controlMature: 6_000,
    controlConversions: 600,
    treatmentAssigned: 4_000,
    treatmentMature: 4_000,
    treatmentConversions: 600,
  });
  close(result.srm.pValue, 5.507248237212379e-89, 1e-95);
  assert.equal(result.srm.passed, false);
  assert.equal(result.decision.label, "Investigate before deciding");
  const warning = result.warnings.find(
    (candidate) => candidate.title === "Sample ratio mismatch detected",
  );
  assert.match(
    warning?.detail ?? "",
    /assignment.*eligibility.*logging.*filtering.*exposure/i,
  );
});

void test("QA 11: SRM honours declared 70/30 allocation", () => {
  const expected = analyse({
    controlAssigned: 7_000,
    controlMature: 7_000,
    controlConversions: 700,
    treatmentAssigned: 3_000,
    treatmentMature: 3_000,
    treatmentConversions: 330,
    expectedTreatmentShare: 0.3,
  });
  assert.equal(expected.srm.passed, true);
  assert.equal(expected.srm.pValue, 1);
  const wrongExpectation = analyseExperiment({
    ...fixedBase,
    controlAssigned: 7_000,
    controlMature: 7_000,
    controlConversions: 700,
    treatmentAssigned: 3_000,
    treatmentMature: 3_000,
    treatmentConversions: 330,
  });
  assert.equal(wrongExpectation.srm.passed, false);
});

void test("QA 12: maturity imbalance does not contaminate conversion denominators", () => {
  const result = analyse({
    outcomeWindow: "7-day",
    controlMature: 9_000,
    controlConversions: 900,
    treatmentMature: 5_000,
    treatmentConversions: 550,
  });
  close(result.controlRate, 0.1, 1e-12);
  close(result.treatmentRate, 0.11, 1e-12);
  assert.deepEqual(
    [result.maturity.totalAssigned, result.maturity.totalMature],
    [20_000, 14_000],
  );
  close(result.maturity.overallRate, 0.7, 1e-12);
  close(result.maturity.controlRate, 0.9, 1e-12);
  close(result.maturity.treatmentRate, 0.5, 1e-12);
  assert.equal(result.maturity.imbalance, true);
  const warning = result.warnings.find(
    (candidate) => candidate.title === "Maturity differs materially by variant",
  );
  assert.match(
    warning?.detail ?? "",
    /do not automatically attribute this to treatment/i,
  );
});

void test("QA 13: sparse data uses Fisher exact without non-finite values", () => {
  const result = analyse({
    controlAssigned: 20,
    controlMature: 20,
    controlConversions: 0,
    treatmentAssigned: 20,
    treatmentMature: 20,
    treatmentConversions: 3,
  });
  assert.equal(result.hypothesisMethod, "Fisher exact test");
  close(result.pValue, 0.2307692307692308, 1e-12);
  close(result.interval.lower, -0.0383963331262675, 1e-12);
  close(result.interval.upper, 0.36041886474075696, 1e-12);
  for (const value of [
    result.controlRate,
    result.treatmentRate,
    result.absoluteEffect,
    result.interval.lower,
    result.interval.upper,
  ]) {
    assert.ok(value !== null && Number.isFinite(value));
  }
});

void test("QA 14: invalid counts produce explicit field errors", () => {
  const invalidInputs: Array<
    [Partial<ExperimentInput>, keyof ExperimentInput]
  > = [
    [{ controlConversions: 10_001 }, "controlConversions"],
    [{ controlAssigned: 100, controlMature: 101 }, "controlMature"],
    [{ treatmentConversions: -1 }, "treatmentConversions"],
    [{ controlAssigned: 10.5 }, "controlAssigned"],
    [{ treatmentMature: 10.5 }, "treatmentMature"],
    [
      { controlAssigned: 0, controlMature: 0, controlConversions: 0 },
      "controlAssigned",
    ],
  ];
  for (const [overrides, field] of invalidInputs) {
    assert.throws(
      () => analyse(overrides),
      (error: unknown) =>
        error instanceof InputValidationError &&
        Boolean(error.fieldErrors[field]),
    );
  }
});

void test("QA 15: each missing commercial threshold yields an incomplete decision", () => {
  for (const overrides of [
    { minimumWorthwhileGainPp: null, maximumTolerableLossPp: null },
    { minimumWorthwhileGainPp: null },
    { maximumTolerableLossPp: null },
  ] satisfies Array<Partial<ExperimentInput>>) {
    const result = analyse(overrides);
    assert.equal(result.decision.label, "Decision incomplete");
    assert.equal(result.decision.tone, "incomplete");
    assert.match(result.decision.detail, /both thresholds are required/i);
    assert.notEqual(result.absoluteEffect, null);
  }
});

void test("QA 16: random-assignment failure overrides a rollout result", () => {
  assert.equal(
    analyse({ randomAssignment: "no", minimumWorthwhileGainPp: 0.25 }).decision
      .label,
    "Investigate before deciding",
  );
});

void test("QA 17: analysis-unit mismatch overrides a rollout result", () => {
  assert.equal(
    analyse({ analysisUnitMatches: "no", minimumWorthwhileGainPp: 0.25 })
      .decision.label,
    "Investigate before deciding",
  );
});

void test("QA 18: interference override explains limits and alternative designs", () => {
  const result = analyse({
    interference: "yes",
    minimumWorthwhileGainPp: 0.25,
  });
  assert.equal(result.decision.label, "Investigate before deciding");
  const warning = result.warnings.find(
    (candidate) => candidate.title === "Cross-group interference is plausible",
  );
  assert.match(warning?.detail ?? "", /independent user-level analysis/i);
  assert.match(warning?.detail ?? "", /cluster, geo or switchback/i);
});

void test("QA 19: post-hoc metric is visibly exploratory without rollout claim", () => {
  const result = analyse({
    metricPreSpecified: "no",
    minimumWorthwhileGainPp: 0.25,
  });
  assert.equal(result.evidenceType, "exploratory");
  assert.notEqual(result.decision.label, "Roll out treatment");
  assert.notEqual(result.decision.label, "Stop treatment");
  assert.match(result.decision.reason, /exploratory/i);
});

void test("QA 20: every unsure answer is a visible non-pass integrity state", () => {
  const scenarios: Array<[keyof ExperimentInput, string]> = [
    ["metricPreSpecified", "Primary metric chosen in advance"],
    ["randomAssignment", "Random assignment"],
    ["analysisUnitMatches", "Analysis unit matches randomisation"],
    ["interference", "No cross-group interference indicated"],
  ];
  for (const [field, label] of scenarios) {
    const result = analyse({ [field]: "unsure" });
    const item = result.integrity.find(
      (candidate) => candidate.label === label,
    );
    assert.equal(item?.status, "warn");
    assert.ok(result.warnings.length > 0);
  }
});

void test("QA 21: continuous monitoring labels evidence anytime-valid and omits p-value", () => {
  const result = analyse({ monitoringMode: "continuous" });
  assert.equal(result.interval.label, "95% anytime-valid interval");
  assert.equal(result.pValue, null);
  assert.equal(result.hypothesisMethod, null);
});

void test("QA 22: zero control rate never creates an infinite relative uplift", () => {
  const result = analyse({
    controlAssigned: 100,
    controlMature: 100,
    controlConversions: 0,
    treatmentAssigned: 100,
    treatmentMature: 100,
    treatmentConversions: 1,
  });
  assert.equal(result.relativeUplift, null);
  assert.ok(Number.isFinite(result.interval.lower));
  assert.ok(Number.isFinite(result.interval.upper));
});
