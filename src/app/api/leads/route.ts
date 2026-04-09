import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  nome:             z.string().min(2, "Nome muito curto"),
  telefone:         z.string().min(8, "Telefone inválido"),
  email:            z.string().email("E-mail inválido").optional().or(z.literal("")),
  canalOrigemId:    z.string().min(1, "Canal obrigatório"),
  observacoes:      z.string().optional(),
  produtoInteresse: z.enum(["CONSORCIO", "FINANCIAMENTO", "AMBOS"]).default("CONSORCIO"),
  urgencia:         z.enum(["IMEDIATA", "CURTO_PRAZO", "MEDIO_PRAZO", "INDEFINIDA"]).default("INDEFINIDA"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { nome, telefone, email, canalOrigemId, observacoes, produtoInteresse, urgencia } =
    parsed.data;

  // Verifica duplicata por telefone na unidade
  const existente = await prisma.lead.findFirst({
    where: { telefone, unidadeId: session.user.unidadeId },
    select: { id: true, nome: true },
  });
  if (existente) {
    return NextResponse.json(
      { error: `Telefone já cadastrado para: ${existente.nome}` },
      { status: 409 }
    );
  }

  const isVendedor = ["VENDEDOR", "SDR"].includes(session.user.perfil);

  const lead = await prisma.lead.create({
    data: {
      nome,
      telefone,
      email:            email || null,
      canalOrigemId,
      unidadeId:        session.user.unidadeId,
      responsavelId:    isVendedor ? session.user.id : null,
      observacoes:      observacoes || null,
      produtoInteresse,
      urgencia,
      status:           "RECEBIDO",
      score:            "MORNO",
    },
  });

  await prisma.historico.create({
    data: {
      leadId:    lead.id,
      usuarioId: session.user.id,
      tipo:      "SISTEMA",
      descricao: `Lead criado manualmente por ${session.user.name}.`,
    },
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
