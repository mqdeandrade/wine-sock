import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "wine-sock" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });
});

httpServer.listen(port, () => {
  console.log(`Wine Sock API listening on http://localhost:${port}`);
});
