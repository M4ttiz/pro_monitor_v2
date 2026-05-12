import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { registerAgentRoutes } from "./routes/agent.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerIngestRoutes } from "./routes/ingest.js";
import { registerMetricsRoutes } from "./routes/metrics.js";
import { hashPassword } from "./lib/password.js";
import { prisma } from "./lib/prisma.js";
import { setupSocket } from "./socket/index.js";

const app = Fastify({ logger: true });
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";

await app.register(cors, { origin: true });
await app.register(jwt, { secret: jwtSecret });

await registerHealthRoutes(app);
await registerAuthRoutes(app);
await registerIngestRoutes(app);
await app.register(async (securedApp) => {
  securedApp.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/v1/auth")) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: "unauthorized" });
      }
    }
  });

  await registerMetricsRoutes(securedApp);

  securedApp.get("/api/v1/alerts", async () => {
    const alerts = await prisma.alert.findMany({
      take: 100,
      where: { isOpen: true },
      orderBy: { createdAt: "desc" },
      include: { pc: true }
    });

    return alerts.map((a) => ({
      id: a.id,
      pcId: a.pcId,
      hostname: a.pc.hostname,
      severity: a.severity,
      message: a.message,
      isOpen: a.isOpen,
      createdAt: a.createdAt.toISOString()
    }));
  });

  securedApp.post("/api/v1/alerts/:id/ack", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({ error: "missing_alert_id" });
    }

    const found = await prisma.alert.findUnique({ where: { id: params.id } });
    if (!found) {
      return reply.status(404).send({ error: "alert_not_found" });
    }

    await prisma.alert.update({
      where: { id: params.id },
      data: { isOpen: false }
    });

    return { ok: true };
  });

  securedApp.get("/api/v1/pcs", async () => {
    const pcs = await prisma.pc.findMany({
      orderBy: { hostname: "asc" },
      include: {
        metrics: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      }
    });

    const now = Date.now();
    return pcs.map((pc) => {
      const latest = pc.metrics[0];
      const lastSeenAt = latest?.createdAt ?? pc.updatedAt;
      const ageMs = now - lastSeenAt.getTime();
      const isOffline = ageMs > 60_000;
      const isCritical = (latest?.cpuPercent ?? 0) >= 95 || (latest?.ramPercent ?? 0) >= 95 || (latest?.diskPercent ?? 0) >= 95;
      const isWarning = (latest?.cpuPercent ?? 0) >= 80 || (latest?.ramPercent ?? 0) >= 80 || (latest?.diskPercent ?? 0) >= 80;
      const status = isOffline ? "offline" : isCritical ? "critical" : isWarning ? "warning" : "online";

      return {
        id: pc.id,
        hostname: pc.hostname,
        site: pc.site,
        apiKey: pc.apiKey,
        status,
        lastSeenAt: lastSeenAt.toISOString(),
        latestMetric: latest
          ? {
              cpuPercent: latest.cpuPercent,
              ramPercent: latest.ramPercent,
              diskPercent: latest.diskPercent,
              createdAt: latest.createdAt.toISOString()
            }
          : null
      };
    });
  });
});
await registerAgentRoutes(app);

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
  setupSocket(app.server, jwtSecret);

  // Seed only local admin demo user.
  const users = [{ username: "admin", password: "admin123", role: "admin" }] as const;

  for (const user of users) {
    const found = await prisma.user.findUnique({ where: { username: user.username } });
    const hashedPassword = hashPassword(user.password);
    if (!found) {
      await prisma.user.create({
        data: {
          ...user,
          password: hashedPassword
        }
      });
    } else {
      await prisma.user.update({
        where: { id: found.id },
        data: {
          password: hashedPassword,
          role: user.role
        }
      });
    }
  }
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
