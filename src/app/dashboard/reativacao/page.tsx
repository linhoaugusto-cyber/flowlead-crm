import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefreshCw, PhoneCall, MessageSquare, Flame } from "lucide-react";
import { ScoreLead } from "@prisma/client";

export const dynamic = "force-dynamic";

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string; dot: string }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold",    dot: "bg-red-500"    },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700",            dot: "bg-orange-400" },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700",            dot: "bg-yellow-400" },
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600",              dot: "bg-slate-300"  },
};

function diasAtraso(date: Date | null): number {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function tempoSem(dias: number): string {
  if (dias >= 30) return `${Math.floor(dias / 30)}m sem contato`;
  return `${dias}d sem contato`;
}

export default async function ReativacaoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isGerente = ["GERENTE", "ADMIN", "GESTOR"].includes(session.user.perfil);
  const unidadeId = session.user.unidadeId;
  const userId    = session.user.id;

  const limite = new Date(Date.now() - 7 * 86_400_000); // sem contato há +7 dias

  const [semContato, reativacaoFutura] = await Promise.all([
    // Leads ativos sem interação há +7 dias
    prisma.lead.findMany({
      where: {
        ...(isGerente ? { unidadeId } : { responsavelId: userId }),
        status:              { notIn: ["FECHADO", "PERDIDO", "REATIVACAO_FUTURA"] },
        dataUltimaInteracao: { lt: limite },
      },
      orderBy: [{ score: "desc" }, { dataUltimaInteracao: "asc" }],
      take: 40,
      select: {
        id:                  true,
        nome:                true,
        telefone:            true,
        score:               true,
        status:              true,
        dataUltimaInteracao: true,
        criadoEm:            true,
        canalOrigem:         { select: { nome: true } },
        responsavel:         { select: { nome: true } },
      },
    }),
    // Leads marcados para reativação futura
    prisma.lead.findMany({
      where: {
        ...(isGerente ? { unidadeId } : { responsavelId: userId }),
        status: "REATIVACAO_FUTURA",
      },
      orderBy: { dataUltimaInteracao: "asc" },
      take: 20,
      select: {
        id:                  true,
        nome:                true,
        telefone:            true,
        score:               true,
        dataUltimaInteracao: true,
        criadoEm:            true,
        canalOrigem:         { select: { nome: true } },
        responsavel:         { select: { nome: true } },
      },
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reativação</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Leads sem interação há mais de 7 dias e candidatos a reativação
        </p>
      </div>

      {/* Leads parados */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-slate-900">Leads Parados (+7 dias)</h2>
          <span className="ml-auto text-xs text-slate-400">{semContato.length} leads</span>
        </div>

        {semContato.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <RefreshCw className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Nenhum lead parado. Ótimo trabalho!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {semContato.map((lead) => {
              const sc   = SCORE_CONFIG[lead.score as ScoreLead];
              const dias = diasAtraso(lead.dataUltimaInteracao);

              return (
                <div key={lead.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sc.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{lead.nome}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lead.telefone}
                      {lead.canalOrigem && ` · ${lead.canalOrigem.nome}`}
                      {isGerente && lead.responsavel && ` · ${lead.responsavel.nome}`}
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-1">{tempoSem(dias)}</p>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <a
                      href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                    </a>
                    <a
                      href={`tel:${lead.telefone}`}
                      className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reativação futura */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-slate-900">Aguardando Reativação Futura</h2>
          <span className="ml-auto text-xs text-slate-400">{reativacaoFutura.length} leads</span>
        </div>

        {reativacaoFutura.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-sm text-slate-400">Nenhum lead nesta categoria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {reativacaoFutura.map((lead) => {
              const sc   = SCORE_CONFIG[lead.score as ScoreLead];
              const dias = diasAtraso(lead.dataUltimaInteracao);

              return (
                <div key={lead.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sc.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{lead.nome}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        Reativação futura
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lead.telefone}
                      {lead.canalOrigem && ` · ${lead.canalOrigem.nome}`}
                      {isGerente && lead.responsavel && ` · ${lead.responsavel.nome}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{tempoSem(dias)}</p>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <a
                      href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                    </a>
                    <a
                      href={`tel:${lead.telefone}`}
                      className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
