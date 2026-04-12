"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, MessageSquare, Mail, StickyNote, Loader2, Plus, X } from "lucide-react";

type TipoInteracao = "LIGACAO" | "WHATSAPP" | "EMAIL" | "OBSERVACAO";

const TIPOS = [
  { value: "LIGACAO",    label: "Ligação",    icon: PhoneCall,     cls: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"   },
  { value: "WHATSAPP",  label: "WhatsApp",   icon: MessageSquare, cls: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"},
  { value: "EMAIL",     label: "E-mail",     icon: Mail,          cls: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"},
  { value: "OBSERVACAO",label: "Observação", icon: StickyNote,    cls: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100" },
] as const;

export function RegistrarInteracao({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [tipo, setTipo]         = useState<TipoInteracao>("LIGACAO");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar() {
    if (!descricao.trim()) { setErro("Descreva a interação."); return; }
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/historico`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tipo, descricao: descricao.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao salvar."); return; }
      setDescricao("");
      setOpen(false);
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
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Registrar Interação
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Registrar Interação</h2>
              <button onClick={() => { setOpen(false); setErro(null); setDescricao(""); }}
                className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(({ value, label, icon: Icon, cls }) => (
                  <button
                    key={value}
                    onClick={() => setTipo(value as TipoInteracao)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      tipo === value ? cls + " ring-2 ring-offset-1 ring-current" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  O que aconteceu? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder={
                    tipo === "LIGACAO"    ? "Ex: Cliente atendeu, demonstrou interesse em consórcio de 60k..." :
                    tipo === "WHATSAPP"   ? "Ex: Enviei simulação pelo WhatsApp, aguardando retorno..." :
                    tipo === "EMAIL"      ? "Ex: Enviei proposta formal por e-mail..." :
                    "Ex: Cliente prefere ser contatado às 18h..."
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none transition-colors bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                />
                {erro && <p className="text-xs text-red-500">{erro}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setOpen(false); setErro(null); setDescricao(""); }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
