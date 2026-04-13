import { PrismaClient, TipoCanal, CategoriaMotivoPerca, NivelSla, DestinatarioSla, PerfilUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do FlowLead CRM...\n");

  // ── 1. Canais de origem ──────────────────────────────────
  const canais = [
    { nome: "WhatsApp",      tipo: TipoCanal.WHATSAPP     },
    { nome: "Site",          tipo: TipoCanal.SITE          },
    { nome: "Telefone",      tipo: TipoCanal.TELEFONE      },
    { nome: "Campanha Meta", tipo: TipoCanal.CAMPANHA      },
    { nome: "Indicação",     tipo: TipoCanal.INDICACAO     },
    { nome: "Manual",        tipo: TipoCanal.MANUAL        },
    { nome: "Instagram",     tipo: TipoCanal.REDES_SOCIAIS },
    { nome: "Facebook",      tipo: TipoCanal.REDES_SOCIAIS },
    { nome: "E-mail",        tipo: TipoCanal.EMAIL         },
  ];

  for (const canal of canais) {
    await prisma.canal.upsert({
      where: { nome: canal.nome },
      update: {},
      create: canal,
    });
  }
  console.log(`✅ ${canais.length} canais criados`);

  // ── 2. Motivos de perda ──────────────────────────────────
  const motivosPerdaData = [
    { descricao: "Preço acima do esperado",      categoria: CategoriaMotivoPerca.PRECO        },
    { descricao: "Sem perfil para o produto",    categoria: CategoriaMotivoPerca.SEM_PERFIL   },
    { descricao: "Sem urgência no momento",      categoria: CategoriaMotivoPerca.SEM_URGENCIA },
    { descricao: "Sem capacidade financeira",    categoria: CategoriaMotivoPerca.SEM_CREDITO  },
    { descricao: "Parou de responder",           categoria: CategoriaMotivoPerca.SEM_RESPOSTA },
    { descricao: "Fechou com concorrente",       categoria: CategoriaMotivoPerca.CONCORRENTE  },
    { descricao: "Desistiu sem justificativa",   categoria: CategoriaMotivoPerca.DESISTENCIA  },
    { descricao: "Outro motivo",                 categoria: CategoriaMotivoPerca.OUTRO        },
  ];

  for (const motivo of motivosPerdaData) {
    const exists = await prisma.motivoPerda.findFirst({
      where: { descricao: motivo.descricao },
    });
    if (!exists) {
      await prisma.motivoPerda.create({ data: motivo });
    }
  }
  console.log(`✅ ${motivosPerdaData.length} motivos de perda verificados`);

  // ── 3. Regras de SLA ─────────────────────────────────────
  const slaRules = [
    {
      nome: "Lead sem contato — aviso ao vendedor",
      tipoEvento: "LEAD_SEM_CONTATO",
      thresholdHoras: 2,
      nivel: NivelSla.AVISO,
      destinatario: DestinatarioSla.VENDEDOR,
    },
    {
      nome: "Lead sem contato — crítico para gerente",
      tipoEvento: "LEAD_SEM_CONTATO",
      thresholdHoras: 4,
      nivel: NivelSla.CRITICO,
      destinatario: DestinatarioSla.AMBOS,
    },
    {
      nome: "Follow-up vencido — aviso ao vendedor",
      tipoEvento: "FOLLOW_UP_VENCIDO",
      thresholdHoras: 0,
      nivel: NivelSla.AVISO,
      destinatario: DestinatarioSla.VENDEDOR,
    },
    {
      nome: "Follow-up vencido — escalonamento para gerente",
      tipoEvento: "FOLLOW_UP_VENCIDO",
      thresholdHoras: 4,
      nivel: NivelSla.CRITICO,
      destinatario: DestinatarioSla.AMBOS,
    },
    {
      nome: "Lead quente parado — crítico",
      tipoEvento: "LEAD_QUENTE_PARADO",
      thresholdHoras: 24,
      nivel: NivelSla.CRITICO,
      destinatario: DestinatarioSla.AMBOS,
    },
    {
      nome: "Proposta sem retorno — follow-up",
      tipoEvento: "PROPOSTA_SEM_RETORNO",
      thresholdHoras: 48,
      nivel: NivelSla.AVISO,
      destinatario: DestinatarioSla.VENDEDOR,
    },
    {
      nome: "Proposta sem retorno — escalonamento",
      tipoEvento: "PROPOSTA_SEM_RETORNO",
      thresholdHoras: 120,
      nivel: NivelSla.CRITICO,
      destinatario: DestinatarioSla.AMBOS,
    },
    {
      nome: "Lead sem atribuição",
      tipoEvento: "LEAD_SEM_ATRIBUICAO",
      thresholdHoras: 1,
      nivel: NivelSla.CRITICO,
      destinatario: DestinatarioSla.GERENTE,
    },
  ];

  for (const sla of slaRules) {
    await prisma.slaConfig.upsert({
      where: { tipoEvento_nivel: { tipoEvento: sla.tipoEvento, nivel: sla.nivel } },
      update: { thresholdHoras: sla.thresholdHoras },
      create: sla,
    });
  }
  console.log(`✅ ${slaRules.length} regras de SLA criadas`);

  // ── 4. Unidade padrão ────────────────────────────────────
  const unidade = await prisma.unidade.upsert({
    where: { codigo: "ADESP01" },
    update: {},
    create: {
      nome: "Ademicon SP — Unidade 01",
      codigo: "ADESP01",
      cidade: "São Paulo",
      estado: "SP",
    },
  });
  console.log(`✅ Unidade padrão criada: ${unidade.nome}`);

  // ── 5. Usuário admin padrão ──────────────────────────────
  const senhaHash = await bcrypt.hash("FlowLead@2024", 12);

  await prisma.usuario.upsert({
    where: { email: "admin@flowlead.com.br" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@flowlead.com.br",
      senha: senhaHash,
      perfil: PerfilUsuario.ADMIN,
      unidadeId: unidade.id,
    },
  });
  console.log(`✅ Usuário admin criado: admin@flowlead.com.br / FlowLead@2024`);

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
