import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const tarefa = await prisma.tarefa.findUnique({
      where:  { id: params.id },
      select: { id: true, status: true, lead: { select: { unidadeId: true } } },
    });

    if (!tarefa || tarefa.lead.unidadeId !== session.user.unidadeId) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    if (tarefa.status === "REALIZADA") {
      return NextResponse.json({ ok: true });
    }

    await prisma.tarefa.update({
      where: { id: params.id },
      data:  { status: "REALIZADA", concluidaEm: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao atualizar tarefa", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
