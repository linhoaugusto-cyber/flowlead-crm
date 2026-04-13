import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CategoriaMotivoPerca } from "@prisma/client";

export const dynamic = "force-dynamic";

const MOTIVOS = [
  { descricao: "Preço acima do esperado",    categoria: CategoriaMotivoPerca.PRECO        },
  { descricao: "Sem perfil para o produto",  categoria: CategoriaMotivoPerca.SEM_PERFIL   },
  { descricao: "Sem urgência no momento",    categoria: CategoriaMotivoPerca.SEM_URGENCIA },
  { descricao: "Sem capacidade financeira",  categoria: CategoriaMotivoPerca.SEM_CREDITO  },
  { descricao: "Parou de responder",         categoria: CategoriaMotivoPerca.SEM_RESPOSTA },
  { descricao: "Fechou com concorrente",     categoria: CategoriaMotivoPerca.CONCORRENTE  },
  { descricao: "Desistiu sem justificativa", categoria: CategoriaMotivoPerca.DESISTENCIA  },
  { descricao: "Outro motivo",               categoria: CategoriaMotivoPerca.OUTRO        },
];

export async function GET() {
  try {
    let criados = 0;
    for (const motivo of MOTIVOS) {
      const exists = await prisma.motivoPerda.findFirst({
        where: { descricao: motivo.descricao },
      });
      if (!exists) {
        await prisma.motivoPerda.create({ data: motivo });
        criados++;
      }
    }
    return NextResponse.json({ ok: true, criados, total: MOTIVOS.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro ao criar motivos", detail: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
