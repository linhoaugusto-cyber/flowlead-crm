import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { StatusLead } from "@prisma/client";

export const dynamic = "force-dynamic";

// Statuses que implicam que o vendedor já fez ao menos uma tentativa de contato
const STATUS_CONTATO_FEITO = new Set<StatusLead>([
  "EM_TENTATIVA",
  "EM_QUALIFICACAO",
  "SIMULACAO_ANDAMENTO",
  "PROPOSTA_ENVIADA",
  "AGUARDANDO_RETORNO",
  "FOLLOW_UP_ATIVO",
  "OPORTUNIDADE_QUENTE",
  "NEGOCIACAO_AVANCADA",
  "FECHADO",
  "PERDIDO",
  "REATIVACAO_FUTURA",
]);

const schema = z.object({
  status:        z.nativeEnum(StatusLead).optional(),
  responsavelId: z.string().nullable().optional(),
  score:         z.enum(["FRIO", "MORNO", "QUENTE", "CRITICO"]).optional(),
  motivoPerdaId: z.string().nullable().optional(),
}).refine(
  (d) =>
    d.status !== undefined ||
    d.responsavelId !== undefined ||
    d.score !== undefined ||
    d.motivoPerdaId !== undefined,
  { message: "Informe ao menos um campo para atualizar." }
);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where:  { id: params.id },
      select: {
        id:                  true,
        unidadeId:           true,
        status:              true,
        responsavelId:       true,
        dataPrimeiroContato: true,
      },
    });

    if (!lead || lead.unidadeId !== session.user.unidadeId) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const { status, responsavelId, score, motivoPerdaId } = parsed.data;
    const agora = new Date();
    const historicos: {
      tipo: "MUDANCA_STATUS" | "ATRIBUICAO";
      descricao: string;
      statusAnterior?: StatusLead;
      statusNovo?: StatusLead;
    }[] = [];

    if (status && status !== lead.status) {
      historicos.push({
        tipo:           "MUDANCA_STATUS",
        descricao:      `Status alterado de ${lead.status} para ${status}.`,
        statusAnterior: lead.status,
        statusNovo:     status,
      });
    }

    if (responsavelId !== undefined && responsavelId !== lead.responsavelId) {
      let nomeVendedor = "ninguém";
      if (responsavelId) {
        const u = await prisma.usuario.findUnique({
          where:  { id: responsavelId },
          select: { nome: true },
        });
        nomeVendedor = u?.nome ?? responsavelId;
      }
      historicos.push({
        tipo:      "ATRIBUICAO",
        descricao: `Lead atribuído a ${nomeVendedor} por ${session.user.name}.`,
      });
    }

    // Preenche dataPrimeiroContato quando o status avança para além da fila inicial
    const devePrimeiroContato =
      !lead.dataPrimeiroContato &&
      status !== undefined &&
      STATUS_CONTATO_FEITO.has(status);

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: params.id },
        data: {
          ...(status         ? { status }         : {}),
          ...(score          ? { score }           : {}),
          ...(responsavelId !== undefined ? { responsavelId } : {}),
          ...(motivoPerdaId  !== undefined ? { motivoPerdaId } : {}),
          ...(status === "FECHADO" ? { dataFechamento: agora } : {}),
          ...(devePrimeiroContato  ? { dataPrimeiroContato: agora } : {}),
          dataUltimaInteracao: agora,
        },
      }),
      ...historicos.map((h) =>
        prisma.historico.create({
          data: {
            leadId:    params.id,
            usuarioId: session.user.id,
            tipo:      h.tipo,
            descricao: h.descricao,
            ...(h.statusAnterior ? { statusAnterior: h.statusAnterior } : {}),
            ...(h.statusNovo     ? { statusNovo:     h.statusNovo }     : {}),
          },
        })
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao atualizar", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
