"""Z-score normalization for GRPO/REINFORCE++ compatibility."""

from __future__ import annotations

import math


def z_score_normalize(scores: list[float]) -> list[float]:
    """Apply z-score normalization across a batch of scores.

    Matches the GRPO/REINFORCE++ convention where rewards are normalized
    to have zero mean and unit variance within a batch.

    Parameters
    ----------
    scores : list[float]
        Raw reward scores from verification.

    Returns
    -------
    list[float]
        Normalized scores with mean ≈ 0 and variance ≈ 1.
    """
    if not scores:
        return []

    n = len(scores)
    if n == 1:
        return [0.0]

    mean = sum(scores) / n
    variance = sum((s - mean) ** 2 for s in scores) / n
    std = math.sqrt(variance) if variance > 0 else 0.0

    if std == 0.0:
        return [0.0] * n

    return [(s - mean) / std for s in scores]
