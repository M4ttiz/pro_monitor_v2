import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function registerMetricsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/metrics", async () => {
    const latest = await prisma.metricSnapshot.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { pc: true }
    });

    return latest.map((m) => ({
      id: m.id,
      pcId: m.pcId,
      hostname: m.pc.hostname,
      cpuPercent: m.cpuPercent,
      ramPercent: m.ramPercent,
      diskPercent: m.diskPercent,
      createdAt: m.createdAt.toISOString()
    }));
  });
}
