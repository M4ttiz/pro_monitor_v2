import type { FastifyInstance } from "fastify";

export async function registerAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/agent/version", async () => ({
    version: "0.1.0",
    downloadUrl: "/downloads/pro-monitor-agent-0.1.0.exe"
  }));
}
