import type { Server } from "socket.io";
import { prisma } from "../db/prisma.js";
import { tastingInclude, toTastingSummary } from "./mappers.js";

export function tastingRoom(code: string) {
  return `tasting:${code}`;
}

export async function emitTastingUpdate(io: Server, tastingId: string) {
  const tasting = await prisma.tasting.findUnique({
    where: { id: tastingId },
    include: tastingInclude,
  });

  if (!tasting) {
    return;
  }

  io.to(tastingRoom(tasting.code)).emit("tasting:updated", toTastingSummary(tasting));
}
