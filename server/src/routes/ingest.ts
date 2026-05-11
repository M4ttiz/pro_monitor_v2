import { DEFAULT_THRESHOLDS } from "@pro-monitor/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { io } from "../socket/index.js";

const ingestSchema = z.object({
  apiKey: z.string().min(3),
  hostname: z.string().min(1),
  site: z.string().default("default"),
  cpuPercent: z.number().min(0).max(100),
  ramPercent: z.number().min(0).max(100),
  diskPercent: z.number().min(0).max(100)
});

export async function registerIngestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/ingest", async (request, reply) => {
    const parsed = ingestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_payload", details: parsed.error.issues });
    }

    const payload = parsed.data;
    const pc = await prisma.pc.upsert({
      where: { apiKey: payload.apiKey },
      create: { apiKey: payload.apiKey, hostname: payload.hostname, site: payload.site },
      update: { hostname: payload.hostname, site: payload.site }
    });

    const metric = await prisma.metricSnapshot.create({
      data: {
        pcId: pc.id,
        cpuPercent: payload.cpuPercent,
        ramPercent: payload.ramPercent,
        diskPercent: payload.diskPercent
      }
    });

    io.emit("metric:new", {
      id: metric.id,
      pcId: metric.pcId,
      cpuPercent: metric.cpuPercent,
      ramPercent: metric.ramPercent,
      diskPercent: metric.diskPercent,
      createdAt: metric.createdAt.toISOString()
    });

    if (payload.cpuPercent >= DEFAULT_THRESHOLDS.cpuCritical) {
      const alert = await prisma.alert.create({
        data: {
          pcId: pc.id,
          severity: "critical",
          message: `CPU critical on ${pc.hostname}: ${payload.cpuPercent.toFixed(1)}%`
        }
      });

      io.emit("alert:new", {
        id: alert.id,
        pcId: alert.pcId,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.createdAt.toISOString()
      });
    }

    return reply.send({ ok: true });
  });
}
