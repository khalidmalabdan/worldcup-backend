import { Server } from "socket.io";
import { Server as HTTPServer } from "http";

export let io: Server;

export function setupSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("match:subscribe", (matchId: string) => {
      socket.join(`match:${matchId}`);
    });

    socket.on("league:subscribe", (leagueId: string) => {
      socket.join(`league:${leagueId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}
