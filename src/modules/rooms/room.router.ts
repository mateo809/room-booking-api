import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { requireRole } from "../../middleware/authenticate.js";
import {
  createRoomSchema,
  listRoomsQuerySchema,
  roomParamsSchema,
  roomScheduleQuerySchema,
  updateRoomSchema,
} from "./room.schemas.js";
import { createRoom, getRoom, getRoomSchedule, listRooms, updateRoom } from "./room.service.js";

export const roomRouter = Router();

roomRouter.get("/", async (req, res) => {
  res.json(await listRooms(listRoomsQuerySchema.parse(req.query)));
});

roomRouter.get("/:roomId", async (req, res) => {
  const { roomId } = roomParamsSchema.parse(req.params);
  res.json(await getRoom(roomId));
});

roomRouter.get("/:roomId/schedule", async (req, res) => {
  const { roomId } = roomParamsSchema.parse(req.params);
  res.json(await getRoomSchedule(roomId, roomScheduleQuerySchema.parse(req.query)));
});

roomRouter.post("/", requireRole(Role.ADMIN), async (req, res) => {
  res.status(201).json(await createRoom(createRoomSchema.parse(req.body)));
});

roomRouter.patch("/:roomId", requireRole(Role.ADMIN), async (req, res) => {
  const { roomId } = roomParamsSchema.parse(req.params);
  res.json(await updateRoom(roomId, updateRoomSchema.parse(req.body)));
});
