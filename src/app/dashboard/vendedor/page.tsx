import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  UserPlus, AlertTriangle, Flame, CalendarClock,
  PhoneCall, MessageSquare, Clock, ChevronRight,
} from "lucide-react";
import { ScoreLead, StatusLead } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SCORE_ORDER: Record<ScoreLead, number> = {
  CRITICO: 0, QUENTE: 1, MORNO: 2, FRIO: 3,
};

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string; dot: string }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold",    dot: "bg-red-500"    },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700",            dot: "bg-orange-400" },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700",            dot: "bg-yellow-400" },
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600",              dot: "bg-slate-300"  },
};

const STATUS_LABEL: Partial<Record<StatusLead, string>> = {
  RECEBIDO:              "Recebido",
  AGUARDANDO_ATRIBUICAO: "Ag. Atribuição",
  AGUARDANDO_CONTATO:    "Ag. Contato",
  EM_TENTATIVA:          "Em Tentativa",
  EM_QUALIFICACAO:       "Em Qualificação",
  SIMULACAO_ANDAMENTO:   "Simulação",
  PROPOSTA_ENVIADA:      "Proposta Enviada",
  AGUARDANDO_RETORNO:    "Ag. Retorno",
  FOLLOW_UP_ATIVO:       "Follow-up",
  OPORTUNIDADE_QUENTE:   "Oportunidade",
  NEGOCIACAO_AVANCADA:   "Negociação",
};

function acaoSugerida(lead: {
  score: ScoreLead;
  status: StatusLead;
  dataUltimaInteracao: Date | null;
}): string {
  const diasSemContato = lead.dataUltimaInteracao
    ? Math.floor((Date.now() - new Date(lead.dataUltimaInteracao).getTime()) / 86_400_000)
    : 999;

  if (lead.score === "CRITICO")                                        return "Ligar agora — lead crítico";
  if (lead.status === "PROPOSTA_ENVIADA")                              return "Cobrar retorno da proposta";
  if (lead.status === "AGUARDANDO_RETORNO")                            return "Enviar mensagem de follow-up";
  if (["AGUARDANDO_CONTATO", "RECEBIDO"].includes(lead.status))        return "Realizar primeiro contato";
  if (lead.score === "QUENTE" && diasSemContato >= 2)                  return "Retomar contato — lead quente parado";
  if (diasSemContato >= 5)   return `Reativar lead — sem interação há ${diasSemContato}d`;
  return "Agendar próximo follow-up";
}

function tempoAtras(date: Date | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  return "Agora";
}

