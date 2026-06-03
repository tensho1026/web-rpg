import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "@/lib/db/database-url";
import { PrismaClient } from "@/lib/generated/prisma/client";

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
  pixelRelicPrisma?: PrismaClientInstance;
};

function createPrismaClient(): PrismaClientInstance {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString: normalizeDatabaseUrl(connectionString) });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export function getPrismaClient(): PrismaClientInstance {
  globalForPrisma.pixelRelicPrisma ??= createPrismaClient();
  return globalForPrisma.pixelRelicPrisma;
}
