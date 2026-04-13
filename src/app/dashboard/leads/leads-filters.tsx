"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { useCallback, useRef } from "react";

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
  const currentStatus = searchParams.get("status") ?? "";
  const currentQ      = searchParams.get("q") ?? "";
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params.toString();
  }

  function onStatusChange(value: string) {
    router.push(`/dashboard/leads?${buildParams({ status: value })}`);
  }

  const onSearch = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.push(`/dashboard/leads?${buildParams({ q: value })}`);
    }, 350);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearSearch() {
    router.push(`/dashboard/leads?${buildParams({ q: "" })}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap flex-1">
      {/* Busca */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          defaultValue={currentQ}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors"
        />
        {currentQ && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtro de status */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <select
          value={currentStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
