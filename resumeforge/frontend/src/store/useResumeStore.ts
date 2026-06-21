import { create } from "zustand";
import { api, Bank, ActiveResume, Settings, Section, ActiveEntry, Block, SkillBlock } from "../api/client";

interface ResumeStore {
  bank: Bank | null;
  active: ActiveResume | null;
  settings: Settings | null;
  previewHtml: string;
  loading: boolean;
  previewLoading: boolean;
  toast: { message: string; type: "success" | "error" } | null;

  init: () => Promise<void>;
  refreshPreview: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;

  // active mutations
  setActive: (active: ActiveResume) => Promise<void>;
  toggleBlockInActive: (section: Section | "skills", id: string) => Promise<void>;
  reorderActiveSection: (section: Section | "skills", ids: string[]) => Promise<void>;
  setMaxBullets: (section: Section, id: string, max: number | undefined) => Promise<void>;

  // bank block mutations
  updateBankBlock: (section: Section, block: Block) => Promise<void>;
  addBankBlock: (section: Section, block: Partial<Block>) => Promise<Block>;
  deleteBankBlock: (section: Section, id: string) => Promise<void>;

  // skill mutations
  addSkill: (skill: Omit<SkillBlock, "id"> & { id?: string }) => Promise<SkillBlock>;
  updateSkill: (skill: SkillBlock) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;

  // other bank mutations
  updateSummary: (summary: string) => Promise<void>;
  updateInterests: (interests: string[]) => Promise<void>;
  updatePersonal: (personal: Bank["personal"]) => Promise<void>;

  setSettings: (s: Settings) => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  bank: null,
  active: null,
  settings: null,
  previewHtml: "",
  loading: true,
  previewLoading: false,
  toast: null,

  showToast(message, type = "success") {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  async init() {
    set({ loading: true });
    try {
      const [bank, active, settings] = await Promise.all([
        api.getBank(),
        api.getActive(),
        api.getSettings(),
      ]);
      set({ bank, active, settings, loading: false });
      get().refreshPreview();
    } catch {
      set({ loading: false });
      get().showToast("Failed to load data from backend", "error");
    }
  },

  async refreshPreview() {
    set({ previewLoading: true });
    try {
      const html = await api.getPreview();
      set({ previewHtml: html, previewLoading: false });
    } catch {
      set({ previewLoading: false });
    }
  },

  async setActive(active) {
    set({ active });
    await api.updateActive(active);
    get().refreshPreview();
  },

  async toggleBlockInActive(section, id) {
    const { active } = get();
    if (!active) return;
    const entries = (active[section] as ActiveEntry[]) ?? [];
    const currentIds = entries.map((e) => e.id);
    const newEntries = currentIds.includes(id)
      ? entries.filter((e) => e.id !== id)
      : [...entries, { id }];
    await get().setActive({ ...active, [section]: newEntries });
  },

  async reorderActiveSection(section, ids) {
    const { active } = get();
    if (!active) return;
    const entries = (active[section] as ActiveEntry[]) ?? [];
    const map = Object.fromEntries(entries.map((e) => [e.id, e]));
    const newEntries = ids.map((id) => map[id] ?? { id });
    await get().setActive({ ...active, [section]: newEntries });
  },

  async setMaxBullets(section, id, max) {
    const { active } = get();
    if (!active) return;
    const newEntries = (active[section] as ActiveEntry[]).map((e) =>
      e.id === id ? { ...e, max_bullets: max } : e
    );
    await get().setActive({ ...active, [section]: newEntries });
  },

  async updateBankBlock(section, block) {
    await api.updateBlock(section, block.id, block);
    const bank = get().bank!;
    const updated = (bank[section] as Block[]).map((b) => (b.id === block.id ? block : b));
    set({ bank: { ...bank, [section]: updated } });
    get().refreshPreview();
  },

  async addBankBlock(section, block) {
    const newBlock = await api.addBlock(section, block);
    const bank = get().bank!;
    set({ bank: { ...bank, [section]: [...(bank[section] as Block[]), newBlock] } });
    return newBlock;
  },

  async deleteBankBlock(section, id) {
    await api.deleteBlock(section, id);
    const bank = get().bank!;
    set({ bank: { ...bank, [section]: (bank[section] as Block[]).filter((b) => b.id !== id) } });
    const { active } = get();
    if (active) {
      const newActive = { ...active, [section]: (active[section] as ActiveEntry[]).filter((e) => e.id !== id) };
      set({ active: newActive });
      await api.updateActive(newActive);
    }
    get().refreshPreview();
  },

  async addSkill(skill) {
    const newSkill = await api.addSkill(skill);
    const bank = get().bank!;
    set({ bank: { ...bank, skills: [...bank.skills, newSkill] } });
    return newSkill;
  },

  async updateSkill(skill) {
    await api.updateSkill(skill.id, skill);
    const bank = get().bank!;
    set({ bank: { ...bank, skills: bank.skills.map((s) => (s.id === skill.id ? skill : s)) } });
    get().refreshPreview();
  },

  async deleteSkill(id) {
    await api.deleteSkill(id);
    const bank = get().bank!;
    set({ bank: { ...bank, skills: bank.skills.filter((s) => s.id !== id) } });
    const { active } = get();
    if (active) {
      const newActive = { ...active, skills: active.skills.filter((e) => e.id !== id) };
      set({ active: newActive });
    }
    get().refreshPreview();
  },

  async updateSummary(summary) {
    await api.updateSummary(summary);
    const bank = get().bank!;
    set({ bank: { ...bank, summary } });
    get().refreshPreview();
  },

  async updateInterests(interests) {
    await api.updateInterests(interests);
    const bank = get().bank!;
    set({ bank: { ...bank, interests } });
    get().refreshPreview();
  },

  async updatePersonal(personal) {
    await api.updatePersonal(personal);
    const bank = get().bank!;
    set({ bank: { ...bank, personal } });
    get().refreshPreview();
  },

  setSettings(s) {
    set({ settings: s });
  },
}));
