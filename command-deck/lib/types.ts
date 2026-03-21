export type Audience =
  | "investor"
  | "engineer"
  | "builder"
  | "grant-reviewer"
  | "general";

export type Scenario =
  | "elevator-pitch"
  | "5-min-pitch"
  | "technical-defense"
  | "grant-app"
  | "objection";

export interface Briefing {
  id: string;
  title: string;
  audiences: Audience[];
  scenarios: Scenario[];
  /** One sentence you can repeat from memory. */
  headline: string;
  /** One paragraph for a 2-minute explanation. */
  elevator: string;
  /** Full explanation with supporting evidence. */
  detail: string;
  /** Paths to source files in the monorepo. */
  sources: string[];
}

export interface Concept {
  id: string;
  title: string;
  /** One sentence a non-technical person can repeat. */
  headline: string;
  /** One paragraph for a 2-minute explanation. */
  elevator: string;
  /** Full explanation with formulas translated to plain English. */
  detail: string;
  sources: string[];
}

export interface Objection {
  id: string;
  challenge: string;
  response: string;
  evidence: string;
  sources: string[];
}

export const AUDIENCE_LABELS: Record<Audience, string> = {
  investor: "Investors",
  engineer: "Engineers",
  builder: "Builders",
  "grant-reviewer": "Grant reviewers",
  general: "General",
};

export const SCENARIO_LABELS: Record<Scenario, string> = {
  "elevator-pitch": "Elevator pitch",
  "5-min-pitch": "5-min pitch",
  "technical-defense": "Technical defense",
  "grant-app": "Grant application",
  objection: "Objection handling",
};
