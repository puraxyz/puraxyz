/**
 * Marketplace: agent-to-agent skill exchange.
 * In-memory store with Redis persistence when available.
 */

export interface SkillRegistration {
  agentId: string;
  skillType: string;
  price: number; // sats per task
  capacity: number; // max concurrent tasks
  activeJobs: number;
  qualityScore: number;
  description: string;
  registeredAt: number;
}

export interface TaskPost {
  taskId: string;
  skillType: string;
  payload: string;
  maxPrice: number;
  requesterId: string;
  assignedTo: string | null;
  status: "open" | "assigned" | "completed" | "failed";
  createdAt: number;
  completedAt: number | null;
  qualityRating: number | null;
  paymentHash: string | null;
}

// --- In-memory stores ---

const skills = new Map<string, SkillRegistration[]>(); // agentId -> registrations
const tasks = new Map<string, TaskPost>(); // taskId -> task

// --- Helpers ---

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Skill registration ---

export function registerSkill(reg: Omit<SkillRegistration, "activeJobs" | "qualityScore" | "registeredAt">): SkillRegistration {
  const full: SkillRegistration = {
    ...reg,
    activeJobs: 0,
    qualityScore: 1.0,
    registeredAt: Date.now(),
  };

  const existing = skills.get(reg.agentId) ?? [];
  // Replace if same skillType already registered
  const idx = existing.findIndex((s) => s.skillType === reg.skillType);
  if (idx >= 0) {
    existing[idx] = full;
  } else {
    existing.push(full);
  }
  skills.set(reg.agentId, existing);
  return full;
}

export function getAgentSkills(agentId: string): SkillRegistration[] {
  return skills.get(agentId) ?? [];
}

// --- Search ---

export interface SearchParams {
  skillType: string;
  maxPrice?: number;
}

export function searchSkills(params: SearchParams): SkillRegistration[] {
  const results: SkillRegistration[] = [];
  for (const regs of skills.values()) {
    for (const reg of regs) {
      if (reg.skillType !== params.skillType) continue;
      if (params.maxPrice !== undefined && reg.price > params.maxPrice) continue;
      if (reg.activeJobs >= reg.capacity) continue;
      results.push(reg);
    }
  }
  // Sort by quality/price ratio (higher is better)
  results.sort((a, b) => {
    const ratioA = a.qualityScore / Math.max(a.price, 1);
    const ratioB = b.qualityScore / Math.max(b.price, 1);
    return ratioB - ratioA;
  });
  return results;
}

// --- Task lifecycle ---

export function createTask(post: Pick<TaskPost, "skillType" | "payload" | "maxPrice" | "requesterId">): TaskPost {
  const task: TaskPost = {
    taskId: generateId(),
    skillType: post.skillType,
    payload: post.payload,
    maxPrice: post.maxPrice,
    requesterId: post.requesterId,
    assignedTo: null,
    status: "open",
    createdAt: Date.now(),
    completedAt: null,
    qualityRating: null,
    paymentHash: null,
  };
  tasks.set(task.taskId, task);
  return task;
}

export function assignTask(taskId: string, agentId: string): TaskPost | null {
  const task = tasks.get(taskId);
  if (!task || task.status !== "open") return null;

  // Find the agent's registration for this skill
  const regs = skills.get(agentId) ?? [];
  const reg = regs.find((r) => r.skillType === task.skillType);
  if (!reg || reg.activeJobs >= reg.capacity) return null;
  if (reg.price > task.maxPrice) return null;

  task.assignedTo = agentId;
  task.status = "assigned";
  reg.activeJobs++;
  return task;
}

export function completeTask(
  taskId: string,
  agentId: string,
  qualityRating: number,
): TaskPost | null {
  const task = tasks.get(taskId);
  if (!task || task.status !== "assigned" || task.assignedTo !== agentId) return null;

  task.status = "completed";
  task.completedAt = Date.now();
  task.qualityRating = Math.max(0, Math.min(1, qualityRating));

  // Update agent quality score (exponential moving average)
  const regs = skills.get(agentId) ?? [];
  const reg = regs.find((r) => r.skillType === task.skillType);
  if (reg) {
    reg.activeJobs = Math.max(0, reg.activeJobs - 1);
    reg.qualityScore = 0.8 * reg.qualityScore + 0.2 * task.qualityRating;
  }

  return task;
}

export function getTask(taskId: string): TaskPost | null {
  return tasks.get(taskId) ?? null;
}

// --- Aggregate stats ---

export interface MarketplaceStats {
  totalAgents: number;
  totalSkills: number;
  totalTasks: number;
  completedTasks: number;
  totalSatsTransacted: number;
  skillPrices: Record<string, { avgPrice: number; count: number }>;
  recentTasks: TaskPost[];
  leaderboard: { agentId: string; earnings: number; quality: number }[];
}

export function getMarketplaceStats(): MarketplaceStats {
  let totalSkills = 0;
  const skillPriceMap = new Map<string, { sum: number; count: number }>();
  const agentEarnings = new Map<string, { earnings: number; quality: number }>();

  for (const [agentId, regs] of skills.entries()) {
    totalSkills += regs.length;
    for (const reg of regs) {
      const sp = skillPriceMap.get(reg.skillType) ?? { sum: 0, count: 0 };
      sp.sum += reg.price;
      sp.count++;
      skillPriceMap.set(reg.skillType, sp);
    }
    if (!agentEarnings.has(agentId)) {
      agentEarnings.set(agentId, { earnings: 0, quality: 1 });
    }
  }

  let completedTasks = 0;
  let totalSats = 0;
  const recent: TaskPost[] = [];

  for (const task of tasks.values()) {
    if (task.status === "completed") {
      completedTasks++;
      // Use assigned agent's price for this skill
      const regs = skills.get(task.assignedTo!) ?? [];
      const reg = regs.find((r) => r.skillType === task.skillType);
      const price = reg?.price ?? 0;
      totalSats += price;

      const ae = agentEarnings.get(task.assignedTo!) ?? { earnings: 0, quality: 1 };
      ae.earnings += price;
      if (reg) ae.quality = reg.qualityScore;
      agentEarnings.set(task.assignedTo!, ae);
    }
    recent.push(task);
  }

  // Sort recent by creation time, take last 20
  recent.sort((a, b) => b.createdAt - a.createdAt);

  const skillPrices: Record<string, { avgPrice: number; count: number }> = {};
  for (const [type, data] of skillPriceMap.entries()) {
    skillPrices[type] = { avgPrice: Math.round(data.sum / data.count), count: data.count };
  }

  const leaderboard = Array.from(agentEarnings.entries())
    .map(([agentId, data]) => ({ agentId, ...data }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  return {
    totalAgents: skills.size,
    totalSkills,
    totalTasks: tasks.size,
    completedTasks,
    totalSatsTransacted: totalSats,
    skillPrices,
    recentTasks: recent.slice(0, 20),
    leaderboard,
  };
}
