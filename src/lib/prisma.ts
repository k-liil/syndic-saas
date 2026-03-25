import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { 
  prisma?: PrismaClient;
  isPrismaLoggingEnabled?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });

if (globalForPrisma.isPrismaLoggingEnabled === undefined) {
  globalForPrisma.isPrismaLoggingEnabled = true;
  // Initialize from DB if possible
  prisma.systemSettings
    .findFirst()
    .then((s) => {
      if (s) globalForPrisma.isPrismaLoggingEnabled = s.prismaLogging;
    })
    .catch(() => {});
}

// @ts-ignore - Prisma event types can be tricky
prisma.$on("query", (e: any) => {
  if (globalForPrisma.isPrismaLoggingEnabled) {
    console.log("Query: " + e.query);
    console.log("Duration: " + e.duration + "ms");
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
