import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NovoLeadForm } from "./novo-lead-form";

export default async function NovoLeadPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const canais = await prisma.canal.findMany({
    where:   { ativo: true },
    select:  { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return <NovoLeadForm canais={canais} />;
}
