import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TipoTarefa } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  tipoAcao:  z.nativeEnum(TipoTarefa),
  descricao: z.string().min(1).max(1000),
  prazo:     z.string().datetime({ offset: true }),
});

export async function POST(
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
      select: { id: true, unidadeId: true },
    });

    if (!lead || lead.unidadeId !== session.user.unidadeId) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const { tipoAcao, descricao, prazo } = parsed.data;

    await prisma.tarefa.create({
      data: {
        leadId:    params.id,
        usuarioId: session.user.id,
        tipoAcao,
        descricao,
        prazo:     new Date(prazo),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao criar tarefa", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
