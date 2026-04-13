import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Protegido por CRON_SECRET — Vercel envia este header automaticamente
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret     = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const agora = new Date();

    const { count } = await prisma.tarefa.updateMany({
      where: {
        status: "PENDENTE",
        prazo:  { lt: agora },
      },
      data: { status: "VENCIDA" },
    });

    return NextResponse.json({ ok: true, atualizadas: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao atualizar tarefas", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
