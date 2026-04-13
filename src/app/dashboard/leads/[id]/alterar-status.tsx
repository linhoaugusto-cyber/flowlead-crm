"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

const STATUS_OPCOES = [
  { value: "RECEBIDO",              label: "Recebido"           },
  { value: "AGUARDANDO_ATRIBUICAO", label: "Ag. Atribuição"     },
  { value: "AGUARDANDO_CONTATO",    label: "Ag. Contato"        },
  { value: "EM_TENTATIVA",          label: "Em Tentativa"       },
  { value: "EM_QUALIFICACAO",       label: "Em Qualificação"    },
  { value: "SIMULACAO_ANDAMENTO",   label: "Simulação"          },
  { value: "PROPOSTA_ENVIADA",      label: "Proposta Enviada"   },
  { value: "AGUARDANDO_RETORNO",    label: "Ag. Retorno"        },
  { value: "FOLLOW_UP_ATIVO",       label: "Follow-up Ativo"    },
  { value: "OPORTUNIDADE_QUENTE",   label: "Oportunidade Quente"},
  { value: "NEGOCIACAO_AVANCADA",   label: "Negociação Avançada"},
  { value: "FECHADO",               label: "Fechado"            },
  { value: "PERDIDO",               label: "Perdido"            },
  { value: "REATIVACAO_FUTURA",     label: "Reativação Futura"  },
] as const;

export function AlterarStatus({ leadId, statusAtual }: { leadId: string; statusAtual: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoStatus = e.target.value;
    if (novoStatus === statusAtual) return;
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: novoStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        defaultValue={statusAtual}
        onChange={onChange}
        disabled={loading}
        className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {STATUS_OPCOES.map((s) => (
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
