import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await prisma.notificacao.updateMany({
    where: { usuarioId: session.user.id, lida: false },
    data:  { lida: true, lidaEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
