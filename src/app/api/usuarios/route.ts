import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  nome:      z.string().min(2, "Nome muito curto"),
  email:     z.string().email("E-mail inválido"),
  senha:     z.string().min(6, "Senha mínima de 6 caracteres"),
  perfil:    z.enum(["VENDEDOR", "SDR", "GERENTE", "ADMIN", "GESTOR"]),
  unidadeId: z.string().min(1, "Unidade obrigatória"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const allowed = ["ADMIN", "GESTOR", "GERENTE"];
  if (!allowed.includes(session.user.perfil)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { nome, email, senha, perfil, unidadeId } = parsed.data;

    const existente = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });
    if (existente) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const hash = await bcrypt.hash(senha, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email:     email.toLowerCase().trim(),
        senha:     hash,
        perfil,
        unidadeId,
      },
      select: { id: true, nome: true, email: true, perfil: true },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao criar usuário", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const allowed = ["ADMIN", "GESTOR"];
  if (!allowed.includes(session.user.perfil)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    if (id === session.user.id) {
      return NextResponse.json({ error: "Não é possível remover a si mesmo" }, { status: 400 });
    }

    await prisma.usuario.update({
      where: { id },
      data:  { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao remover usuário", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
