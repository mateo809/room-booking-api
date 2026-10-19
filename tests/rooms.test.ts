import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  app,
  bookRoom,
  createAdmin,
  createMember,
  createRoom,
  hoursFromNow,
  resetDatabase,
  type TestUser,
} from "./helpers.js";

describe("rooms", () => {
  let admin: TestUser;
  let member: TestUser;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
    member = await createMember();
  });

  it("lets an administrator create a room", async () => {
    const response = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Garonne", capacity: 8, floor: 2, equipment: ["Screen", "screen", "Whiteboard"] })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Garonne",
      capacity: 8,
      floor: 2,
      equipment: ["screen", "whiteboard"],
      isActive: true,
    });
  });

  it("forbids members from creating rooms", async () => {
    await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ name: "Garonne", capacity: 8, floor: 2 })
      .expect(403);
  });

  it("rejects a duplicate room name", async () => {
    await createRoom(admin, { name: "Garonne" });

    await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Garonne", capacity: 4, floor: 1 })
      .expect(409);
  });

  it("filters rooms by capacity and equipment", async () => {
    await createRoom(admin, { name: "Small", capacity: 4, equipment: ["screen"] });
    await createRoom(admin, { name: "Large", capacity: 20, equipment: ["projector"] });
    await createRoom(admin, { name: "Medium", capacity: 10, equipment: ["screen", "projector"] });

    const response = await request(app)
      .get("/api/rooms")
      .query({ minCapacity: 8, equipment: "projector" })
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body.totalCount).toBe(2);
    expect(response.body.items.map((room: { name: string }) => room.name).sort()).toEqual([
      "Large",
      "Medium",
    ]);
  });

  it("only lists rooms available for the requested period", async () => {
    const bookedRoom = await createRoom(admin, { name: "Booked" });
    await createRoom(admin, { name: "Free" });
    await bookRoom(member, bookedRoom.id, hoursFromNow(2), hoursFromNow(3)).expect(201);

    const response = await request(app)
      .get("/api/rooms")
      .query({ availableFrom: hoursFromNow(2.5).toISOString(), availableTo: hoursFromNow(4).toISOString() })
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body.items.map((room: { name: string }) => room.name)).toEqual(["Free"]);
  });

  it("hides deactivated rooms", async () => {
    const room = await createRoom(admin, { name: "Closed" });

    await request(app)
      .patch(`/api/rooms/${room.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ isActive: false })
      .expect(200);

    const response = await request(app)
      .get("/api/rooms")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body.totalCount).toBe(0);
  });

  it("returns 404 for an unknown room", async () => {
    await request(app)
      .get(`/api/rooms/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${member.token}`)
      .expect(404);
  });

  it("returns the schedule of a room", async () => {
    const room = await createRoom(admin);
    await bookRoom(member, room.id, hoursFromNow(1), hoursFromNow(2)).expect(201);
    await bookRoom(member, room.id, hoursFromNow(3), hoursFromNow(4)).expect(201);

    const response = await request(app)
      .get(`/api/rooms/${room.id}/schedule`)
      .query({ from: hoursFromNow(0).toISOString(), to: hoursFromNow(24).toISOString() })
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).not.toHaveProperty("userId");
  });
});
