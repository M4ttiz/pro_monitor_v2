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
      orderBy: { createdAt: "desc" }
    });

    return alerts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString()
    }));
  });
});
await registerAgentRoutes(app);

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
  setupSocket(app.server, jwtSecret);

  // Seed local demo users only if missing.
  const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "it", password: "it123", role: "it_operator" },
    { username: "manager", password: "manager123", role: "manager" }
  ] as const;

  for (const user of users) {
    const found = await prisma.user.findUnique({ where: { username: user.username } });
    if (!found) {
      await prisma.user.create({
        data: {
          ...user,
          password: hashPassword(user.password)
        }
      });
    } else if (!found.password.includes(":")) {
      await prisma.user.update({
        where: { id: found.id },
        data: {
          password: hashPassword(found.password)
        }
      });
    }
  }
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
