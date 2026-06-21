const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  if (ct.includes("application/pdf")) return res.blob() as unknown as T;
  return res.text() as unknown as T;
}

export const api = {
  // bank
  getBank: () => req<Bank>("GET", "/bank"),
  replaceBank: (data: Bank) => req<Bank>("PUT", "/bank", data),
  updatePersonal: (data: Personal) => req<Personal>("PUT", "/bank/personal", data),
  updateSummary: (summary: string) => req("PUT", "/bank/summary", { summary }),

  getBlocks: (section: Section) => req<Block[]>("GET", `/bank/blocks/${section}`),
  addBlock: (section: Section, block: Partial<Block>) =>
    req<Block>("POST", `/bank/blocks/${section}`, block),
  updateBlock: (section: Section, id: string, block: Partial<Block>) =>
    req<Block>("PUT", `/bank/blocks/${section}/${id}`, block),
  deleteBlock: (section: Section, id: string) =>
    req("DELETE", `/bank/blocks/${section}/${id}`),

  // active
  getActive: () => req<ActiveResume>("GET", "/active"),
  updateActive: (data: ActiveResume) => req<ActiveResume>("PUT", "/active", data),

  // skills
  getSkills: () => req<SkillBlock[]>("GET", "/skills"),
  updateSkills: (skills: SkillBlock[]) => req<SkillBlock[]>("PUT", "/skills", skills),
  addSkill: (skill: Omit<SkillBlock, "id"> & { id?: string }) =>
    req<SkillBlock>("POST", "/skills", skill),
  updateSkill: (id: string, skill: SkillBlock) =>
    req<SkillBlock>("PUT", `/skills/${id}`, skill),
  deleteSkill: (id: string) => req("DELETE", `/skills/${id}`),
  getInterests: () => req<string[]>("GET", "/interests"),
  updateInterests: (interests: string[]) => req<string[]>("PUT", "/interests", interests),

  // preview & build
  getPreview: () => req<string>("GET", "/preview"),
  buildPdf: () => req<Blob>("POST", "/build"),

  // AI
  aiBullets: (
    text: string,
    provider?: string,
    model?: string,
    extraContext?: string,
    blockContext?: Record<string, string>
  ) =>
    req<{ bullets: string[] }>("POST", "/ai/bullets", {
      text,
      provider,
      model,
      extra_context: extraContext,
      block_context: blockContext,
    }),
  aiSummary: (provider?: string, model?: string, extraContext?: string) =>
    req<{ summary: string }>("POST", "/ai/summary", { provider, model, extra_context: extraContext }),
  aiMatch: (provider: string, model: string, jobDescription: string) =>
    req<MatchResult>("POST", "/ai/match", { provider, model, job_description: jobDescription }),

  // import
  importCv: (formData: FormData) =>
    fetch(`${BASE}/import`, { method: "POST", body: formData }).then((r) => r.json()),

  // snapshots
  getSnapshots: () => req<Snapshot[]>("GET", "/snapshots"),
  saveSnapshot: (name: string) => req<Snapshot>("POST", "/snapshots", { name }),
  restoreSnapshot: (id: string) => req<ActiveResume>("PUT", `/snapshots/${id}/restore`, {}),
  deleteSnapshot: (id: string) => req("DELETE", `/snapshots/${id}`),

  // settings
  getSettings: () => req<Settings>("GET", "/settings"),
  updateSettings: (data: Partial<Settings>) => req<Settings>("PUT", "/settings", data),
  getOllamaModels: () => req<{ models: string[] }>("GET", "/ollama/models"),
};

// ── types ────────────────────────────────────────────────────────────────────

export type Section = "work_experience" | "education" | "projects";

export interface PersonalField {
  label: string;
  value: string;
}

export interface Personal {
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  linkedin: string;
  photo?: string;
  extra?: PersonalField[];
}

export interface Block {
  id: string;
  // work experience
  company?: string;
  title?: string;
  location?: string;
  dates?: string;
  tags?: string[];
  bullets?: string[];
  // education
  institution?: string;
  degree?: string;
  // projects
  // title already above
}

export interface SkillBlock {
  id: string;
  label: string;
  content: string;
}

export interface Bank {
  personal: Personal;
  summary: string;
  work_experience: Block[];
  education: Block[];
  projects: Block[];
  skills: SkillBlock[];
  interests: string[];
}

export interface ActiveEntry {
  id: string;
  max_bullets?: number;
}

export interface ActiveResume {
  include_summary: boolean;
  work_experience: ActiveEntry[];
  education: ActiveEntry[];
  projects: ActiveEntry[];
  skills: ActiveEntry[];
  include_interests: boolean;
}

export interface Snapshot {
  id: string;
  name: string;
  created_at: string;
}

export interface MatchResult {
  verdict: "apply" | "cautious" | "skip";
  score: number;
  gaps: string[];
  concerns: string[];
  remove: string[];
  add: string[];
}

export interface Settings {
  llm_provider: string;
  ollama_model: string;
  api_provider: string;
  api_model: string;
  anthropic_api_key: string;
  openai_api_key: string;
  photo_shape: "rect" | "circle";
}
