"""
Backpressure Economics - Agent-Based Simulation

Simulates capacity-proportional monetary routing under the BPE protocol.
Generates data for paper Section 7: Convergence, shock response, Sybil resistance, EWMA sweep.
"""

from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field
from typing import List
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


# ──────────────────── Configuration ────────────────────

@dataclass
class SimConfig:
    n_sinks: int = 50
    n_sources: int = 10
    n_task_types: int = 3
    timesteps: int = 1000
    ewma_alpha: float = 0.3
    min_stake: float = 100.0
    seed: int = 42


# ──────────────────── Agents ────────────────────

@dataclass
class Source:
    id: int
    task_type: int
    flow_rate: float  # Payment per timestep

@dataclass
class Sink:
    id: int
    task_type: int
    true_capacity: float
    stake: float
    smoothed_capacity: float = 0.0
    raw_capacity: float = 0.0
    payment_received: float = 0.0
    queue_backlog: float = 0.0
    is_malicious: bool = False

    def signal_capacity(self, alpha: float, noise_std: float = 0.05) -> float:
        """Signal capacity with noise. Malicious sinks over-report."""
        if self.is_malicious:
            raw = self.true_capacity * 2.0  # Over-report 2x
        else:
            noise = np.random.normal(0, noise_std * self.true_capacity)
            raw = max(0, self.true_capacity + noise)
        
        # Apply stake cap: sqrt(stake)
        cap = np.sqrt(self.stake)
        raw = min(raw, cap)
        
        self.raw_capacity = raw
        # EWMA
        self.smoothed_capacity = alpha * raw + (1 - alpha) * self.smoothed_capacity
        return self.smoothed_capacity


# ──────────────────── Allocation Strategies ────────────────────

def backpressure_allocate(
    sinks: List[Sink],
    total_payment: float,
    task_type: int,
) -> np.ndarray:
    """Allocate payment proportional to smoothed capacity (max-weight single-hop)."""
    relevant = [s for s in sinks if s.task_type == task_type]
    if not relevant:
        return np.zeros(len(sinks))

    caps = np.array([s.smoothed_capacity for s in relevant])
    total_cap = caps.sum()
    if total_cap == 0:
        return np.zeros(len(sinks))

    proportions = caps / total_cap
    allocations = np.zeros(len(sinks))
    for i, s in enumerate(relevant):
        idx = sinks.index(s)
        allocations[idx] = proportions[i] * total_payment
    return allocations


def round_robin_allocate(
    sinks: List[Sink],
    total_payment: float,
    task_type: int,
) -> np.ndarray:
    """Allocate payment equally (baseline)."""
    relevant = [s for s in sinks if s.task_type == task_type]
    if not relevant:
        return np.zeros(len(sinks))

    share = total_payment / len(relevant)
    allocations = np.zeros(len(sinks))
    for s in relevant:
        idx = sinks.index(s)
        allocations[idx] = share
    return allocations


def random_allocate(
    sinks: List[Sink],
    total_payment: float,
    task_type: int,
) -> np.ndarray:
    """Allocate payment randomly (baseline)."""
    relevant = [s for s in sinks if s.task_type == task_type]
    if not relevant:
        return np.zeros(len(sinks))

    weights = np.random.dirichlet(np.ones(len(relevant)))
    allocations = np.zeros(len(sinks))
    for i, s in enumerate(relevant):
        idx = sinks.index(s)
        allocations[idx] = weights[i] * total_payment
    return allocations


def boltzmann_allocate(
    sinks: List[Sink],
    total_payment: float,
    task_type: int,
    temperature: float = 1.0,
    exploration_rate: float = 0.05,
) -> np.ndarray:
    """Allocate via Boltzmann distribution: P(i) = exp(c_i / τ) / Σ exp(c_j / τ).

    Blends (1 - ε) Boltzmann + ε uniform for exploration.
    """
    relevant = [s for s in sinks if s.task_type == task_type]
    if not relevant:
        return np.zeros(len(sinks))

    caps = np.array([s.smoothed_capacity for s in relevant])
    if caps.sum() == 0:
        return np.zeros(len(sinks))

    tau = max(temperature, 0.01)
    logits = caps / tau
    logits -= logits.max()  # numerical stability
    weights = np.exp(logits)
    boltzmann_shares = weights / weights.sum()

    n = len(relevant)
    uniform = np.ones(n) / n
    blended = (1 - exploration_rate) * boltzmann_shares + exploration_rate * uniform

    allocations = np.zeros(len(sinks))
    for i, s in enumerate(relevant):
        idx = sinks.index(s)
        allocations[idx] = blended[i] * total_payment
    return allocations


