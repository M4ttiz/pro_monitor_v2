import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

export let io: Server;

export const setupSocket = (httpServer: HttpServer, jwtSecret: string): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("unauthorized"));
    }

    try {
      jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  return io;
};
