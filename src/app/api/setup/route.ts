import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const SETUP_SECRET = process.env.SETUP_SECRET;

export async function GET(req: Request) {
  // Exige SETUP_SECRET na query string para evitar execução acidental
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Verifica se já existe qualquer admin — rota executa só uma vez
  const adminExistente = await prisma.usuario.findFirst({
    where: { perfil: "ADMIN" },
    select: { id: true, email: true },
  });

  if (adminExistente) {
    return NextResponse.json(
      { error: "Setup já executado", admin: adminExistente.email },
      { status: 409 }
    );
  }

  // Cria unidade padrão
  const unidade = await prisma.unidade.create({
    data: {
      nome:   "Matriz",
      codigo: "MATRIZ",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  // Cria usuário admin
  const senhaHash = await bcrypt.hash("Admin@1234", 12);

  const admin = await prisma.usuario.create({
    data: {
      nome:      "Administrador",
      email:     "admin@flowlead.com",
      senha:     senhaHash,
      perfil:    "ADMIN",
      unidadeId: unidade.id,
    },
  });

  return NextResponse.json({
    ok:       true,
    mensagem: "Setup concluído com sucesso",
    unidade:  { id: unidade.id, nome: unidade.nome },
    admin:    { id: admin.id, email: admin.email },
    senha:    "Admin@1234",
  });
}
