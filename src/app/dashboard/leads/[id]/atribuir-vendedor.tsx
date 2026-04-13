"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

type Vendedor = { id: string; nome: string };

export function AtribuirVendedor({
  leadId,
  responsavelId,
  vendedores,
}: {
  leadId:        string;
  responsavelId: string | null;
  vendedores:    Vendedor[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value;
    const novoId = valor === "" ? null : valor;
    if (novoId === responsavelId) return;
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ responsavelId: novoId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        defaultValue={responsavelId ?? ""}
        onChange={onChange}
        disabled={loading}
        className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors disabled:opacity-60 cursor-pointer max-w-[180px]"
      >
        <option value="">Sem responsável</option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id}>{v.nome}</option>
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
