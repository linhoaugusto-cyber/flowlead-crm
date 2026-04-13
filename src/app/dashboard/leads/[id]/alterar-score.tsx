"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

const SCORE_OPCOES = [
  { value: "FRIO",    label: "Frio",    cls: "text-slate-600"  },
  { value: "MORNO",   label: "Morno",   cls: "text-yellow-700" },
  { value: "QUENTE",  label: "Quente",  cls: "text-orange-700" },
  { value: "CRITICO", label: "Crítico", cls: "text-red-700"    },
] as const;

export function AlterarScore({ leadId, scoreAtual }: { leadId: string; scoreAtual: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoScore = e.target.value;
    if (novoScore === scoreAtual) return;
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ score: novoScore }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        defaultValue={scoreAtual}
        onChange={onChange}
        disabled={loading}
        className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {SCORE_OPCOES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        {loading
          ? <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          : <ChevronDown className="w-3 h-3 text-slate-400" />
        }
      </div>
    </div>
  );
}
