"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";

type TipoTarefa =
  | "PRIMEIRO_CONTATO"
  | "FOLLOW_UP"
  | "ENVIAR_SIMULACAO"
  | "COBRAR_RETORNO"
  | "AGENDAR_REUNIAO"
  | "REATIVAR"
  | "ENCERRAR"
  | "QUALIFICAR";

const TIPOS: { value: TipoTarefa; label: string }[] = [
  { value: "PRIMEIRO_CONTATO",  label: "Primeiro Contato"  },
  { value: "FOLLOW_UP",         label: "Follow-up"         },
  { value: "ENVIAR_SIMULACAO",  label: "Enviar Simulação"  },
  { value: "COBRAR_RETORNO",    label: "Cobrar Retorno"    },
  { value: "AGENDAR_REUNIAO",   label: "Agendar Reunião"   },
  { value: "REATIVAR",          label: "Reativar Lead"     },
  { value: "QUALIFICAR",        label: "Qualificar"        },
  { value: "ENCERRAR",          label: "Encerrar"          },
];

function prazoMinimo() {
  // Returns datetime-local value for "now + 5min" as minimum
  const d = new Date(Date.now() + 5 * 60_000);
  return d.toISOString().slice(0, 16);
}

export function AgendarTarefa({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [tipo, setTipo]           = useState<TipoTarefa>("FOLLOW_UP");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState<string | null>(null);

  function fechar() {
    setOpen(false);
    setErro(null);
    setDescricao("");
    setPrazo("");
    setTipo("FOLLOW_UP");
  }

  async function salvar() {
    if (!descricao.trim()) { setErro("Descreva a tarefa."); return; }
    if (!prazo)            { setErro("Informe o prazo.");   return; }

    const prazoDate = new Date(prazo);
    if (prazoDate <= new Date()) { setErro("O prazo deve ser uma data futura."); return; }

    setErro(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/tarefas`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          tipoAcao:  tipo,
          descricao: descricao.trim(),
          prazo:     prazoDate.toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao agendar."); return; }
      fechar();
      router.refresh();
    } catch {
      setErro("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        <CalendarClock className="w-4 h-4 text-slate-400" />
        Agendar Tarefa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Agendar Tarefa</h2>
              <button onClick={fechar} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Tipo de ação</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoTarefa)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors cursor-pointer"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Prazo */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Prazo <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={prazo}
                  min={prazoMinimo()}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Descrição <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Ex: Ligar para confirmar interesse na simulação enviada..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors resize-none"
                />
                {erro && <p className="text-xs text-red-500">{erro}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={fechar}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                    : <><Plus className="w-4 h-4" />Agendar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
