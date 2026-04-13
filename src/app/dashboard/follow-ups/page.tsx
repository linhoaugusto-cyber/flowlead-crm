import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CheckSquare, AlertTriangle, Clock, PhoneCall, MessageSquare, CheckCircle } from "lucide-react";
import { ScoreLead, TipoTarefa } from "@prisma/client";
import { ConcluirTarefa } from "./concluir-tarefa";

export const dynamic = "force-dynamic";

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold"  },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700"          },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700"          },
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600"            },
};

const TIPO_LABEL: Record<TipoTarefa, string> = {
  PRIMEIRO_CONTATO: "Primeiro Contato",
  FOLLOW_UP:        "Follow-up",
  ENVIAR_SIMULACAO: "Enviar Simulação",
  COBRAR_RETORNO:   "Cobrar Retorno",
  AGENDAR_REUNIAO:  "Agendar Reunião",
  REATIVAR:         "Reativar",
  ENCERRAR:         "Encerrar",
  QUALIFICAR:       "Qualificar",
};

function formatarPrazo(date: Date): { texto: string; cls: string } {
  const diff = new Date(date).getTime() - Date.now();
  const h    = Math.floor(Math.abs(diff) / 3_600_000);
  const d    = Math.floor(h / 24);
  const vencido = diff < 0;

  if (vencido) {
    const texto = d > 0 ? `${d}d de atraso` : `${h}h de atraso`;
    return { texto, cls: "text-red-600 font-semibold" };
  }
  if (d === 0 && h < 24) return { texto: `em ${h}h`, cls: "text-orange-600 font-medium" };
  return { texto: `em ${d}d`, cls: "text-slate-500" };
}

export default async function FollowUpsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isGerente = ["GERENTE", "ADMIN", "GESTOR"].includes(session.user.perfil);

  // Marca lazily como VENCIDA qualquer tarefa PENDENTE com prazo expirado
  await prisma.tarefa.updateMany({
    where: { status: "PENDENTE", prazo: { lt: new Date() } },
    data:  { status: "VENCIDA" },
  });

  const where = isGerente
    ? { lead: { unidadeId: session.user.unidadeId }, status: { in: ["PENDENTE", "VENCIDA"] as const } }
    : { usuarioId: session.user.id, status: { in: ["PENDENTE", "VENCIDA"] as const } };

  const [vencidas, pendentes] = await Promise.all([
    prisma.tarefa.findMany({
      where: { ...where, status: "VENCIDA" },
      orderBy: { prazo: "asc" },
      take: 50,
      select: {
        id:       true,
        tipoAcao: true,
        descricao:true,
        prazo:    true,
        status:   true,
        lead: { select: { id: true, nome: true, telefone: true, score: true } },
        usuario: { select: { nome: true } },
      },
    }),
    prisma.tarefa.findMany({
      where: { ...where, status: "PENDENTE" },
      orderBy: { prazo: "asc" },
      take: 50,
      select: {
        id:       true,
        tipoAcao: true,
        descricao:true,
        prazo:    true,
        status:   true,
        lead: { select: { id: true, nome: true, telefone: true, score: true } },
        usuario: { select: { nome: true } },
      },
    }),
  ]);

  function TarefaRow({ t }: { t: typeof vencidas[0] }) {
    const sc     = SCORE_CONFIG[t.lead.score as ScoreLead];
    const prazo  = formatarPrazo(t.prazo);
    const vencida = t.status === "VENCIDA";

    return (
      <div className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${vencida ? "bg-red-50/30" : ""}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${vencida ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>
          {vencida ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{t.lead.nome}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {TIPO_LABEL[t.tipoAcao as TipoTarefa]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{t.descricao}</p>
          {isGerente && (
            <p className="text-xs text-slate-400 mt-0.5">Vendedor: {t.usuario.nome}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs ${prazo.cls}`}>{prazo.texto}</span>
          <div className="flex gap-1">
            <a href={`https://wa.me/55${t.lead.telefone.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-green-600" />
            </a>
            <a href={`tel:${t.lead.telefone}`}
              className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            </a>
            <ConcluirTarefa tarefaId={t.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {vencidas.length} vencidos · {pendentes.length} pendentes
        </p>
      </div>

      {/* Vencidos */}
      {vencidas.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2 bg-red-50/40">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700">Vencidos ({vencidas.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {vencidas.map((t) => <TarefaRow key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {/* Pendentes */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Pendentes ({pendentes.length})</h2>
        </div>

        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <CheckCircle className="w-8 h-8 text-green-300 mb-2" />
            <p className="text-sm text-slate-500">Nenhum follow-up pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendentes.map((t) => <TarefaRow key={t.id} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
