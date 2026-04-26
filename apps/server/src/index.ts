import "./env.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { tastingRoom } from "./api/realtime.js";

const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
  },
});

const app = createApp(io);
httpServer.on("request", (request, response) => {
  if (request.url?.startsWith("/socket.io/")) {
    return;
  }

  app(request, response);
});

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });

  socket.on("tasting:join", ({ code }: { code?: string }) => {
    if (!code) {
      return;
    }

    socket.join(tastingRoom(code.trim().toUpperCase()));
  });
});

httpServer.listen(port, () => {
  console.log(`Wine Sock API listening on http://localhost:${port}`);
});
