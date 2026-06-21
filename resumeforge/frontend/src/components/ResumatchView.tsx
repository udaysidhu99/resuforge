import { useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { api, MatchResult } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";
import { resolveProvider } from "../api/resolveProvider";

const VERDICT_CONFIG = {
  apply: {
    label: "Strong Match — Apply",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800",
    scoreBg: "bg-green-600",
  },
  cautious: {
    label: "Cautious — Apply with Care",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    scoreBg: "bg-amber-500",
  },
  skip: {
    label: "Poor Fit — Skip",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    scoreBg: "bg-red-500",
  },
};

interface Props {
  jd: string;
  setJd: (v: string) => void;
  result: MatchResult | null;
  setResult: (v: MatchResult | null) => void;
}

export function ResumatchView({ jd, setJd, result, setResult }: Props) {
  const { settings } = useResumeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyse = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { provider, model } = resolveProvider(settings);
      const res = await api.aiMatch(provider, model, jd);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setJd("");
    setError("");
  };

  const cfg = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Sparkles size={16} className="text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Resumatch</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Paste a job description to see how well your current resume fits — and exactly what to change.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <label className="text-sm font-semibold text-gray-700 block">Job Description</label>
          <textarea
            className="input w-full resize-none text-sm"
            rows={10}
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyse();
            }}
          />
          <p className="text-xs text-gray-400">⌘ Enter to analyse</p>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            {result && (
              <button className="btn-secondary flex items-center gap-1.5" onClick={reset}>
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <button
              className="btn-primary flex items-center gap-2 px-5"
              onClick={analyse}
              disabled={loading || !jd.trim()}
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Analyse
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && cfg && (
          <div className="space-y-4">

            {/* Verdict banner */}
            <div className={`rounded-xl border ${cfg.bg} ${cfg.border} p-5 flex items-center justify-between`}>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${cfg.badge} mb-2`}>
                  {cfg.label}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.scoreBg} transition-all duration-700`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{result.score}<span className="text-sm font-normal text-gray-500"> / 100</span></span>
                </div>
              </div>
            </div>

            {/* Four insight cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Gaps */}
              <InsightCard
                title="Gaps"
                subtitle="Hard requirements you're missing"
                items={result.gaps}
                dotColor="bg-red-400"
                headerColor="text-red-700"
                borderColor="border-red-100"
                bgColor="bg-red-50"
              />

              {/* Concerns */}
              <InsightCard
                title="Concerns"
                subtitle="Soft risks worth knowing"
                items={result.concerns ?? []}
                dotColor="bg-amber-400"
                headerColor="text-amber-700"
                borderColor="border-amber-100"
                bgColor="bg-amber-50"
              />

              {/* Remove */}
              <InsightCard
                title="Remove"
                subtitle="Weakens this application"
                items={result.remove}
                dotColor="bg-gray-400"
                headerColor="text-gray-600"
                borderColor="border-gray-200"
                bgColor="bg-gray-50"
              />

              {/* Add */}
              <InsightCard
                title="Add / Emphasise"
                subtitle="Strengthen your application"
                items={result.add}
                dotColor="bg-green-500"
                headerColor="text-green-700"
                borderColor="border-green-100"
                bgColor="bg-green-50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  items,
  dotColor,
  headerColor,
  borderColor,
  bgColor,
}: {
  title: string;
  subtitle: string;
  items: string[];
  dotColor: string;
  headerColor: string;
  borderColor: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <p className={`text-sm font-semibold ${headerColor} mb-0.5`}>{title}</p>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            {item}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-gray-400 italic">None identified</li>
        )}
      </ul>
    </div>
  );
}
