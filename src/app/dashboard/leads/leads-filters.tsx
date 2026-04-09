"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "",                      label: "Todos os status"        },
  { value: "RECEBIDO",              label: "Recebido"               },
  { value: "AGUARDANDO_CONTATO",    label: "Aguardando Contato"     },
  { value: "EM_TENTATIVA",          label: "Em Tentativa"           },
  { value: "EM_QUALIFICACAO",       label: "Em Qualificação"        },
  { value: "SIMULACAO_ANDAMENTO",   label: "Simulação"              },
  { value: "PROPOSTA_ENVIADA",      label: "Proposta Enviada"       },
  { value: "AGUARDANDO_RETORNO",    label: "Aguardando Retorno"     },
  { value: "FOLLOW_UP_ATIVO",       label: "Follow-up Ativo"        },
  { value: "OPORTUNIDADE_QUENTE",   label: "Oportunidade Quente"    },
  { value: "NEGOCIACAO_AVANCADA",   label: "Negociação Avançada"    },
  { value: "FECHADO",               label: "Fechado"                },
  { value: "PERDIDO",               label: "Perdido"                },
  { value: "REATIVACAO_FUTURA",     label: "Reativação Futura"      },
];

export function LeadsFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const current      = searchParams.get("status") ?? "";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/dashboard/leads?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 cursor-pointer"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
