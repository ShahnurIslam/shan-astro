# Experiment Decision Checker — QA Matrix

Current site scope (2026-11-18): `/tools/experiment-decision-checker/` contains Quick Readout only. The Decision Suite component and its multi-metric interface have been removed. The matrix below records earlier QA work and should not be read as a description of the current tool. The current test run has 58 passing tests, and the production build succeeds.

Date: 2026-09-03
Verdict: **READY FOR SITE INTEGRATION**

Reference implementation: fixed-horizon values were reproduced independently with SciPy 1.13.1 and statsmodels 0.14.6. Sequential values were reproduced by a separate Jeffreys Beta(0.5, 0.5) beta-binomial mixture e-process and bisection in `tests/reference_calculations.py`; it does not import application code. Tolerances: rates/effects/intervals `1e-10` proportion unless exact, ordinary p-values `1e-8` absolute, extreme SRM p-value `2e-7` relative.

## Statistical and decision anchors

| Test                           | Status | Actual                                                                                                                                                             | Expected                                                                                                                                        |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Quick positive reference    | PASS   | 12.00% / 13.20%; +1.20 pp; +10.00%; p=0.0105588985; CI [+0.2801437, +2.1200322] pp; SRM p=1                                                                        | Supplied reference values; statistical signal only; suite decision incomplete without thresholds                                                |
| 2. Commercially ready positive | PASS   | p=0.0011060020; CI [+0.3992020, +1.6009773] pp; **Primary metric supports rollout**                                                                                | Reference CI/p; entire interval above +0.25 pp; guardrails explicitly not evaluated                                                             |
| 3. Clear harm                  | PASS   | p=0.0006485163; CI [-1.5748858, -0.4253608] pp; **Stop treatment**                                                                                                 | Reference CI/p; interval below -0.25 pp                                                                                                         |
| 4. Significant but not ready   | PASS   | p=0.0105588985; CI [+0.2801437, +2.1200322] pp; **Evidence unresolved**                                                                                            | p<.05 must not bypass +0.50 pp boundary; no claim that more traffic is worthwhile                                                               |
| 5. Commercial equivalence      | PASS   | p=0.7096957535; CI [-0.2132604, +0.3132625] pp; **Conclude no material effect**                                                                                    | Entire interval inside ±0.50 pp; copy says commercially immaterial, not “no effect”                                                             |
| 6. Maturity/sequential anchor  | PASS   | assigned 20,000; mature 14,200; pending 5,800; 71.0%; arm maturity 72.0%/70.0%; rates 10%/11%; CI [-1.9722797, +3.9724239] pp; no p-value; **Evidence unresolved** | Supplied anytime-valid anchor; SRM uses assigned counts and passes; waiting applies to assigned outcomes, not necessarily more traffic          |
| 7. Sequential rollout          | PASS   | CI [+0.6032322, +1.3967120] pp; **Primary metric supports rollout**                                                                                                | Supplied anytime-valid anchor; guardrails explicitly not evaluated                                                                              |
| 8. Sequential stop             | PASS   | CI [-1.3794236, -0.6205205] pp; **Stop treatment**                                                                                                                 | Supplied anytime-valid anchor                                                                                                                   |
| 9. Sequential equivalence      | PASS   | CI [-0.3883962, +0.3883962] pp; **Conclude no material effect**                                                                                                    | Supplied anytime-valid anchor; no equality claim                                                                                                |
| 10. SRM override               | PASS   | z²=400 independently; SRM p=5.5072482e-89; attractive +5.00 pp result overridden by **Investigate before deciding**                                                | Reference statistic/p; investigative, non-causal copy                                                                                           |
| 11. Non-50/50 allocation       | PASS   | Declared 70/30 gives SRM p=1/pass; same 7,000/3,000 under 50/50 fails                                                                                              | Allocation must not be hard-coded                                                                                                               |
| 12. Mature denominators        | PASS   | rates 10%/11%; total maturity 70%; arms 90%/50%; **Investigate before deciding**                                                                                   | Mature denominators and assigned totals remain distinct; the existing 5pp / p<.01 diagnostic conservatively blocks rollout and stop conclusions |
| 13. Sparse data                | PASS   | Fisher p=0.2307692308; Newcombe CI [-3.8396333, +36.0418865] pp; finite display/graphic                                                                            | Exact fallback and supplied interval; no significance claim                                                                                     |
| 14. Invalid counts             | PASS   | Explicit field errors for conversions>mature, mature>assigned, negative, fractional, and assigned=0; stale old output is de-emphasised                             | Reject invalid counts; no NaN/Infinity/current-looking stale result                                                                             |

