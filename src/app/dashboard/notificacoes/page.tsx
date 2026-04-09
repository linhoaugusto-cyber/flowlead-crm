import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BellOff, UserPlus, AlertTriangle, Flame, CheckCircle, RefreshCw, TrendingDown, Info } from "lucide-react";
import { TipoNotificacao } from "@prisma/client";
import { MarcarLidasButton } from "./marcar-lidas-button";

const TIPO_CONFIG: Record<
  TipoNotificacao,
  { label: string; icon: React.ElementType; cls: string }
> = {
  LEAD_NOVO:             { label: "Novo lead",           icon: UserPlus,      cls: "bg-blue-50 text-blue-600"   },
  LEAD_SEM_CONTATO:      { label: "Sem contato",         icon: AlertTriangle, cls: "bg-yellow-50 text-yellow-600"},
  FOLLOW_UP_VENCIDO:     { label: "Follow-up vencido",   icon: AlertTriangle, cls: "bg-orange-50 text-orange-600"},
  LEAD_QUENTE_PARADO:    { label: "Lead quente parado",  icon: Flame,         cls: "bg-red-50 text-red-600"     },
  PROPOSTA_SEM_RETORNO:  { label: "Proposta sem retorno",icon: Info,          cls: "bg-violet-50 text-violet-600"},
  ESCALONAMENTO_GERENTE: { label: "Escalonamento",       icon: AlertTriangle, cls: "bg-red-50 text-red-600"     },
  LEAD_REATIVADO:        { label: "Lead reativado",      icon: RefreshCw,     cls: "bg-purple-50 text-purple-600"},
  VENDEDOR_ACUMULO:      { label: "Acúmulo de leads",    icon: AlertTriangle, cls: "bg-orange-50 text-orange-600"},
  RESUMO_DIARIO:         { label: "Resumo diário",       icon: Info,          cls: "bg-slate-100 text-slate-500" },
  LEAD_FECHADO:          { label: "Lead fechado",        icon: CheckCircle,   cls: "bg-green-50 text-green-600" },
  LEAD_PERDIDO:          { label: "Lead perdido",        icon: TrendingDown,  cls: "bg-gray-100 text-gray-500"  },
  SCORE_REBAIXADO:       { label: "Score rebaixado",     icon: TrendingDown,  cls: "bg-yellow-50 text-yellow-600"},
  SLA_VIOLADO:           { label: "SLA violado",         icon: AlertTriangle, cls: "bg-red-50 text-red-600"     },
};

function formatarData(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);

  if (d > 0)   return `${d}d atrás`;
  if (h > 0)   return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "Agora";
}

export default async function NotificacoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const notificacoes = await prisma.notificacao.findMany({
    where:   { usuarioId: session.user.id },
    orderBy: { enviadaEm: "desc" },
    take:    50,
    select: {
      id:       true,
      tipo:     true,
      mensagem: true,
      lida:     true,
      enviadaEm:true,
      lead:     { select: { id: true, nome: true } },
    },
  });

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notificações</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {naoLidas > 0
              ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`
              : "Todas lidas"}
          </p>
        </div>
        {naoLidas > 0 && (
          <MarcarLidasButton usuarioId={session.user.id} />
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BellOff className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma notificação ainda.</p>
            <p className="text-sm text-slate-400 mt-1">
              Alertas de leads e follow-ups aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notificacoes.map((n) => {
              const cfg  = TIPO_CONFIG[n.tipo];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    !n.lida ? "bg-blue-50/40" : "hover:bg-slate-50"
                  }`}
                >
                  {/* Ícone */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {cfg.label}
                        </span>
                        {n.lead && (
                          <span className="ml-2 text-xs text-blue-600 font-medium">
                            {n.lead.nome}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.lida && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatarData(n.enviadaEm)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{n.mensagem}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {notificacoes.length === 50 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 text-center">
              Exibindo as 50 notificações mais recentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
