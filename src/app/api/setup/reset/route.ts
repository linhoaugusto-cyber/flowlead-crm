import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SETUP_SECRET = process.env.SETUP_SECRET;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const deleted = await prisma.usuario.deleteMany({
    where: { perfil: "ADMIN" },
  });

  return NextResponse.json({
    ok:       true,
    mensagem: `${deleted.count} admin(s) removido(s). Rode /api/setup?secret=... para recriar.`,
  });
}
