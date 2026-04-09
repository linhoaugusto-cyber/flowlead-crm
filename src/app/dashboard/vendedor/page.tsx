import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  UserPlus,
  AlertTriangle,
  Flame,
  CalendarClock,
  PhoneCall,
  MessageSquare,
  Clock,
} from "lucide-react";
import { ScoreLead, StatusLead, TipoHistorico } from "@prisma/client";

// ── Helpers ──────────────────────────────────────────────────

function formatarData(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function tempoAtras(date: Date | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  return "Agora";
}

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string }> = {
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600" },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700" },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700" },
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold" },
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

const TIPO_ICONE: Partial<Record<TipoHistorico, React.ElementType>> = {
  LIGACAO:   PhoneCall,
  WHATSAPP:  MessageSquare,
  EMAIL:     MessageSquare,
  SISTEMA:   Clock,
};

// ── Componente ───────────────────────────────────────────────

export default async function VendedorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId   = session.user.id;
  const agora = new Date();
  const em24h = new Date(agora.getTime() + 24 * 3_600_000);

  const [
    leadsNovos,
    followupsVencidos,
    leadsQuentes,
    proximasAcoes,
    leadsRecentes,
    ultimasInteracoes,
  ] = await Promise.all([
    // Leads sem contato ainda
    prisma.lead.count({
      where: {
        responsavelId: userId,
        status: { in: ["RECEBIDO", "AGUARDANDO_ATRIBUICAO", "AGUARDANDO_CONTATO"] },
      },
    }),
    // Follow-ups vencidos
    prisma.tarefa.count({
      where: { usuarioId: userId, status: "VENCIDA" },
    }),
    // Leads quentes/críticos ativos
    prisma.lead.count({
      where: {
        responsavelId: userId,
        score:  { in: ["QUENTE", "CRITICO"] },
        status: { notIn: ["FECHADO", "PERDIDO"] },
      },
    }),
    // Próximas ações nas próximas 24h
    prisma.tarefa.count({
      where: {
        usuarioId: userId,
        status:    "PENDENTE",
        prazo:     { gte: agora, lte: em24h },
      },
    }),
    // Leads prioritários (quentes/críticos primeiro)
    prisma.lead.findMany({
      where: {
        responsavelId: userId,
        status:        { notIn: ["FECHADO", "PERDIDO"] },
      },
      orderBy: [{ score: "desc" }, { dataUltimaInteracao: "asc" }],
      take: 8,
      select: {
        id:                  true,
        nome:                true,
        telefone:            true,
        score:               true,
        status:              true,
        dataUltimaInteracao: true,
        criadoEm:            true,
        canalOrigem:         { select: { nome: true } },
      },
    }),
    // Últimas interações da carteira
    prisma.historico.findMany({
      where: {
        lead: { responsavelId: userId },
        tipo: { in: ["LIGACAO", "WHATSAPP", "EMAIL"] },
      },
      orderBy: { criadoEm: "desc" },
      take: 5,
      select: {
        id:       true,
        tipo:     true,
        descricao:true,
        criadoEm: true,
        lead:     { select: { id: true, nome: true } },
      },
    }),
  ]);

  const primeiroNome = session.user.name?.split(" ")[0] ?? "Vendedor";
  const horaAtual = agora.getHours();
  const saudacao =
    horaAtual < 12 ? "Bom dia" : horaAtual < 18 ? "Boa tarde" : "Boa noite";

  const cards = [
    {
      label:  "Leads Novos",
      value:  leadsNovos,
      icon:   UserPlus,
      color:  "blue",
      desc:   "Aguardando primeiro contato",
    },
    {
      label:  "Follow-ups Vencidos",
      value:  followupsVencidos,
      icon:   AlertTriangle,
      color:  followupsVencidos > 0 ? "red" : "green",
      desc:   followupsVencidos > 0 ? "Ação imediata necessária" : "Tudo em dia",
    },
    {
      label:  "Leads Quentes",
      value:  leadsQuentes,
      icon:   Flame,
      color:  "orange",
      desc:   "Score quente ou crítico",
    },
    {
      label:  "Próximas Ações",
      value:  proximasAcoes,
      icon:   CalendarClock,
      color:  "purple",
      desc:   "Agendadas para as próximas 24h",
    },
  ] as const;

  const colorMap = {
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-600",   num: "text-blue-700"   },
    red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-600",     num: "text-red-700"    },
    green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-600", num: "text-green-700"  },
    orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600",num: "text-orange-700"},
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600",num: "text-purple-700"},
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {saudacao}, {primeiroNome}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long", day: "numeric", month: "long",
            }).format(agora)}
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
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

      {/* Leads prioritários + Últimas interações */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Leads */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Leads Prioritários</h2>
            <span className="text-xs text-slate-400">{leadsRecentes.length} leads</span>
          </div>

          {leadsRecentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum lead na carteira ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Os leads atribuídos a você aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {leadsRecentes.map((lead) => {
                const score = SCORE_CONFIG[lead.score];
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-600 text-xs font-bold">
                        {lead.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{lead.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{lead.telefone}</p>
                    </div>

                    {/* Score */}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${score.cls}`}>
                      {score.label}
                    </span>

                    {/* Status */}
                    <span className="hidden sm:block text-xs text-slate-500 flex-shrink-0 max-w-[100px] truncate">
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </span>

                    {/* Último contato */}
                    <span className="hidden md:block text-xs text-slate-400 flex-shrink-0 w-20 text-right">
                      {tempoAtras(lead.dataUltimaInteracao)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimas interações */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Últimas Interações</h2>
          </div>

          {ultimasInteracoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhuma interação ainda.</p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {ultimasInteracoes.map((h) => {
                const Icon = TIPO_ICONE[h.tipo] ?? MessageSquare;
                return (
                  <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{h.lead.nome}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{h.descricao}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatarData(h.criadoEm)}</p>
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
