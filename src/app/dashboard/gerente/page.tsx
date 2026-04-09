import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Target,
  ArrowRight,
  Activity,
} from "lucide-react";
import { StatusLead } from "@prisma/client";

// ── Helpers ──────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusLead, string> = {
  RECEBIDO:              "Recebido",
  AGUARDANDO_ATRIBUICAO: "Ag. Atribuição",
  AGUARDANDO_CONTATO:    "Ag. Contato",
  EM_TENTATIVA:          "Em Tentativa",
  EM_QUALIFICACAO:       "Em Qualificação",
  SIMULACAO_ANDAMENTO:   "Simulação",
  PROPOSTA_ENVIADA:      "Proposta Enviada",
  AGUARDANDO_RETORNO:    "Ag. Retorno",
  FOLLOW_UP_ATIVO:       "Follow-up Ativo",
  OPORTUNIDADE_QUENTE:   "Oportunidade Quente",
  NEGOCIACAO_AVANCADA:   "Negociação",
  FECHADO:               "Fechado",
  PERDIDO:               "Perdido",
  REATIVACAO_FUTURA:     "Reativação Futura",
};

const STATUS_COLOR: Partial<Record<StatusLead, string>> = {
  RECEBIDO:              "bg-slate-200",
  AGUARDANDO_ATRIBUICAO: "bg-slate-300",
  AGUARDANDO_CONTATO:    "bg-blue-300",
  EM_TENTATIVA:          "bg-blue-400",
  EM_QUALIFICACAO:       "bg-indigo-400",
  SIMULACAO_ANDAMENTO:   "bg-violet-400",
  PROPOSTA_ENVIADA:      "bg-purple-400",
  AGUARDANDO_RETORNO:    "bg-orange-300",
  FOLLOW_UP_ATIVO:       "bg-orange-400",
  OPORTUNIDADE_QUENTE:   "bg-red-400",
  NEGOCIACAO_AVANCADA:   "bg-red-500",
};

const FUNIL_ORDEM: StatusLead[] = [
  "RECEBIDO",
  "AGUARDANDO_ATRIBUICAO",
  "AGUARDANDO_CONTATO",
  "EM_TENTATIVA",
  "EM_QUALIFICACAO",
  "SIMULACAO_ANDAMENTO",
  "PROPOSTA_ENVIADA",
  "AGUARDANDO_RETORNO",
  "FOLLOW_UP_ATIVO",
  "OPORTUNIDADE_QUENTE",
  "NEGOCIACAO_AVANCADA",
];

// ── Componente ───────────────────────────────────────────────

