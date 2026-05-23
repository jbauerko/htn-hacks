// Thin fetch wrapper + response types for the backend.
// Endpoints documented in backend/routers/*.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export type ModuleColor =
  | "indigo" | "emerald" | "amber" | "rose" | "violet"
  | "cyan" | "orange" | "sky" | "teal" | "pink";

export type ModuleSummary = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: ModuleColor;
  knowledge_item_count: number;
  rule_count: number;
};

export type ModuleDetail = ModuleSummary & {
  knowledge: { title: string; content: string; tags: string[] }[];
  rules: string[];
  glossary: { term: string; definition: string }[];
};

export type Scenario = {
  id: string;
  title: string;
  situation: string;
  hint: string | null;
  choices: {
    id: string;
    text: string;
    outcome: string;
    points: number;
    is_correct: boolean;
  }[];
};
export type ScenariosResponse = {
  module_id: string;
  module_name: string;
  scenarios: Scenario[];
};

export type MatchPair = { id: string; term: string; definition: string };
export type MatchingResponse = {
  module_id: string;
  module_name: string;
  pairs: MatchPair[];
};

export type TriageBucket = {
  id: string;
  label: string;
  icon: string;
  color: ModuleColor;
};
export type TriageTicket = {
  id: string;
  text: string;
  correct_bucket_id: string;
  explanation: string;
};
export type TriageResponse = {
  module_id: string;
  module_name: string;
  buckets: TriageBucket[];
  tickets: TriageTicket[];
};

export type RadioChoice = {
  id: string;
  text: string;
  is_correct: boolean;
  feedback: string;
};
export type Transmission = {
  id: string;
  callsign: string;
  message: string;
  time_limit_seconds: number;
  choices: RadioChoice[];
};
export type RadioResponse = {
  module_id: string;
  module_name: string;
  transmissions: Transmission[];
};

export type AdventureChoice = {
  id: string;
  text: string;
  next: string;
  points: number;
  outcome: string;
};
export type AdventureNode = {
  id: string;
  is_start?: boolean;
  is_ending?: boolean;
  scene_title?: string | null;
  narration?: string | null;
  label?: string | null;
  vibe?: "triumph" | "mixed" | "disaster" | "weird" | null;
  epilogue?: string | null;
  choices: AdventureChoice[];
};
export type AdventureResponse = {
  module_id: string;
  module_name: string;
  title: string;
  intro: string;
  start_node_id: string;
  nodes: AdventureNode[];
};

export type StorySpan = {
  id: string;
  text: string;
  is_violation: boolean;
  violated_rule: string | null;
};
export type Story = {
  id: string;
  title: string;
  intro: string;
  spans: StorySpan[];
};
export type ViolationsResponse = {
  module_id: string;
  module_name: string;
  stories: Story[];
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${path} → ${res.status} ${res.statusText}\n${body}`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST ${path} → ${res.status} ${res.statusText}\n${body}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listModules: () => getJSON<ModuleSummary[]>("/modules"),
  getModule: (id: string) => getJSON<ModuleDetail>(`/modules/${id}`),
  scenarios: (id: string) => getJSON<ScenariosResponse>(`/modules/${id}/scenarios`),
  matching: (id: string) => getJSON<MatchingResponse>(`/modules/${id}/matching`),
  triage: (id: string) => getJSON<TriageResponse>(`/modules/${id}/triage`),
  radio: (id: string) => getJSON<RadioResponse>(`/modules/${id}/radio`),
  violations: (id: string) => getJSON<ViolationsResponse>(`/modules/${id}/violations`),
  adventure: (id: string) => getJSON<AdventureResponse>(`/modules/${id}/adventure`),
  regenerateAdventure: (id: string) =>
    postJSON<AdventureResponse>(`/modules/${id}/adventure/regenerate`),
};
