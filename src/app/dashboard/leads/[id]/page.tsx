import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageSquare, Mail, StickyNote,
  Clock, TrendingUp, User, Building2, Calendar,
} from "lucide-react";
import { ScoreLead, StatusLead, TipoHistorico } from "@prisma/client";
import { RegistrarInteracao } from "./registrar-interacao";

export const dynamic = "force-dynamic";

const SCORE_CONFIG: Record<ScoreLead, { label: string; cls: string }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-700 font-semibold"  },
  QUENTE:  { label: "Quente",  cls: "bg-orange-100 text-orange-700"          },
  MORNO:   { label: "Morno",   cls: "bg-yellow-100 text-yellow-700"          },
  FRIO:    { label: "Frio",    cls: "bg-slate-100 text-slate-600"            },
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
  FECHADO:               "Fechado",
  PERDIDO:               "Perdido",
  REATIVACAO_FUTURA:     "Reativação Futura",
};

const TIPO_CONFIG: Partial<Record<TipoHistorico, { icon: React.ElementType; label: string; iconCls: string; bgCls: string }>> = {
  LIGACAO:        { icon: Phone,          label: "Ligação",         iconCls: "text-blue-600",   bgCls: "bg-blue-50"   },
  WHATSAPP:       { icon: MessageSquare,  label: "WhatsApp",        iconCls: "text-green-600",  bgCls: "bg-green-50"  },
  EMAIL:          { icon: Mail,           label: "E-mail",          iconCls: "text-purple-600", bgCls: "bg-purple-50" },
  OBSERVACAO:     { icon: StickyNote,     label: "Observação",      iconCls: "text-slate-600",  bgCls: "bg-slate-100" },
  MUDANCA_STATUS: { icon: TrendingUp,     label: "Mudança de Status", iconCls: "text-indigo-600", bgCls: "bg-indigo-50" },
  SISTEMA:        { icon: Clock,          label: "Sistema",         iconCls: "text-slate-400",  bgCls: "bg-slate-50"  },
  ATRIBUICAO:     { icon: User,           label: "Atribuição",      iconCls: "text-teal-600",   bgCls: "bg-teal-50"   },
};

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function formatarDataCurta(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function tempoAtras(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  const m = Math.floor(diff / 60_000);
  return m > 0 ? `${m}min atrás` : "Agora";
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5 font-medium">{value}</p>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const lead = await prisma.lead.findUnique({
    where:  { id: params.id },
    select: {
      id:                  true,
      nome:                true,
      telefone:            true,
      email:               true,
      score:               true,
      status:              true,
      produtoInteresse:    true,
      urgencia:            true,
      observacoes:         true,
      dataEntrada:         true,
      dataPrimeiroContato: true,
      dataUltimaInteracao: true,
      unidadeId:           true,
      canalOrigem:         { select: { nome: true } },
      responsavel:         { select: { id: true, nome: true } },
      historicos: {
        orderBy: { criadoEm: "desc" },
        take: 50,
        select: {
          id:            true,
          tipo:          true,
          descricao:     true,
          statusAnterior:true,
          statusNovo:    true,
          criadoEm:      true,
          usuario:       { select: { nome: true } },
        },
      },
    },
  });

  if (!lead || lead.unidadeId !== session.user.unidadeId) notFound();

  const sc = SCORE_CONFIG[lead.score];

  const URGENCIA_LABEL: Record<string, string> = {
    IMEDIATA:    "Imediata",
    CURTO_PRAZO: "Curto prazo",
    MEDIO_PRAZO: "Médio prazo",
    INDEFINIDA:  "Indefinida",
  };

  const PRODUTO_LABEL: Record<string, string> = {
    CONSORCIO:     "Consórcio",
    FINANCIAMENTO: "Financiamento",
    AMBOS:         "Ambos",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/leads"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex-shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{lead.nome}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {STATUS_LABEL[lead.status] ?? lead.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Canal: {lead.canalOrigem?.nome ?? "—"} · Entrada: {formatarDataCurta(lead.dataEntrada)}
          </p>
        </div>
        <RegistrarInteracao leadId={lead.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Dados do lead */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contato */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />Contato
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <a href={`tel:${lead.telefone}`}
                  className="flex items-center gap-2 flex-1 text-sm text-slate-700 hover:text-blue-600 transition-colors">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {lead.telefone}
                </a>
                <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                </a>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {lead.email}
                </div>
              )}
            </div>
          </div>

          {/* Informações comerciais */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />Comercial
            </h2>
            <div className="space-y-3">
              <InfoItem label="Produto"    value={PRODUTO_LABEL[lead.produtoInteresse] ?? lead.produtoInteresse} />
              <InfoItem label="Urgência"   value={URGENCIA_LABEL[lead.urgencia] ?? lead.urgencia} />
              <InfoItem label="Responsável" value={lead.responsavel?.nome ?? "Não atribuído"} />
            </div>
          </div>

          {/* Datas */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />Linha do tempo
            </h2>
            <div className="space-y-3">
              <InfoItem label="Entrada"          value={formatarDataCurta(lead.dataEntrada)} />
              <InfoItem label="Primeiro contato" value={formatarDataCurta(lead.dataPrimeiroContato)} />
              <InfoItem label="Última interação" value={formatarDataCurta(lead.dataUltimaInteracao)} />
            </div>
          </div>

          {/* Observações */}
          {lead.observacoes && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-slate-400" />Observações
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{lead.observacoes}</p>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Histórico de Interações</h2>
            <span className="text-xs text-slate-400">{lead.historicos.length} registros</span>
          </div>

          {lead.historicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhuma interação registrada.</p>
              <p className="text-xs text-slate-400 mt-1">Clique em "Registrar Interação" para começar.</p>
            </div>
          ) : (
            <div className="relative p-5">
              {/* Linha vertical */}
              <div className="absolute left-9 top-5 bottom-5 w-px bg-slate-100" />

              <div className="space-y-5">
                {lead.historicos.map((h) => {
                  const config = TIPO_CONFIG[h.tipo as TipoHistorico] ?? TIPO_CONFIG.SISTEMA!;
                  const Icon   = config.icon;

                  return (
                    <div key={h.id} className="flex gap-4 relative">
                      {/* Ícone */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 z-10 border border-white ${config.bgCls}`}>
                        <Icon className={`w-3.5 h-3.5 ${config.iconCls}`} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{config.label}</span>
                            <span className="text-xs text-slate-400">por {h.usuario.nome}</span>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">{tempoAtras(h.criadoEm)}</span>
                        </div>

                        {h.tipo === "MUDANCA_STATUS" && h.statusAnterior && h.statusNovo ? (
                          <p className="text-sm text-slate-600 mt-1">
                            <span className="line-through text-slate-400">{STATUS_LABEL[h.statusAnterior]}</span>
                            {" → "}
                            <span className="font-medium text-slate-800">{STATUS_LABEL[h.statusNovo]}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{h.descricao}</p>
                        )}

                        <p className="text-xs text-slate-300 mt-1">{formatarData(h.criadoEm)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