# ──────────────────── Metrics ────────────────────

@dataclass
class Metrics:
    allocation_efficiency: List[float] = field(default_factory=list)
    max_queue_backlog: List[float] = field(default_factory=list)
    total_productive: List[float] = field(default_factory=list)

    def record(self, sinks: List[Sink]):
        productive = sum(min(s.payment_received, s.true_capacity) for s in sinks)
        total_paid = sum(s.payment_received for s in sinks)
        efficiency = productive / total_paid if total_paid > 0 else 0
        self.allocation_efficiency.append(efficiency)
        self.max_queue_backlog.append(max(s.queue_backlog for s in sinks) if sinks else 0)
        self.total_productive.append(productive)


# ──────────────────── Simulation ────────────────────

def run_simulation(
    config: SimConfig,
    strategy: str = "backpressure",
    kill_fraction: float = 0.0,
    kill_at: int = 500,
) -> Metrics:
    """Run a single simulation experiment."""
    rng = np.random.default_rng(config.seed)

    # Create sinks with heterogeneous capacity
    sinks: List[Sink] = []
    for i in range(config.n_sinks):
        task_type = i % config.n_task_types
        capacity = rng.uniform(10, 100)
        stake = rng.uniform(config.min_stake, config.min_stake * 10)
        sinks.append(Sink(id=i, task_type=task_type, true_capacity=capacity, stake=stake, smoothed_capacity=capacity))

    # Create sources
    sources: List[Source] = []
    for i in range(config.n_sources):
        task_type = i % config.n_task_types
        flow_rate = rng.uniform(50, 200)
        sources.append(Source(id=i, task_type=task_type, flow_rate=flow_rate))

    allocate_fn = {
        "backpressure": backpressure_allocate,
        "round_robin": round_robin_allocate,
        "random": random_allocate,
        "boltzmann": lambda sinks, tp, tt: boltzmann_allocate(sinks, tp, tt),
    }[strategy]

    metrics = Metrics()

    for t in range(config.timesteps):
        # Kill sinks at kill_at
        if kill_fraction > 0 and t == kill_at:
            n_kill = int(len(sinks) * kill_fraction)
            for s in sinks[:n_kill]:
                s.true_capacity = 0
                s.smoothed_capacity = 0

        # Signal capacity
        for s in sinks:
            s.signal_capacity(config.ewma_alpha)

        # Reset per-step payment
        for s in sinks:
            s.payment_received = 0.0

        # Allocate by task type
        for task_type in range(config.n_task_types):
            total_payment = sum(src.flow_rate for src in sources if src.task_type == task_type)
            allocs = allocate_fn(sinks, total_payment, task_type)
            for i, s in enumerate(sinks):
                s.payment_received += allocs[i]

        # Compute queue backlog
        for s in sinks:
            overflow = max(0, s.payment_received - s.true_capacity)
            s.queue_backlog = s.queue_backlog * 0.9 + overflow  # Decay + new overflow

        metrics.record(sinks)

    return metrics


# ──────────────────── Experiments ────────────────────

def experiment_convergence(config: SimConfig) -> dict:
    """E1: Compare allocation strategies on convergence."""
    results = {}
    for strategy in ["backpressure", "round_robin", "random"]:
        results[strategy] = run_simulation(config, strategy=strategy)
    return results


def experiment_shock(config: SimConfig) -> Metrics:
    """E2: Kill 20% of sinks at t=500, measure rebalance speed."""
    return run_simulation(config, strategy="backpressure", kill_fraction=0.2, kill_at=500)


def experiment_ewma_sweep(config: SimConfig) -> dict:
    """E4: Sweep EWMA alpha parameter."""
    results = {}
    for alpha in [0.1, 0.2, 0.3, 0.5, 0.8]:
        cfg = SimConfig(**{**config.__dict__, "ewma_alpha": alpha})
        results[alpha] = run_simulation(cfg, strategy="backpressure")
    return results


