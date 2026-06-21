import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { Personal, PersonalField } from "../api/client";

const FIXED_FIELDS: { key: keyof Omit<Personal, "photo" | "extra">; label: string; required?: boolean }[] = [
  { key: "name",     label: "Full Name",    required: true },
  { key: "phone",    label: "Phone" },
  { key: "email",    label: "Email" },
  { key: "address",  label: "Address" },
  { key: "dob",      label: "Date of Birth" },
  { key: "linkedin", label: "LinkedIn" },
];

type DraftPersonal = Omit<Personal, "photo">;

export function PersonalCard() {
  const { bank, updatePersonal, showToast } = useResumeStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftPersonal>({
    name: "", phone: "", email: "", address: "", dob: "", linkedin: "", extra: [],
  });
  const [newFieldLabel, setNewFieldLabel] = useState("");

  if (!bank) return null;
  const p = bank.personal;
  const isEmpty = !p.name && !p.email && !p.phone;

  const startEdit = () => {
    setDraft({
      name: p.name, phone: p.phone, email: p.email,
      address: p.address, dob: p.dob, linkedin: p.linkedin,
      extra: p.extra ? [...p.extra.map(f => ({ ...f }))] : [],
    });
    setNewFieldLabel("");
    setEditing(true);
  };

  const set = (key: keyof DraftPersonal, value: unknown) =>
    setDraft(d => ({ ...d, [key]: value }));

  const setExtra = (i: number, value: string) =>
    setDraft(d => {
      const extra = [...(d.extra ?? [])];
      extra[i] = { ...extra[i], value };
      return { ...d, extra };
    });

  const addField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    setDraft(d => ({ ...d, extra: [...(d.extra ?? []), { label, value: "" }] }));
    setNewFieldLabel("");
  };

  const removeField = (i: number) =>
    setDraft(d => ({ ...d, extra: (d.extra ?? []).filter((_, j) => j !== i) }));

  const save = async () => {
    if (!draft.name.trim()) { showToast("Name is required", "error"); return; }
    await updatePersonal({ ...draft, photo: p.photo, extra: draft.extra?.filter(f => f.label) });
    setEditing(false);
    showToast("Personal info saved");
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Personal Info</span>
        {!editing && (
          <button className="btn-secondary text-xs py-1" onClick={startEdit}>Edit</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {/* Fixed fields */}
          {FIXED_FIELDS.map(({ key, label, required }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-0.5 block">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                className="input text-sm w-full"
                value={(draft[key] as string) ?? ""}
                onChange={e => set(key, e.target.value)}
                placeholder={required ? label : `${label} (optional)`}
                autoFocus={key === "name"}
              />
            </div>
          ))}

          {/* Extra fields */}
          {(draft.extra ?? []).length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-500">Additional fields</p>
              {(draft.extra ?? []).map((field, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0 font-medium">{field.label}</span>
                  <input
                    className="input text-sm flex-1"
                    value={field.value}
                    onChange={e => setExtra(i, e.target.value)}
                    placeholder={`${field.label} value`}
                  />
                  <button
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"
                    onClick={() => removeField(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add custom field */}
          <div className="flex gap-2 items-center pt-1">
            <input
              className="input text-sm flex-1"
              placeholder="New field label (e.g. GitHub, Website…)"
              value={newFieldLabel}
              onChange={e => setNewFieldLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addField())}
            />
            <button
              className="btn-secondary flex items-center gap-1 text-xs flex-shrink-0"
              onClick={addField}
              disabled={!newFieldLabel.trim()}
            >
              <Plus size={12} /> Add field
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="btn-primary text-sm" onClick={save}>Save</button>
            <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-gray-400 italic cursor-pointer hover:text-gray-600" onClick={startEdit}>
          No personal info yet — click Edit to add your name, contact details, etc.
        </p>
      ) : (
        <div className="space-y-0.5 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1" onClick={startEdit}>
          {p.name     && <p className="text-sm font-semibold text-gray-800">{p.name}</p>}
          {p.email    && <p className="text-xs text-gray-500">{p.email}</p>}
          {p.phone    && <p className="text-xs text-gray-500">{p.phone}</p>}
          {p.address  && <p className="text-xs text-gray-500">{p.address}</p>}
          {p.dob      && <p className="text-xs text-gray-500">DOB: {p.dob}</p>}
          {p.linkedin && <p className="text-xs text-gray-500">{p.linkedin}</p>}
          {(p.extra ?? []).filter(f => f.value).map((f, i) => (
            <p key={i} className="text-xs text-gray-500">{f.label}: {f.value}</p>
          ))}
        </div>
      )}
    </div>
  );
}
