"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, X, AlertTriangle } from "lucide-react";

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

type Motivo = { id: string; descricao: string };

export function AlterarStatus({
  leadId,
  statusAtual,
  motivos,
}: {
  leadId:    string;
  statusAtual: string;
  motivos:   Motivo[];
}) {
  const router  = useRouter();
  const [loading,    setLoading]    = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [motivoId,   setMotivoId]   = useState("");
  const [erro,       setErro]       = useState<string | null>(null);
  // valor pendente quando o usuário seleciona PERDIDO
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  async function submeter(novoStatus: string, motivo: string | null) {
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          status: novoStatus,
          ...(motivo ? { motivoPerdaId: motivo } : {}),
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoStatus = e.target.value;
    if (novoStatus === statusAtual) return;

    if (novoStatus === "PERDIDO") {
      setPendingStatus(novoStatus);
      setMotivoId(motivos[0]?.id ?? "");
      setErro(null);
      setModalOpen(true);
      return;
    }

    await submeter(novoStatus, null);
  }

  async function confirmarPerda() {
    if (!motivoId) { setErro("Selecione um motivo."); return; }
    setModalOpen(false);
    await submeter("PERDIDO", motivoId);
    setPendingStatus(null);
  }

  function cancelarModal() {
    setModalOpen(false);
    setPendingStatus(null);
    setErro(null);
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        <select
          // Usa key para forçar reset do select quando o modal é cancelado
          key={pendingStatus ?? statusAtual}
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

      {/* Modal de motivo de perda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-base font-semibold text-slate-900">Motivo de Perda</h2>
              </div>
              <button onClick={cancelarModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Selecione o motivo pelo qual este lead foi marcado como <strong>Perdido</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Motivo <span className="text-red-400">*</span>
                </label>
                <select
                  value={motivoId}
                  onChange={(e) => { setMotivoId(e.target.value); setErro(null); }}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {motivos.map((m) => (
                    <option key={m.id} value={m.id}>{m.descricao}</option>
                  ))}
                </select>
                {erro && <p className="text-xs text-red-500">{erro}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={cancelarModal}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPerda}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                    : "Confirmar Perda"
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