def experiment_sybil(config: SimConfig) -> dict:
    """E3: Sybil resistance - measure capacity gain vs cost for split identities.

    Fix total attacker stake S. Split into n identities, each with S/n stake.
    Each identity must pay min_stake overhead. Capacity cap = sqrt(stake).
    """
    rng = np.random.default_rng(config.seed)
    total_stake = 1000.0  # Attacker's total available stake
    fragments = [1, 2, 5, 10, 20]
    min_stakes = [50.0, 100.0, 200.0]

    results = {}
    for min_s in min_stakes:
        gains = []
        costs = []
        net_profits = []
        for n in fragments:
            per_sink_stake = total_stake / n
            overhead = n * min_s  # Total minimum-stake overhead
            # Only sinks with stake >= min_stake get nonzero cap
            if per_sink_stake >= min_s:
                cap_per_sink = np.sqrt(per_sink_stake)
                total_cap = n * cap_per_sink
                active_sinks = n
            else:
                total_cap = 0.0
                active_sinks = 0

            # Baseline: single identity with full stake
            baseline_cap = np.sqrt(total_stake) if total_stake >= min_s else 0.0

            # Gain is extra capacity from splitting
            gain = total_cap - baseline_cap
            cost = overhead - min_s  # Extra overhead beyond single-identity min_stake

            # Revenue per unit capacity (assume 1.0 payment per unit cap per epoch)
            payment_rate = 1.0
            revenue = total_cap * payment_rate
            baseline_revenue = baseline_cap * payment_rate
            net_profit = (revenue - baseline_revenue) - cost

            gains.append(gain)
            costs.append(cost)
            net_profits.append(net_profit)

        results[min_s] = {
            "fragments": fragments,
            "gains": gains,
            "costs": costs,
            "net_profits": net_profits,
        }
    return results


def experiment_buffer(config: SimConfig) -> dict:
    """E5: Buffer dynamics - measure stall rate and efficiency under different buffer sizes.
    
    Buffer sized as fraction of total spike overflow per task type.
    Spikes are 3x normal demand for 10 of every 50 timesteps.
    """
    rng = np.random.default_rng(config.seed)

    # Approximate total flow per task type (mean of uniform(50,200) * sources_per_type)
    base_flow = (config.n_sources / config.n_task_types) * 125.0
    # During spike, excess is ~2x base_flow, lasting 10 steps → spike overflow ≈ 2*base*10
    spike_overflow_est = 2.0 * base_flow * 10.0
    buffer_fractions = [0.0, 0.1, 0.5, 1.0]

    results = {}
    for frac in buffer_fractions:
        b_max = frac * spike_overflow_est
        metrics, stall_rate = run_simulation_with_buffer(config, b_max)
        results[frac] = {
            "metrics": metrics,
            "stall_rate": stall_rate,
            "b_max": b_max,
        }
    return results


def experiment_boltzmann_temperature(config: SimConfig) -> dict:
    """E6: Boltzmann temperature sweep — compare allocation at different τ values.

    Low τ concentrates on highest-capacity sinks (exploitation).
    High τ spreads allocation more evenly (exploration).
    """
    results = {}
    for tau in [0.1, 0.5, 1.0, 2.0, 5.0]:
        rng = np.random.default_rng(config.seed)

        sinks: List[Sink] = []
        for i in range(config.n_sinks):
            task_type = i % config.n_task_types
            capacity = rng.uniform(10, 100)
            stake = rng.uniform(config.min_stake, config.min_stake * 10)
            sinks.append(Sink(id=i, task_type=task_type, true_capacity=capacity,
                              stake=stake, smoothed_capacity=capacity))

        sources: List[Source] = []
        for i in range(config.n_sources):
            task_type = i % config.n_task_types
            flow_rate = rng.uniform(50, 200)
            sources.append(Source(id=i, task_type=task_type, flow_rate=flow_rate))

        metrics = Metrics()

        for t in range(config.timesteps):
            for s in sinks:
                s.signal_capacity(config.ewma_alpha)

            for s in sinks:
                s.payment_received = 0.0

            for task_type in range(config.n_task_types):
                total_payment = sum(src.flow_rate for src in sources if src.task_type == task_type)
                allocs = boltzmann_allocate(sinks, total_payment, task_type, temperature=tau)
                for i, s in enumerate(sinks):
                    s.payment_received += allocs[i]

            for s in sinks:
                excess = max(0, s.payment_received - s.true_capacity)
                s.queue_backlog = s.queue_backlog * 0.9 + excess

            metrics.record(sinks)

        results[tau] = metrics

    return results


