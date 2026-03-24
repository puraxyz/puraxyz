"""
Boltzmann routing simulation — compares deterministic, Boltzmann, and hybrid
routing strategies under four scenarios.

Generates figures for the thermodynamic extensions paper.
"""

import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

FIGURES_DIR = Path(__file__).parent.parent / "docs" / "paper" / "thermo" / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

NUM_SINKS = 10
NUM_TASK_TYPES = 5
NUM_EPOCHS = 1000
EPSILON = 0.05          # exploration parameter
TAU_MIN = 0.5
TAU_MAX = 5.0
SIGMA2_MAX = 100.0
RNG = np.random.default_rng(42)


def compute_temperature(capacities: np.ndarray) -> float:
    sigma2 = np.var(capacities)
    ratio = min(sigma2 / SIGMA2_MAX, 1.0)
    return TAU_MIN + (TAU_MAX - TAU_MIN) * ratio


def boltzmann_shares(capacities: np.ndarray, tau: float) -> np.ndarray:
    exp_c = np.exp(capacities / max(tau, 0.01))
    probs = exp_c / exp_c.sum()
    N = len(capacities)
    shares = (1 - EPSILON) * probs + EPSILON * (1.0 / N)
    return shares / shares.sum()


def deterministic_shares(capacities: np.ndarray, stakes: np.ndarray) -> np.ndarray:
    raw = capacities * np.sqrt(stakes)
    total = raw.sum()
    if total == 0:
        return np.ones(len(capacities)) / len(capacities)
    return raw / total


def hybrid_shares(capacities: np.ndarray, stakes: np.ndarray) -> np.ndarray:
    tau = compute_temperature(capacities)
    if tau < 1.0:
        return deterministic_shares(capacities, stakes)
    else:
        return boltzmann_shares(capacities, tau)


def simulate(capacity_fn, strategy: str, stakes: np.ndarray):
    """Run one scenario. capacity_fn(epoch) returns capacity array."""
    throughputs = []
    gini_coeffs = []
    allocations_history = []

    for epoch in range(NUM_EPOCHS):
        caps = capacity_fn(epoch)

        if strategy == "deterministic":
            shares = deterministic_shares(caps, stakes)
        elif strategy == "boltzmann":
            tau = compute_temperature(caps)
            shares = boltzmann_shares(caps, tau)
        elif strategy == "hybrid":
            shares = hybrid_shares(caps, stakes)
        else:
            raise ValueError(f"Unknown strategy: {strategy}")

        # Throughput: min of allocated share and available capacity per sink
        served = np.minimum(shares * caps.sum(), caps)
        throughput = served.sum() / caps.sum()
        throughputs.append(throughput)

        # Gini coefficient of allocation
        sorted_shares = np.sort(shares)
        n = len(sorted_shares)
        index = np.arange(1, n + 1)
        gini = (2 * np.sum(index * sorted_shares) - (n + 1) * np.sum(sorted_shares)) / (n * np.sum(sorted_shares))
        gini_coeffs.append(gini)
        allocations_history.append(shares.copy())

    return {
        "throughputs": np.array(throughputs),
        "gini": np.array(gini_coeffs),
        "allocations": np.array(allocations_history),
    }


# --- Capacity functions for each scenario ---

def steady_state_capacity(epoch: int) -> np.ndarray:
    base = np.array([10, 12, 8, 15, 9, 11, 13, 7, 14, 10], dtype=float)
    noise = RNG.normal(0, 0.5, NUM_SINKS)
    return np.maximum(base + noise, 1.0)


def shock_capacity(epoch: int) -> np.ndarray:
    base = np.array([10, 12, 8, 15, 9, 11, 13, 7, 14, 10], dtype=float)
    noise = RNG.normal(0, 0.5, NUM_SINKS)
    caps = base + noise
    if 500 <= epoch < 700:
        # Sinks 0, 3, 6 drop to 10% capacity
        caps[0] *= 0.1
        caps[3] *= 0.1
        caps[6] *= 0.1
    return np.maximum(caps, 0.5)


def oscillating_capacity(epoch: int) -> np.ndarray:
    base = np.array([10, 12, 8, 15, 9, 11, 13, 7, 14, 10], dtype=float)
    noise = RNG.normal(0, 0.3, NUM_SINKS)
    caps = base + noise
    # Sinks 0 and 1 oscillate
    if epoch % 2 == 0:
        caps[0] = 20.0
        caps[1] = 2.0
    else:
        caps[0] = 2.0
        caps[1] = 20.0
    return np.maximum(caps, 0.5)


