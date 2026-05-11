import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({
    status: "ok",
    version: "0.1.0"
  }));
}