export default async function GerenteDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unidadeId = session.user.unidadeId;
  const agora     = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [
    leadsNoMes,
    leadsFechadosMes,
    leadsAtivos,
    followupsVencidosTotal,
    funnelRaw,
    vendedores,
    leadsQuentes,
  ] = await Promise.all([
    // Leads entrados no mês
    prisma.lead.count({
      where: { unidadeId, criadoEm: { gte: inicioMes } },
    }),
    // Fechados no mês
    prisma.lead.count({
      where: {
        unidadeId,
        status:        "FECHADO",
        dataFechamento: { gte: inicioMes },
      },
    }),
    // Leads ativos (não fechados nem perdidos)
    prisma.lead.count({
      where: {
        unidadeId,
        status: { notIn: ["FECHADO", "PERDIDO", "REATIVACAO_FUTURA"] },
      },
    }),
    // Follow-ups vencidos na unidade
    prisma.tarefa.count({
      where: {
        status: "VENCIDA",
        lead:   { unidadeId },
      },
    }),
    // Funil por etapa
    prisma.lead.groupBy({
      by:    ["status"],
      where: {
        unidadeId,
        status: { notIn: ["FECHADO", "PERDIDO", "REATIVACAO_FUTURA"] },
      },
      _count: { id: true },
    }),
    // Vendedores com suas carteiras
    prisma.usuario.findMany({
      where: {
        unidadeId,
        perfil: { in: ["VENDEDOR", "SDR"] },
        ativo:  true,
      },
      select: {
        id:   true,
        nome: true,
        perfil: true,
        _count: {
          select: {
            leadsResponsavel: {
              where: { status: { notIn: ["FECHADO", "PERDIDO"] } },
            },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
    // Leads quentes/críticos sem ação recente
    prisma.lead.count({
      where: {
        unidadeId,
        score:  { in: ["QUENTE", "CRITICO"] },
        status: { notIn: ["FECHADO", "PERDIDO"] },
      },
    }),
  ]);

  // Funil ordenado
  const funnelMap = new Map(funnelRaw.map((r) => [r.status, r._count.id]));
  const funnelOrdenado = FUNIL_ORDEM.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: funnelMap.get(status) ?? 0,
    color: STATUS_COLOR[status] ?? "bg-slate-200",
  })).filter((f) => f.count > 0);

  const maxFunnel = Math.max(...funnelOrdenado.map((f) => f.count), 1);

  const taxaConversao =
    leadsNoMes > 0 ? Math.round((leadsFechadosMes / leadsNoMes) * 100) : 0;

  const cards = [
    {
      label: "Leads no Mês",
      value: leadsNoMes,
      icon:  Users,
      color: "blue",
      desc:  "Entrados desde o início do mês",
    },
    {
      label: "Fechados",
      value: leadsFechadosMes,
      icon:  Target,
      color: "green",
      desc:  "Conversões no mês atual",
    },
    {
      label: "Taxa de Conversão",
      value: `${taxaConversao}%`,
      icon:  TrendingUp,
      color: taxaConversao >= 20 ? "green" : taxaConversao >= 10 ? "orange" : "red",
      desc:  "Fechados / leads do mês",
    },
    {
      label: "Follow-ups Vencidos",
      value: followupsVencidosTotal,
      icon:  AlertTriangle,
      color: followupsVencidosTotal > 0 ? "red" : "green",
      desc:  followupsVencidosTotal > 0 ? "Ação da equipe necessária" : "Equipe em dia",
    },
  ] as const;

  const colorMap = {
    blue:   { icon: "bg-blue-100 text-blue-600",    num: "text-blue-700"   },
    green:  { icon: "bg-green-100 text-green-600",  num: "text-green-700"  },
    orange: { icon: "bg-orange-100 text-orange-600",num: "text-orange-700" },
    red:    { icon: "bg-red-100 text-red-600",      num: "text-red-700"    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Painel Gerencial</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long", day: "numeric", month: "long",
            }).format(agora)}
          </p>
        </div>
        {leadsQuentes > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            {leadsQuentes} lead{leadsQuentes > 1 ? "s quentes" : " quente"} sem ação
          </div>
        )}
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

      {/* Funil + Vendedores */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Funil por etapa */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Funil por Etapa</h2>
            </div>
            <span className="text-xs text-slate-400">{leadsAtivos} leads ativos</span>
          </div>

          {funnelOrdenado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum lead no funil ainda.</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {funnelOrdenado.map(({ status, label, count, color }) => (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{label}</span>
                    <span className="text-xs font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${(count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendedores */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Equipe Comercial</h2>
          </div>

          {vendedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum vendedor cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {vendedores.map((v) => {
                const total      = v._count.leadsResponsavel;
                const temLeads   = total > 0;
                return (
                  <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-bold">
                        {v.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Nome */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.nome}</p>
                      <p className="text-xs text-slate-400">
                        {v.perfil === "SDR" ? "SDR" : "Vendedor"}
                      </p>
                    </div>

                    {/* Leads ativos */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${temLeads ? "text-slate-800" : "text-slate-400"}`}>
                        {total}
                      </p>
                      <p className="text-xs text-slate-400">leads</p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Taxa de conversão da equipe */}
          {vendedores.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Taxa de conversão do mês</span>
                <span className={`text-sm font-bold ${
                  taxaConversao >= 20 ? "text-green-600" :
                  taxaConversao >= 10 ? "text-orange-600" : "text-red-600"
                }`}>
                  {taxaConversao}%
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    taxaConversao >= 20 ? "bg-green-500" :
                    taxaConversao >= 10 ? "bg-orange-400" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(taxaConversao, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
