import { PrismaClient } from "@prisma/client";

const NEXT_PHASE_PRODUCTION_BUILD = "phase-production-build";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  // Durante o build da Vercel, não instancia o PrismaClient
  if (process.env.NEXT_PHASE === NEXT_PHASE_PRODUCTION_BUILD) {
    return {} as PrismaClient;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