## Integrity, incomplete and stale states

| Test                                                                 | Status | Actual                                                                                                                         | Expected                                                                                                 |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Random assignment = No                                               | PASS   | Investigate before deciding                                                                                                    | Hard override                                                                                            |
| Analysis unit mismatch = No                                          | PASS   | Investigate before deciding                                                                                                    | Hard override                                                                                            |
| Interference = Yes                                                   | PASS   | Investigate; warning names limits of independent user analysis and cluster/geo/switchback designs                              | Hard override without implementing other methods                                                         |
| Metric selected after viewing                                        | PASS   | Exploratory evidence; no Roll out/Stop claim                                                                                   | Exploratory only                                                                                         |
| Metric = Unsure                                                      | PASS   | `warn` integrity state; pre-specification uncertainty explained                                                                | Must not render passed                                                                                   |
| Random assignment = Unsure                                           | PASS   | `warn` integrity state; assignment unconfirmed warning                                                                         | Must differ visibly from Yes                                                                             |
| Analysis unit = Unsure                                               | PASS   | `warn` integrity state; unit confirmation requested                                                                            | Must differ visibly from Yes                                                                             |
| Interference = Unsure                                                | PASS   | `warn` integrity state; shared-effects uncertainty explained                                                                   | Must not render passed                                                                                   |
| Missing both thresholds                                              | PASS   | **Decision incomplete**; statistical output remains visible; copy names both missing boundaries                                | No action recommendation                                                                                 |
| Missing either single threshold                                      | PASS   | **Decision incomplete**; copy names the missing boundary                                                                       | No action recommendation                                                                                 |
| Fundamental integrity answer = Unsure                                | PASS   | **Decision incomplete**; statistical readout remains visible                                                                   | Unknown randomisation, analysis unit, interference or metric status cannot produce an unqualified action |
| Clearly harmful post-hoc metric                                      | PASS   | **Investigate possible harm**; evidence remains exploratory                                                                    | Possible harm is prominent without being described as confirmatory proof                                 |
| Retrospective threshold                                              | PASS   | Analysis continues with qualified labels and warning                                                                           | Statistical evidence remains separate from retrospective commercial judgement                            |
| Threshold timing unsure                                              | PASS   | Analysis continues provisionally with warning                                                                                  | Does not silently receive the confidence of a pre-specified boundary                                     |
| Missing programmatic integrity fields                                | PASS   | Fields remain `unsure`; decision incomplete                                                                                    | Browser-agent calls cannot inherit optimistic UI example values                                          |
| Stale conversion, mature, assigned, mode, threshold, integrity edits | PASS   | Every edit immediately shows “Inputs changed — Recalculate” and de-emphasises the old result; recalculation clears stale state | Old decision must not remain authoritative                                                               |

## Quick Readout and UI acceptance

| Test                           | Status | Actual                                                                                                                                  | Expected                                     |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Quick Readout scope            | PASS   | Explicit fixed-horizon label; correct rates/effect/CI/p/SRM; no maturity, peeking or commercial decision; CTA to suite                  | Narrow statistical readout only              |
| Try example                    | PASS   | Coherent complete suite example produces Primary metric supports rollout with a guardrail limitation                                    | Complete example                             |
| Reset                          | PASS   | Restores every count, monitoring/integrity selection, blank thresholds, result and non-stale state                                      | Full reset                                   |
| Monitoring switch              | PASS   | Continuous shows “95% anytime-valid interval” and “p-value: Not reported”; fixed shows “95% fixed-horizon interval” and p-value         | Correct presentation by mode                 |
| Labels and control names       | PASS   | Browser accessibility tree names all inputs/selects; grouped Yes/No/Unsure controls have legends                                        | Associated labels                            |
| Keyboard navigation/focus      | PASS   | Native tab order reaches links, inputs, selects, mode/integrity buttons, submit and details; focused controls have a solid 3 px outline | Sensible order and visible focus             |
| Warning communication          | PASS   | Icons plus explicit SRM/integrity/warning text and statuses                                                                             | Must not rely on colour alone                |
| Large values / negative / zero | PASS   | 1,000,000,000-user case stays finite and contained; negative and zero estimates render signed/zero values correctly                     | No layout or numeric breakage                |
| Browser errors                 | PASS   | No browser error surfaced during route navigation and state exercise; both routes return HTTP 200                                       | No runtime errors/warnings affecting the app |

