import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, ShieldCheck } from "lucide-react";
import { PerfilUsuario } from "@prisma/client";
import { NovoUsuarioForm } from "./novo-usuario-form";

export const dynamic = "force-dynamic";

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  VENDEDOR: "Vendedor",
  SDR:      "SDR",
  GERENTE:  "Gerente",
  ADMIN:    "Admin",
  GESTOR:   "Gestor",
};

const PERFIL_COLOR: Record<PerfilUsuario, string> = {
  VENDEDOR: "bg-blue-50 text-blue-700",
  SDR:      "bg-cyan-50 text-cyan-700",
  GERENTE:  "bg-purple-50 text-purple-700",
  ADMIN:    "bg-red-50 text-red-700",
  GESTOR:   "bg-slate-100 text-slate-700",
};

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const podeGerenciar = ["ADMIN", "GESTOR", "GERENTE"].includes(session.user.perfil);
  if (!podeGerenciar) redirect("/dashboard/vendedor");

  const [usuarios, unidades] = await Promise.all([
    prisma.usuario.findMany({
      where:   { unidadeId: session.user.unidadeId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: {
        id:        true,
        nome:      true,
        email:     true,
        perfil:    true,
        ativo:     true,
        criadoEm:  true,
      },
    }),
    prisma.unidade.findMany({
      where:   { ativa: true },
      select:  { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os usuários da equipe</p>
        </div>
        <NovoUsuarioForm unidades={unidades} />
      </div>

      {/* Tabela de usuários */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Usuários</h2>
          <span className="ml-auto text-xs text-slate-400">{usuarios.length} cadastrados</span>
        </div>

        {usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Usuário", "E-mail", "Perfil", "Criado em", "Status"].map((col) => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuarios.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.ativo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-xs font-bold">
                            {u.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{u.nome}</span>
                          {u.id === session.user.id && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PERFIL_COLOR[u.perfil]}`}>
                        {PERFIL_LABEL[u.perfil]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                      {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(u.criadoEm))}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
