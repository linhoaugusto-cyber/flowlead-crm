import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MOTIVOS = [
  { descricao: "Preço acima do esperado",    categoria: "PRECO"        },
  { descricao: "Sem perfil para o produto",  categoria: "SEM_PERFIL"   },
  { descricao: "Sem urgência no momento",    categoria: "SEM_URGENCIA" },
  { descricao: "Sem capacidade financeira",  categoria: "SEM_CREDITO"  },
  { descricao: "Parou de responder",         categoria: "SEM_RESPOSTA" },
  { descricao: "Fechou com concorrente",     categoria: "CONCORRENTE"  },
  { descricao: "Desistiu sem justificativa", categoria: "DESISTENCIA"  },
  { descricao: "Outro motivo",               categoria: "OUTRO"        },
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