def sybil_capacity(epoch: int) -> np.ndarray:
    # Normal sinks: 5 sinks with capacity ~10 each
    base = np.array([10, 12, 8, 15, 9], dtype=float)
    noise_normal = RNG.normal(0, 0.5, 5)
    normal = np.maximum(base + noise_normal, 1.0)
    # Sybil: one operator splits 15 capacity across 5 sinks
    sybil_total = 15.0
    sybil_per = sybil_total / 5
    noise_sybil = RNG.normal(0, 0.2, 5)
    sybil = np.maximum(sybil_per + noise_sybil, 0.5)
    return np.concatenate([normal, sybil])


def run_all():
    strategies = ["deterministic", "boltzmann", "hybrid"]
    stakes = np.ones(NUM_SINKS) * 100.0

    scenarios = {
        "steady": steady_state_capacity,
        "shock": shock_capacity,
        "oscillating": oscillating_capacity,
        "sybil": sybil_capacity,
    }

    results = {}
    for scenario_name, cap_fn in scenarios.items():
        results[scenario_name] = {}
        for strat in strategies:
            # Reset RNG for fair comparison
            global RNG
            RNG = np.random.default_rng(42)
            results[scenario_name][strat] = simulate(cap_fn, strat, stakes)

    # --- Plot 1: Throughput comparison across scenarios ---
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle("Throughput under three routing strategies", fontsize=14)
    for idx, (scenario_name, scenario_results) in enumerate(results.items()):
        ax = axes[idx // 2][idx % 2]
        for strat in strategies:
            # Smooth with rolling window
            window = 20
            smoothed = np.convolve(
                scenario_results[strat]["throughputs"],
                np.ones(window) / window, mode="valid"
            )
            ax.plot(smoothed, label=strat, alpha=0.8)
        ax.set_title(scenario_name)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Throughput efficiency")
        ax.set_ylim(0.4, 1.05)
        ax.legend(fontsize=8)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "throughput_comparison.pdf", bbox_inches="tight")
    plt.savefig(FIGURES_DIR / "throughput_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()

    # --- Plot 2: Gini coefficient (load balance) ---
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle("Allocation Gini coefficient (lower = more equal)", fontsize=14)
    for idx, (scenario_name, scenario_results) in enumerate(results.items()):
        ax = axes[idx // 2][idx % 2]
        for strat in strategies:
            window = 20
            smoothed = np.convolve(
                scenario_results[strat]["gini"],
                np.ones(window) / window, mode="valid"
            )
            ax.plot(smoothed, label=strat, alpha=0.8)
        ax.set_title(scenario_name)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Gini coefficient")
        ax.legend(fontsize=8)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "gini_comparison.pdf", bbox_inches="tight")
    plt.savefig(FIGURES_DIR / "gini_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()

    # --- Plot 3: Shock recovery detail ---
    fig, ax = plt.subplots(figsize=(8, 4))
    for strat in strategies:
        t = results["shock"][strat]["throughputs"][480:720]
        ax.plot(range(480, 480 + len(t)), t, label=strat, alpha=0.8)
    ax.axvline(x=500, color="red", linestyle="--", alpha=0.5, label="Shock onset")
    ax.axvline(x=700, color="green", linestyle="--", alpha=0.5, label="Shock end")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Throughput efficiency")
    ax.set_title("Capacity shock detail (epochs 480-720)")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "shock_detail.pdf", bbox_inches="tight")
    plt.savefig(FIGURES_DIR / "shock_detail.png", dpi=150, bbox_inches="tight")
    plt.close()

    # --- Plot 4: Sybil flow share ---
    fig, ax = plt.subplots(figsize=(8, 4))
    for strat in strategies:
        allocs = results["sybil"][strat]["allocations"]
        # Sum of flow to sybil sinks (indices 5-9)
        sybil_share = allocs[:, 5:].sum(axis=1)
        window = 20
        smoothed = np.convolve(sybil_share, np.ones(window) / window, mode="valid")
        ax.plot(smoothed, label=strat, alpha=0.8)
    ax.axhline(y=15.0 / (10 * 10 + 15), color="gray", linestyle=":", alpha=0.5,
               label="Fair share (capacity-proportional)")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Total share to Sybil sinks")
    ax.set_title("Sybil attack: flow captured by split operator")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sybil_share.pdf", bbox_inches="tight")
    plt.savefig(FIGURES_DIR / "sybil_share.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Print summary statistics
    print("\n=== Simulation Summary ===\n")
    for scenario_name in scenarios:
        print(f"--- {scenario_name} ---")
        for strat in strategies:
            r = results[scenario_name][strat]
            mean_t = r["throughputs"].mean()
            mean_g = r["gini"].mean()
            print(f"  {strat:15s}  throughput={mean_t:.3f}  gini={mean_g:.3f}")
        print()


if __name__ == "__main__":
    run_all()