export default async function VendedorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;
  const agora  = new Date();
  const em24h  = new Date(agora.getTime() + 24 * 3_600_000);

  const [
    totalNovos,
    totalFollowupsVencidos,
    totalQuentes,
    totalProximas,
    leads,
    followupsVencidos,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        responsavelId: userId,
        status: { in: ["RECEBIDO", "AGUARDANDO_ATRIBUICAO", "AGUARDANDO_CONTATO"] },
      },
    }),
    prisma.tarefa.count({ where: { usuarioId: userId, status: "VENCIDA" } }),
    prisma.lead.count({
      where: {
        responsavelId: userId,
        score:  { in: ["QUENTE", "CRITICO"] },
        status: { notIn: ["FECHADO", "PERDIDO"] },
      },
    }),
    prisma.tarefa.count({
      where: { usuarioId: userId, status: "PENDENTE", prazo: { gte: agora, lte: em24h } },
    }),
    prisma.lead.findMany({
      where: { responsavelId: userId, status: { notIn: ["FECHADO", "PERDIDO"] } },
      orderBy: [{ score: "desc" }, { dataUltimaInteracao: "asc" }],
      take: 20,
      select: {
        id:                  true,
        nome:                true,
        telefone:            true,
        score:               true,
        status:              true,
        dataUltimaInteracao: true,
        tarefas: {
          where:  { status: "VENCIDA" },
          select: { id: true },
          take:   1,
        },
      },
    }),
    prisma.tarefa.findMany({
      where: { usuarioId: userId, status: "VENCIDA" },
      orderBy: { prazo: "asc" },
      take: 6,
      select: {
        id:    true,
        titulo:true,
        prazo: true,
        lead:  { select: { id: true, nome: true, telefone: true, score: true } },
      },
    }),
  ]);

  const leadsOrdenados = [...leads].sort((a, b) => {
    const sd = SCORE_ORDER[a.score] - SCORE_ORDER[b.score];
    if (sd !== 0) return sd;
    const aT = a.dataUltimaInteracao ? new Date(a.dataUltimaInteracao).getTime() : 0;
    const bT = b.dataUltimaInteracao ? new Date(b.dataUltimaInteracao).getTime() : 0;
    return aT - bT;
  });

  const primeiroNome = session.user.name?.split(" ")[0] ?? "Vendedor";
  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const cards = [
    { label: "Leads Novos",           value: totalNovos,             icon: UserPlus,      color: "blue",   desc: "Aguardando primeiro contato" },
    { label: "Follow-ups Vencidos",   value: totalFollowupsVencidos, icon: AlertTriangle, color: totalFollowupsVencidos > 0 ? "red" : "green", desc: totalFollowupsVencidos > 0 ? "Ação imediata" : "Tudo em dia" },
    { label: "Leads Quentes",         value: totalQuentes,           icon: Flame,         color: "orange", desc: "Score quente ou crítico" },
    { label: "Ações nas próximas 24h",value: totalProximas,          icon: CalendarClock, color: "purple", desc: "Follow-ups agendados" },
  ] as const;

  const colorMap = {
    blue:   { icon: "bg-blue-100 text-blue-600",    num: "text-blue-700"   },
    red:    { icon: "bg-red-100 text-red-600",      num: "text-red-700"    },
    green:  { icon: "bg-green-100 text-green-600",  num: "text-green-700"  },
    orange: { icon: "bg-orange-100 text-orange-600",num: "text-orange-700" },
    purple: { icon: "bg-purple-100 text-purple-600",num: "text-purple-700" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{saudacao}, {primeiroNome}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(agora)}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, desc }) => {
          const c = colorMap[color];
          return (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${c.num}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Leads prioritários */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Minha Carteira</h2>
            <Link href="/dashboard/leads" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {leadsOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <UserPlus className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum lead na carteira.</p>
              <p className="text-xs text-slate-400 mt-1">Os leads atribuídos a você aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {leadsOrdenados.map((lead) => {
                const sc        = SCORE_CONFIG[lead.score];
                const acao      = acaoSugerida(lead);
                const temVencido = lead.tarefas.length > 0;

                return (
                  <div key={lead.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sc.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{lead.nome}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                        {temVencido && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Vencido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.telefone} · {STATUS_LABEL[lead.status] ?? lead.status}</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">{acao}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{tempoAtras(lead.dataUltimaInteracao)}</span>
                      <div className="flex gap-1">
                        <a
                          href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-6 h-6 bg-green-50 hover:bg-green-100 rounded-md flex items-center justify-center transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-green-600" />
                        </a>
                        <a
                          href={`tel:${lead.telefone}`}
                          className="w-6 h-6 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center justify-center transition-colors"
                        >
                          <PhoneCall className="w-3 h-3 text-blue-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Follow-ups vencidos */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-slate-900">Follow-ups Vencidos</h2>
            {totalFollowupsVencidos > 0 && (
              <span className="ml-auto text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                {totalFollowupsVencidos}
              </span>
            )}
          </div>

          {followupsVencidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Clock className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum follow-up vencido.</p>
              <p className="text-xs text-green-600 mt-1 font-medium">Continue assim!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {followupsVencidos.map((t) => {
                const diasAtraso = Math.floor(
                  (Date.now() - new Date(t.prazo).getTime()) / 86_400_000
                );
                const leadSc = t.lead ? SCORE_CONFIG[t.lead.score as ScoreLead] : null;

                return (
                  <div key={t.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{t.lead?.nome ?? "—"}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{t.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-red-600 font-medium">
                            {diasAtraso === 0 ? "Venceu hoje" : `${diasAtraso}d de atraso`}
                          </span>
                          {leadSc && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${leadSc.cls}`}>
                              {leadSc.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <a
                          href={`https://wa.me/55${t.lead?.telefone?.replace(/\D/g, "") ?? ""}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                        </a>
                        <a
                          href={`tel:${t.lead?.telefone ?? ""}`}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
