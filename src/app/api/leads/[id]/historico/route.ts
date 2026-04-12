import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  tipo:      z.enum(["LIGACAO", "WHATSAPP", "EMAIL", "OBSERVACAO"]),
  descricao: z.string().min(1, "Descrição obrigatória"),
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
      select: { id: true, unidadeId: true, dataPrimeiroContato: true },
    });

    if (!lead || lead.unidadeId !== session.user.unidadeId) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const agora = new Date();
    const isPrimeiroContato = !lead.dataPrimeiroContato &&
      ["LIGACAO", "WHATSAPP"].includes(parsed.data.tipo);

    const [historico] = await prisma.$transaction([
      prisma.historico.create({
        data: {
          leadId:    params.id,
          usuarioId: session.user.id,
          tipo:      parsed.data.tipo,
          descricao: parsed.data.descricao,
        },
      }),
      prisma.lead.update({
        where: { id: params.id },
        data:  {
          dataUltimaInteracao:  agora,
          ...(isPrimeiroContato ? { dataPrimeiroContato: agora } : {}),
        },
      }),
    ]);

    return NextResponse.json(historico, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao registrar", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
