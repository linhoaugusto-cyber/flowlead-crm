import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Admin@1234", 12);

  const usuario = await prisma.usuario.update({
    where: { email: "admin@flowlead.com.br" },
    data:  { senha: hash },
    select: { id: true, email: true, nome: true },
  });

  console.log("Senha atualizada com sucesso:", usuario);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
