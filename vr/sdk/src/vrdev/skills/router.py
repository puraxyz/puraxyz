"""Contextual bandit router for skill selection using Thompson sampling.

The router maintains per-(skill_id, task_family) Beta distributions and
selects the top-k skills for a given task using Thompson sampling.

Only VERIFIED skills are eligible for production routing.

The utility function is:
    U = Δp_pass − λ·token_cost − μ·latency

State is trivially serializable to JSON for persistence between sessions.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path

from ..core.types import PromotionStage, SkillArtifact, Verdict


@dataclass
class BetaDistribution:
    """Beta distribution for Thompson sampling."""

    alpha: float = 1.0  # prior successes + 1
    beta: float = 1.0  # prior failures + 1

    def sample(self) -> float:
        """Sample from the Beta distribution."""
        return random.betavariate(self.alpha, self.beta)

    def mean(self) -> float:
        """Expected value of the distribution."""
        return self.alpha / (self.alpha + self.beta)

    def update_success(self, magnitude: float = 1.0) -> None:
        self.alpha += magnitude

    def update_failure(self, magnitude: float = 1.0) -> None:
        self.beta += magnitude

    def to_dict(self) -> dict:
        return {"alpha": self.alpha, "beta": self.beta}

    @classmethod
    def from_dict(cls, d: dict) -> BetaDistribution:
        return cls(alpha=d.get("alpha", 1.0), beta=d.get("beta", 1.0))


class SkillRouter:
    """Routes tasks to the best available skills using Thompson sampling.

    Parameters
    ----------
    state_path : str | Path | None
        Path to persist router state as JSON. If None, state is in-memory only.
    top_k : int
        Maximum number of skills to select per task.
    lambda_token : float
        Token cost penalty weight in the utility function.
    mu_latency : float
        Latency penalty weight in the utility function.
    """

    def __init__(
        self,
        state_path: str | Path | None = None,
        top_k: int = 3,
        lambda_token: float = 0.001,
        mu_latency: float = 0.0001,
    ):
        self.state_path = Path(state_path) if state_path else None
        self.top_k = top_k
        self.lambda_token = lambda_token
        self.mu_latency = mu_latency

        self._distributions: dict[str, BetaDistribution] = {}
        self._skills: dict[str, SkillArtifact] = {}

        if self.state_path and self.state_path.exists():
            self._load_state()

    def _state_key(self, skill_id: str, task_family: str) -> str:
        return f"{skill_id}::{task_family}"

    def register_skill(self, skill: SkillArtifact) -> None:
        """Register a skill with the router."""
        self._skills[skill.skill_id] = skill

    def get_distribution(self, skill_id: str, task_family: str) -> BetaDistribution:
        """Get or create the Beta distribution for a (skill, task_family) pair."""
        key = self._state_key(skill_id, task_family)
        if key not in self._distributions:
            self._distributions[key] = BetaDistribution()
        return self._distributions[key]

    def select_skills(
        self,
        task_description: str,
        task_family: str,
        candidate_skill_ids: list[str] | None = None,
    ) -> list[str]:
        """Select the top-k skills for a given task using Thompson sampling.

        Only VERIFIED skills are considered.
        """
        candidates = candidate_skill_ids or list(self._skills.keys())
        verified = [
            sid
            for sid in candidates
            if sid in self._skills
            and self._skills[sid].promotion_stage == PromotionStage.VERIFIED
        ]

        if not verified:
            return []

        # Thompson sampling with utility penalty
        samples: list[tuple[str, float]] = []
        for sid in verified:
            dist = self.get_distribution(sid, task_family)
            theta = dist.sample()

            skill = self._skills[sid]
            utility = theta - (
                self.lambda_token * skill.token_overhead_p50
                + self.mu_latency * skill.latency_overhead_ms_p50
            )
            samples.append((sid, utility))

        samples.sort(key=lambda x: x[1], reverse=True)
        return [sid for sid, _ in samples[: self.top_k]]

    def update(
        self,
        skill_id: str,
        task_family: str,
        verdict: Verdict,
        score: float = 0.0,
    ) -> None:
        """Update the distribution based on a verification outcome.

        - PASS → success update (magnitude = score)
        - FAIL → failure update (magnitude = 1 - score)
        - UNVERIFIABLE / ERROR → no update (infrastructure issue)
        """
        if verdict == Verdict.PASS:
            self.get_distribution(skill_id, task_family).update_success(score)
        elif verdict == Verdict.FAIL:
            self.get_distribution(skill_id, task_family).update_failure(1.0 - score)
        # UNVERIFIABLE and ERROR: no update

        if self.state_path:
            self._save_state()

    def get_skill_stats(self, skill_id: str, task_family: str) -> dict:
        """Get statistics for a specific skill/task_family pair."""
        dist = self.get_distribution(skill_id, task_family)
        return {
            "skill_id": skill_id,
            "task_family": task_family,
            "alpha": dist.alpha,
            "beta": dist.beta,
            "mean_utility": dist.mean(),
            "total_observations": dist.alpha + dist.beta - 2,  # subtract priors
        }

    def _save_state(self) -> None:
        """Serialize router state to disk."""
        if not self.state_path:
            return
        state = {key: dist.to_dict() for key, dist in self._distributions.items()}
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.state_path.write_text(json.dumps(state, indent=2))

    def _load_state(self) -> None:
        """Load router state from disk."""
        if not self.state_path or not self.state_path.exists():
            return
        try:
            state = json.loads(self.state_path.read_text())
            self._distributions = {
                key: BetaDistribution.from_dict(val)
                for key, val in state.items()
            }
        except (json.JSONDecodeError, KeyError):
            self._distributions = {}
