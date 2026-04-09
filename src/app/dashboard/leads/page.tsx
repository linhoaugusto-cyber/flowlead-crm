import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Search } from "lucide-react";
import { StatusLead, ScoreLead } from "@prisma/client";
import { LeadsFilters } from "./leads-filters";
import { Suspense } from "react";

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string }> = {
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600"        },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700"      },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700"      },
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold" },
};

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

const STATUS_CLS: Partial<Record<StatusLead, string>> = {
  RECEBIDO:            "bg-slate-100 text-slate-600",
  AGUARDANDO_CONTATO:  "bg-blue-50 text-blue-700",
  EM_QUALIFICACAO:     "bg-indigo-50 text-indigo-700",
  PROPOSTA_ENVIADA:    "bg-violet-50 text-violet-700",
  FOLLOW_UP_ATIVO:     "bg-orange-50 text-orange-700",
  OPORTUNIDADE_QUENTE: "bg-red-50 text-red-700",
  NEGOCIACAO_AVANCADA: "bg-red-50 text-red-700",
  FECHADO:             "bg-green-50 text-green-700",
  PERDIDO:             "bg-gray-100 text-gray-500",
  REATIVACAO_FUTURA:   "bg-purple-50 text-purple-700",
};

function formatData(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(
    new Date(date)
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isVendedor = ["VENDEDOR", "SDR"].includes(session.user.perfil);
  const statusFiltro = searchParams.status as StatusLead | undefined;

  const leads = await prisma.lead.findMany({
    where: {
      unidadeId: session.user.unidadeId,
      ...(isVendedor ? { responsavelId: session.user.id } : {}),
      ...(statusFiltro ? { status: statusFiltro } : {}),
    },
    select: {
      id:                  true,
      nome:                true,
      telefone:            true,
      score:               true,
      status:              true,
      criadoEm:            true,
      dataUltimaInteracao: true,
      canalOrigem:  { select: { nome: true } },
      responsavel:  { select: { nome: true } },
    },
    orderBy: [{ score: "desc" }, { criadoEm: "desc" }],
    take: 100,
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} encontrado{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/leads/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
        <Suspense>
          <LeadsFilters />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Busca avançada em breve</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum lead encontrado</p>
            <p className="text-sm text-slate-400 mt-1">
              {statusFiltro
                ? "Tente remover o filtro de status."
                : "Clique em Novo Lead para começar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Nome", "Telefone", "Canal", "Status", "Score", "Vendedor", "Entrada"].map(
                    (col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map((lead) => {
                  const score  = SCORE_CONFIG[lead.score];
                  const stsCls = STATUS_CLS[lead.status] ?? "bg-slate-100 text-slate-600";
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-xs font-bold">
                              {lead.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-800 whitespace-nowrap">
                            {lead.nome}
                          </span>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {lead.telefone}
                      </td>

                      {/* Canal */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {lead.canalOrigem.nome}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${stsCls}`}>
                          {STATUS_LABEL[lead.status]}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${score.cls}`}>
                          {score.label}
                        </span>
                      </td>

                      {/* Vendedor */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {lead.responsavel?.nome ?? (
                          <span className="text-amber-500 text-xs">Sem responsável</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatData(lead.criadoEm)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
