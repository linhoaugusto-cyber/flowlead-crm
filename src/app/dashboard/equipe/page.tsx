import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, AlertTriangle, Flame, CheckCircle } from "lucide-react";
import { PerfilUsuario } from "@prisma/client";

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  VENDEDOR: "Vendedor",
  SDR:      "SDR",
  GERENTE:  "Gerente",
  ADMIN:    "Admin",
  GESTOR:   "Gestor",
};

export default async function EquipePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const agora = new Date();

  const vendedores = await prisma.usuario.findMany({
    where: {
      unidadeId: session.user.unidadeId,
      perfil:    { in: ["VENDEDOR", "SDR"] },
      ativo:     true,
    },
    select: {
      id:     true,
      nome:   true,
      email:  true,
      perfil: true,
      leadsResponsavel: {
        where:  { status: { notIn: ["FECHADO", "PERDIDO"] } },
        select: { id: true, score: true, status: true },
      },
      tarefas: {
        where:  { status: "VENCIDA" },
        select: { id: true },
      },
    },
    orderBy: { nome: "asc" },
  });

  const totais = {
    vendedores:        vendedores.length,
    leadsAtivos:       vendedores.reduce((s, v) => s + v.leadsResponsavel.length, 0),
    followupsVencidos: vendedores.reduce((s, v) => s + v.tarefas.length, 0),
    leadsQuentes:      vendedores.reduce(
      (s, v) => s + v.leadsResponsavel.filter((l) => ["QUENTE", "CRITICO"].includes(l.score)).length,
      0
    ),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Equipe Comercial</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(agora)}
        </p>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Vendedores ativos", value: totais.vendedores,        icon: Users,          cls: "bg-blue-100 text-blue-600"   },
          { label: "Leads em carteira", value: totais.leadsAtivos,       icon: Users,          cls: "bg-indigo-100 text-indigo-600"},
          { label: "Leads quentes",     value: totais.leadsQuentes,      icon: Flame,          cls: "bg-orange-100 text-orange-600"},
          { label: "Follow-ups vencidos",value: totais.followupsVencidos,icon: AlertTriangle,  cls: totais.followupsVencidos > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"},
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cls}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabela da equipe */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Desempenho por Vendedor</h2>
        </div>

        {vendedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum vendedor cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Vendedor", "Perfil", "Leads Ativos", "Quentes/Críticos", "Follow-ups Vencidos", "Situação"].map(
                    (col) => (
                      <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vendedores.map((v) => {
                  const leadsAtivos  = v.leadsResponsavel.length;
                  const quentes      = v.leadsResponsavel.filter((l) => ["QUENTE", "CRITICO"].includes(l.score)).length;
                  const vencidos     = v.tarefas.length;
                  const situacaoOk   = vencidos === 0 && quentes === 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      {/* Vendedor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-xs font-bold">
                              {v.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{v.nome}</p>
                            <p className="text-xs text-slate-400">{v.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {PERFIL_LABEL[v.perfil]}
                        </span>
                      </td>

                      {/* Leads ativos */}
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{leadsAtivos}</td>

                      {/* Quentes */}
                      <td className="px-4 py-3.5">
                        {quentes > 0 ? (
                          <span className="flex items-center gap-1 text-orange-600 font-semibold">
                            <Flame className="w-3.5 h-3.5" />
                            {quentes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Follow-ups vencidos */}
                      <td className="px-4 py-3.5">
                        {vencidos > 0 ? (
                          <span className="flex items-center gap-1 text-red-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {vencidos}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="px-4 py-3.5">
                        {situacaoOk ? (
                          <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Em dia
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Atenção
                          </span>
                        )}
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