def run_simulation_with_buffer(
    config: SimConfig,
    buffer_max: float,
) -> tuple:
    """Run simulation with an overflow buffer, tracking source stalls.
    
    Demand has baseline + periodic spikes to create intermittent overflow.
    """
    rng = np.random.default_rng(config.seed)

    sinks: List[Sink] = []
    for i in range(config.n_sinks):
        task_type = i % config.n_task_types
        capacity = rng.uniform(10, 100)
        stake = rng.uniform(config.min_stake, config.min_stake * 10)
        sinks.append(Sink(id=i, task_type=task_type, true_capacity=capacity, stake=stake, smoothed_capacity=capacity))

    sources: List[Source] = []
    for i in range(config.n_sources):
        task_type = i % config.n_task_types
        flow_rate = rng.uniform(50, 200)
        sources.append(Source(id=i, task_type=task_type, flow_rate=flow_rate))

    metrics = Metrics()
    buffers = {t: 0.0 for t in range(config.n_task_types)}
    stall_count = 0
    total_source_steps = 0

    for t in range(config.timesteps):
        for s in sinks:
            s.signal_capacity(config.ewma_alpha)

        for s in sinks:
            s.payment_received = 0.0

        # Demand spike: every ~50 steps, demand surges 3x for 10 steps
        spike_multiplier = 1.0
        if (t % 50) < 10:
            spike_multiplier = 3.0

        for task_type in range(config.n_task_types):
            base_payment = sum(src.flow_rate for src in sources if src.task_type == task_type)
            total_payment = base_payment * spike_multiplier
            total_source_steps += 1

            # Drain from buffer
            drain_amount = min(buffers[task_type], base_payment * 0.2)
            effective_payment = total_payment + drain_amount
            buffers[task_type] -= drain_amount

            allocs = backpressure_allocate(sinks, effective_payment, task_type)

            overflow = 0.0
            for i, s in enumerate(sinks):
                if s.task_type != task_type:
                    continue
                allocated = allocs[i]
                absorbable = min(allocated, s.true_capacity)
                excess = allocated - absorbable
                s.payment_received += allocated
                overflow += excess

            if overflow > 0:
                new_buffer = buffers[task_type] + overflow
                if new_buffer > buffer_max:
                    stall_count += 1
                    buffers[task_type] = buffer_max
                else:
                    buffers[task_type] = new_buffer

        for s in sinks:
            excess = max(0, s.payment_received - s.true_capacity)
            s.queue_backlog = s.queue_backlog * 0.9 + excess

        metrics.record(sinks)

    stall_rate = stall_count / total_source_steps if total_source_steps > 0 else 0.0
    return metrics, stall_rate


# ──────────────────── Plotting ────────────────────

def plot_convergence(results: dict, output: str = "convergence.pdf"):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

    for name, metrics in results.items():
        ax1.plot(metrics.allocation_efficiency, label=name, alpha=0.8)
        ax2.plot(metrics.max_queue_backlog, label=name, alpha=0.8)

    ax1.set_ylabel("Allocation Efficiency")
    ax1.set_title("E1: Convergence - BPE vs Baselines")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.set_ylabel("Max Queue Backlog")
    ax2.set_xlabel("Timestep")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


def plot_shock(metrics: Metrics, output: str = "shock.pdf"):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

    ax1.plot(metrics.allocation_efficiency, color="steelblue")
    ax1.axvline(x=500, color="red", linestyle="--", label="Shock (20% killed)")
    ax1.set_ylabel("Allocation Efficiency")
    ax1.set_title("E2: Shock Response")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(metrics.max_queue_backlog, color="coral")
    ax2.axvline(x=500, color="red", linestyle="--", label="Shock")
    ax2.set_ylabel("Max Queue Backlog")
    ax2.set_xlabel("Timestep")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


def plot_ewma_sweep(results: dict, output: str = "ewma_sweep.pdf"):
    fig, ax = plt.subplots(figsize=(10, 5))

    for alpha, metrics in sorted(results.items()):
        ax.plot(metrics.allocation_efficiency, label=f"α={alpha}", alpha=0.7)

    ax.set_xlabel("Timestep")
    ax.set_ylabel("Allocation Efficiency")
    ax.set_title("E4: EWMA α Sweep")
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