## Responsive browser matrix

Both routes were rendered in same-origin fixed-width browser frames so CSS media queries used the recorded CSS-pixel width. Control bounds and document scroll widths were measured in the rendered frame.

| Viewport        | Quick Readout                                                | Decision Suite                                               | Result |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------ |
| 1645 px desktop | scroll 1630 ≤ viewport; 0 clipped controls                   | scroll 1630 ≤ viewport; 0 clipped controls; range contained  | PASS   |
| 1024 px         | scroll=1024; 0 clipped controls                              | scroll=1024; 0 clipped controls                              | PASS   |
| 768 px tablet   | scroll=768; 0 clipped controls                               | scroll=768; 0 clipped controls                               | PASS   |
| 375 px mobile   | scroll=375; 0 clipped controls; readable stacked form/result | scroll=375; 0 clipped controls; readable stacked form/result | PASS   |

## Decision-range graphic

| Scenario                 | Status | Actual visual/numeric check                                                                                                                                       |
| ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fully worthwhile         | PASS   | Case 2: [+0.40, +1.60] pp wholly beyond +0.25 pp                                                                                                                  |
| Fully harmful            | PASS   | Case 3: [-1.57, -0.43] pp wholly beyond -0.25 pp                                                                                                                  |
| Fully indifferent        | PASS   | Case 5: [-0.21, +0.31] pp inside ±0.50 pp                                                                                                                         |
| Spans all regions        | PASS   | Case 6: [-1.97, +3.97] pp crosses harm, zero and gain                                                                                                             |
| Exactly crosses boundary | PASS   | Benefit marker and interval endpoint both at 29.0671%; measured delta 0 px                                                                                        |
| Very wide                | PASS   | Sparse case: [-3.84, +36.04] pp contained and readable                                                                                                            |
| Tiny                     | PASS   | Billion-user case interval remains on true linear scale; 2.57 px of 703.80 px plot, with visible point marker                                                     |
| Negative estimate        | PASS   | Case 3 point at -1.00 pp and interval geometry agree                                                                                                              |
| Zero estimate            | PASS   | Case 9 point at 0.00 pp and centred on zero marker                                                                                                                |
| Required markers         | PASS   | Harm boundary, zero, worthwhile boundary, point estimate and interval are always present when thresholds/results exist; linear positions agree with numeric scale |

## Privacy and engineering

| Test                   | Status | Actual                                                                                                                                                                       | Expected                                                                                     |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Local processing       | PASS   | Source audit found no `fetch`, XHR, beacon, analytics SDK, external URL or experiment-value transmission; calculations run synchronously in `statistics.ts`                  | Counts/results remain local                                                                  |
| Deterministic tests    | PASS   | 93 passed, 0 failed                                                                                                                                                          | Existing Pass 1 anchors and safety regressions plus Pass 2 multi-metric adversarial coverage |
| Independent references | PASS   | Disposable SciPy/statsmodels run and separate mixture inversion match all anchors                                                                                            | Do not self-validate                                                                         |
| TypeScript             | PASS   | `npx tsc --noEmit`                                                                                                                                                           | Clean                                                                                        |
| Production build       | PASS   | `npm run build`; routes `/` and `/decision-suite` generated                                                                                                                  | Clean build                                                                                  |
| Formatting             | PASS   | `oxfmt --check` on changed application/test/config files; Python compiles                                                                                                    | Clean                                                                                        |
| Whitespace             | PASS   | No trailing whitespace in changed files                                                                                                                                      | Clean alternative to `git diff --check`                                                      |
| Route/source lint      | PASS   | `oxlint` on application routes, engine, tests and used source files                                                                                                          | No scoped errors                                                                             |
| Full scaffold lint     | FAIL   | `npm run lint` reports 19 pre-existing rules in unused generated `components/ui/*` inventory and `hooks/use-mobile.ts`; no finding is in the checker routes or changed files | Repository-wide lint is not clean; not a checker release blocker                             |
| Git diff check         | PASS   | Workspace has no Git metadata; recorded explicitly and used targeted formatting/trailing-whitespace/source review instead                                                    | Appropriate non-Git alternative                                                              |

