import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TrendingUp, Users, Clock, BarChart3, Target, Percent } from "lucide-react";

function ms(date: Date | null) {
  if (!date) return null;
  return new Date(date).getTime();
}

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unidadeId = session.user.unidadeId;
  const agora     = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const mes30d    = new Date(agora.getTime() - 30 * 24 * 3_600_000);

  const [
    totalLeads,
    leadsNoMes,
    leadsFechados,
    leadsFechadosMes,
    leadsComPrimContato,
    canaisData,
    motivosData,
  ] = await Promise.all([
    // Total histórico
    prisma.lead.count({ where: { unidadeId } }),

    // Entrados no mês
    prisma.lead.count({ where: { unidadeId, criadoEm: { gte: inicioMes } } }),

    // Total fechados
    prisma.lead.count({ where: { unidadeId, status: "FECHADO" } }),

    // Fechados no mês
    prisma.lead.count({
      where: { unidadeId, status: "FECHADO", dataFechamento: { gte: inicioMes } },
    }),

    // Leads com primeiro contato registrado (para calcular tempo médio)
    prisma.lead.findMany({
      where: {
        unidadeId,
        dataPrimeiroContato: { not: null },
        criadoEm:            { gte: mes30d },
      },
      select: { criadoEm: true, dataPrimeiroContato: true },
      take: 200,
    }),

    // Leads agrupados por canal
    prisma.lead.groupBy({
      by:     ["canalOrigemId"],
      where:  { unidadeId },
      _count: { id: true },
      orderBy:{ _count: { id: "desc" } },
    }),

    // Motivos de perda
    prisma.lead.groupBy({
      by:     ["motivoPerdaId"],
      where:  { unidadeId, status: "PERDIDO", motivoPerdaId: { not: null } },
      _count: { id: true },
      orderBy:{ _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Tempo médio até primeiro contato (em horas)
  const tempos = leadsComPrimContato
    .map((l) => {
      const t0 = ms(l.criadoEm);
      const t1 = ms(l.dataPrimeiroContato);
      return t0 && t1 ? (t1 - t0) / 3_600_000 : null;
    })
    .filter((t): t is number => t !== null && t >= 0);

  const tempoMedio =
    tempos.length > 0
      ? (tempos.reduce((s, t) => s + t, 0) / tempos.length).toFixed(1)
      : null;

  const taxaConversaoTotal = totalLeads > 0 ? ((leadsFechados / totalLeads) * 100).toFixed(1) : "0";
  const taxaConversaoMes   = leadsNoMes  > 0 ? ((leadsFechadosMes / leadsNoMes) * 100).toFixed(1) : "0";

  // Buscar nomes dos canais
  const canalIds = canaisData.map((c) => c.canalOrigemId);
  const canaisNomes = await prisma.canal.findMany({
    where:  { id: { in: canalIds } },
    select: { id: true, nome: true },
  });
  const canalMap = new Map(canaisNomes.map((c) => [c.id, c.nome]));
  const maxCanal = Math.max(...canaisData.map((c) => c._count.id), 1);

  // Buscar nomes dos motivos de perda
  const motivoIds = motivosData
    .map((m) => m.motivoPerdaId)
    .filter((id): id is string => id !== null);
  const motivosNomes = await prisma.motivoPerda.findMany({
    where:  { id: { in: motivoIds } },
    select: { id: true, descricao: true },
  });
  const motivoMap = new Map(motivosNomes.map((m) => [m.id, m.descricao]));

  const statCards = [
    {
      label:  "Total de Leads",
      value:  totalLeads.toString(),
      sub:    `${leadsNoMes} no mês atual`,
      icon:   Users,
      color:  "blue",
    },
    {
      label:  "Conversão Geral",
      value:  `${taxaConversaoTotal}%`,
      sub:    `${leadsFechados} fechamentos totais`,
      icon:   Percent,
      color:  Number(taxaConversaoTotal) >= 20 ? "green" : Number(taxaConversaoTotal) >= 10 ? "orange" : "red",
    },
    {
      label:  "Conversão no Mês",
      value:  `${taxaConversaoMes}%`,
      sub:    `${leadsFechadosMes} fechamentos em ${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(agora)}`,
      icon:   Target,
      color:  Number(taxaConversaoMes) >= 20 ? "green" : Number(taxaConversaoMes) >= 10 ? "orange" : "red",
    },
    {
      label:  "Tempo Médio de Resposta",
      value:  tempoMedio ? `${tempoMedio}h` : "—",
      sub:    tempoMedio ? "até primeiro contato (30d)" : "Sem dados suficientes",
      icon:   Clock,
      color:  tempoMedio
        ? Number(tempoMedio) <= 2 ? "green" : Number(tempoMedio) <= 6 ? "orange" : "red"
        : "slate",
    },
  ] as const;

  const colorMap = {
    blue:   { icon: "bg-blue-100 text-blue-600",    num: "text-blue-700"   },
    green:  { icon: "bg-green-100 text-green-600",  num: "text-green-700"  },
    orange: { icon: "bg-orange-100 text-orange-600",num: "text-orange-700" },
    red:    { icon: "bg-red-100 text-red-600",      num: "text-red-700"    },
    slate:  { icon: "bg-slate-100 text-slate-500",  num: "text-slate-700"  },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Visão consolidada da operação comercial
        </p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => {
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
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          );
        })}
      </div>

      {/* Leads por canal + Motivos de perda */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Por canal */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Leads por Canal</h2>
          </div>

          {canaisData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Sem dados ainda.</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {canaisData.map((c) => {
                const nome  = canalMap.get(c.canalOrigemId) ?? "Desconhecido";
                const count = c._count.id;
                const pct   = Math.round((count / totalLeads) * 100);
                return (
                  <div key={c.canalOrigemId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{nome}</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(count / maxCanal) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Motivos de perda */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Top Motivos de Perda</h2>
          </div>

          {motivosData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum lead perdido registrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {motivosData.map((m, i) => {
                const nome  = m.motivoPerdaId ? (motivoMap.get(m.motivoPerdaId) ?? "—") : "—";
                const count = m._count.id;
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-slate-700">{nome}</span>
                    <span className="text-sm font-semibold text-red-600">{count}</span>
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