def plot_sybil(results: dict, output: str = "sybil.pdf"):
    """Plot Sybil attack profitability: net gain vs fragment count for different min_stakes."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    colors = ["#2196F3", "#FF5722", "#4CAF50"]
    for idx, (min_s, data) in enumerate(sorted(results.items())):
        frags = data["fragments"]
        ax1.plot(frags, data["gains"], marker="o", color=colors[idx],
                 label=f"$S_{{min}}$={min_s:.0f}", linewidth=2)
        ax2.plot(frags, data["net_profits"], marker="s", color=colors[idx],
                 label=f"$S_{{min}}$={min_s:.0f}", linewidth=2)

    ax1.set_xlabel("Number of Fragments ($n$)")
    ax1.set_ylabel("Capacity Gain over Single Identity")
    ax1.set_title("E3a: Sybil Capacity Gain")
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_xscale("log")

    ax2.set_xlabel("Number of Fragments ($n$)")
    ax2.set_ylabel("Net Profit (Revenue Gain − Stake Cost)")
    ax2.set_title("E3b: Sybil Attack Profitability")
    ax2.axhline(y=0, color="black", linestyle="--", alpha=0.5)
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.set_xscale("log")

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


def plot_buffer(results: dict, output: str = "buffer.pdf"):
    """Plot buffer dynamics: stall rate and efficiency vs buffer size."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    fractions = sorted(results.keys())
    stall_rates = [results[f]["stall_rate"] for f in fractions]
    avg_effs = [np.mean(results[f]["metrics"].allocation_efficiency[-100:]) for f in fractions]
    labels = [f"{f:.1f}Λ" for f in fractions]

    ax1.bar(range(len(fractions)), stall_rates, color="#FF5722", alpha=0.8, tick_label=labels)
    ax1.set_xlabel("Buffer Size ($B_{max}$)")
    ax1.set_ylabel("Source Stall Rate")
    ax1.set_title("E5a: Source Stalling Frequency")
    ax1.grid(True, alpha=0.3, axis="y")

    ax2.bar(range(len(fractions)), avg_effs, color="#2196F3", alpha=0.8, tick_label=labels)
    ax2.set_xlabel("Buffer Size ($B_{max}$)")
    ax2.set_ylabel("Avg Allocation Efficiency (last 100)")
    ax2.set_title("E5b: Efficiency vs Buffer Size")
    ax2.set_ylim(0.8, 1.0)
    ax2.grid(True, alpha=0.3, axis="y")

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


def plot_boltzmann_temperature(results: dict, output: str = "boltzmann_temperature.pdf"):
    """Plot Boltzmann temperature sweep: efficiency and backlog at different τ."""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

    for tau, metrics in sorted(results.items()):
        ax1.plot(metrics.allocation_efficiency, label=f"τ={tau}", alpha=0.7)
        ax2.plot(metrics.max_queue_backlog, label=f"τ={tau}", alpha=0.7)

    ax1.set_ylabel("Allocation Efficiency")
    ax1.set_title("E6: Boltzmann Temperature Sweep")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.set_ylabel("Max Queue Backlog")
    ax2.set_xlabel("Timestep")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output, dpi=150)
    plt.close()
    print(f"Saved: {output}")


# ──────────────────── Main ────────────────────

if __name__ == "__main__":
    config = SimConfig()

    print("Running E1: Convergence...")
    conv = experiment_convergence(config)
    plot_convergence(conv)

    print("Running E2: Shock response...")
    shock = experiment_shock(config)
    plot_shock(shock)

    print("Running E3: Sybil resistance...")
    sybil = experiment_sybil(config)
    plot_sybil(sybil)

    print("Running E4: EWMA sweep...")
    ewma = experiment_ewma_sweep(config)
    plot_ewma_sweep(ewma)

    print("Running E5: Buffer dynamics...")
    buffer = experiment_buffer(config)
    plot_buffer(buffer)

    print("Running E6: Boltzmann temperature sweep...")
    boltz = experiment_boltzmann_temperature(config)
    plot_boltzmann_temperature(boltz)

    # Print summary
    print("\n── E1 Summary ──")
    for name, metrics in conv.items():
        avg_eff = np.mean(metrics.allocation_efficiency[-100:])
        print(f"  {name}: avg efficiency (last 100) = {avg_eff:.4f}")

    print("\n── E3 Summary ──")
    for min_s, data in sorted(sybil.items()):
        print(f"  S_min={min_s:.0f}: net_profits = {[f'{p:.1f}' for p in data['net_profits']]}")

    print("\n── E5 Summary ──")
    for frac in sorted(buffer.keys()):
        r = buffer[frac]
        avg_eff = np.mean(r["metrics"].allocation_efficiency[-100:])
        print(f"  B_max={frac:.1f}Λ: stall_rate={r['stall_rate']:.4f}, efficiency={avg_eff:.4f}")

    print("\n── E6 Summary ──")
    for tau in sorted(boltz.keys()):
        avg_eff = np.mean(boltz[tau].allocation_efficiency[-100:])
        avg_backlog = np.mean(boltz[tau].max_queue_backlog[-100:])
        print(f"  τ={tau}: avg efficiency={avg_eff:.4f}, avg backlog={avg_backlog:.1f}")
