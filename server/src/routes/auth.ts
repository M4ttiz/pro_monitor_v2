import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";

const authSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = authSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    // Local policy: allow interactive login only for the admin account.
    if (parsed.data.username !== "admin") {
      return reply.status(401).send({ error: "invalid_credentials" });
    }

    const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (!user || !verifyPassword(parsed.data.password, user.password)) {
      return reply.status(401).send({ error: "invalid_credentials" });
    }

    const accessToken = app.jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      { expiresIn: "15m" }
    );
    const refreshToken = app.jwt.sign(
      { sub: user.id, kind: "refresh" },
      { expiresIn: "7d" }
    );

    return { accessToken, refreshToken, role: user.role };
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (!body?.refreshToken) {
      return reply.status(400).send({ error: "missing_refresh_token" });
    }

    try {
      const decoded = app.jwt.verify<{ sub: string; kind: string }>(body.refreshToken);
      if (decoded.kind !== "refresh") {
        return reply.status(401).send({ error: "invalid_refresh_token" });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        return reply.status(401).send({ error: "invalid_refresh_token" });
      }

      const accessToken = app.jwt.sign(
        { sub: user.id, username: user.username, role: user.role },
        { expiresIn: "15m" }
      );

      return { accessToken };
    } catch {
      return reply.status(401).send({ error: "invalid_refresh_token" });
    }
  });
}
