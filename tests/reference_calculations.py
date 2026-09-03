"""Independent numerical references for the Experiment Decision Checker QA.

Run in a disposable environment containing SciPy and statsmodels. This script
does not import or call application code.
"""

from math import log

from scipy.special import betaln
from scipy.stats import chi2, fisher_exact
from statsmodels.stats.proportion import (
    confint_proportions_2indep,
    proportions_ztest,
)


def fixed(control_n, control_x, treatment_n, treatment_x):
    p_value = proportions_ztest(
        [treatment_x, control_x], [treatment_n, control_n], prop_var=False
    )[1]
    interval = confint_proportions_2indep(
        treatment_x,
        treatment_n,
        control_x,
        control_n,
        compare="diff",
        method="newcomb",
        alpha=0.05,
        correction=False,
    )
    return float(p_value), tuple(float(value) for value in interval)


def arm_sequence(successes, total, alpha=0.025):
    """Invert the Jeffreys beta-binomial mixture e-process independently."""
    estimate = successes / total
    threshold = -log(alpha)
    mixture = betaln(0.5 + successes, 0.5 + total - successes) - betaln(0.5, 0.5)

    def log_e(candidate):
        if candidate == 0:
            return mixture if successes == 0 else float("inf")
        if candidate == 1:
            return mixture if successes == total else float("inf")
        return (
            mixture
            - successes * log(candidate)
            - (total - successes) * log(1 - candidate)
        )

    if successes == 0:
        lower = 0.0
    else:
        outside, inside = 0.0, estimate
        for _ in range(120):
            midpoint = (outside + inside) / 2
            if log_e(midpoint) > threshold:
                outside = midpoint
            else:
                inside = midpoint
        lower = inside

    if successes == total:
        upper = 1.0
    else:
        inside, outside = estimate, 1.0
        for _ in range(120):
            midpoint = (inside + outside) / 2
            if log_e(midpoint) > threshold:
                outside = midpoint
            else:
                inside = midpoint
        upper = inside
    return lower, upper


def sequential(control_n, control_x, treatment_n, treatment_x):
    control = arm_sequence(control_x, control_n)
    treatment = arm_sequence(treatment_x, treatment_n)
    return treatment[0] - control[1], treatment[1] - control[0]


if __name__ == "__main__":
    for case, values in {
        1: (10_000, 1_200, 10_000, 1_320),
        2: (20_000, 2_000, 20_000, 2_200),
        3: (20_000, 2_000, 20_000, 1_800),
        5: (100_000, 10_000, 100_000, 10_050),
        13: (20, 0, 20, 3),
    }.items():
        print(f"fixed case {case}: {fixed(*values)}")
    print(f"case 13 Fisher p: {fisher_exact([[0, 20], [3, 17]]).pvalue}")
    for case, values in {
        6: (7_200, 720, 7_000, 770),
        7: (500_000, 50_000, 500_000, 55_000),
        8: (500_000, 50_000, 500_000, 45_000),
        9: (500_000, 50_000, 500_000, 50_000),
    }.items():
        print(f"sequential case {case}: {sequential(*values)}")
    print(f"case 10 SRM p: {chi2.sf(400, 1)}")