## Defects fixed

1. Missing commercial thresholds incorrectly produced **Keep running**; now produces **Decision incomplete** with the missing boundary named.
2. Edited inputs could leave an old decision looking current; both routes now mark and visually de-authorise stale output until recalculated.
3. Extreme normal-tail SRM p-values could underflow to zero through `1 - CDF`; direct complementary-tail evaluation now retains the expected finite value.
4. The range bar imposed a 1% minimum width and could distort tiny intervals; it now uses the exact linear width while retaining the point marker.
5. Keyboard focus could be too subtle; checker controls now have an explicit solid focus outline.

## Paid-beta foundation safety pass

1. Unknown fundamental integrity answers now prevent unqualified rollout and stop conclusions.
2. The existing maturity-imbalance diagnostic (at least 5 percentage points and p < 0.01) is documented as a conservative screening rule and blocks confident action until investigated.
3. A clearly negative post-hoc metric now surfaces **Investigate possible harm** rather than hiding the signal behind a continuation recommendation.
4. Generic **Keep running** outputs were replaced by **Evidence unresolved**; the tool distinguishes awaiting already-assigned outcomes from deciding whether to collect more traffic.
5. Positive output is scoped to **Primary metric supports rollout** and states that guardrails were not evaluated.
6. Threshold timing is captured explicitly. Retrospective or unknown timing qualifies the commercial interpretation without blocking the statistical analysis.
7. Browser-agent calls use safe unknown integrity defaults and require an expected allocation instead of silently assuming 50/50.

Release blockers remaining: **none**. No deployment or push was performed.

## Pass 2 — primary metric and guardrails

Pass 2 adds exactly one primary metric and zero to two guardrails without a
weighted or composite score. Binary metrics retain the Pass 1 fixed-horizon and
anytime-valid inference. Fixed-horizon continuous metrics use Welch's
difference-of-means interval from per-randomisation-unit sample size, mean and
sample standard deviation. Continuous metrics under continuous monitoring,
ratio/conditional metrics and known severely skewed or outlier-dominated
outcomes cannot produce an unqualified commercial conclusion.

All entered decision metrics share a 5% family error budget through a
Bonferroni adjustment. One, two and three metrics therefore use two-sided 95%,
97.5% and approximately 98.33% intervals respectively. The UI states that
adding a guardrail widens the other decision intervals.

Guardrails are within tolerance only when the interval rules out deterioration
beyond the supplied boundary. A comparison that is not statistically
significant against zero is not automatically safe. The overall policy does
not decide which metric wins: it reports worthwhile primary evidence, breached
guardrails, unresolved guardrail risk and interpretation/integrity blockers in
a deterministic precedence order.

The Pass 2 regression suite includes an independently published NIST
Welch-Satterthwaite example, Student-t reference quantiles, multiplicity checks
for one through three metrics, direction symmetry, conflicting-metric cases,
retrospective and post-hoc qualifications, denominator rejection, severe-skew
handling, unsupported continuous monitoring, programmatic unknown defaults,
SRM and metric-level maturity blockers. The original 57 Pass 1 tests remain in
the suite.

## Production integration addendum

Integrated on 2026-09-03 at `/tools/experiment-decision-checker/`. The production route imports `src/components/experiment/statistics.ts`, which is also imported by both migrated test suites. The original integration checks recorded 44/44 deterministic tests; the paid-beta foundation safety pass expands this to 57 tests while preserving the independent numerical anchors. Experiment values remain browser-local. Repository-wide `astro check` continues to report 19 pre-existing errors in untouched legacy/draft files; no diagnostic names an integration file.
