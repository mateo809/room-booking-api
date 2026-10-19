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

describe("bookings", () => {
  let admin: TestUser;
  let member: TestUser;
  let roomId: string;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
    member = await createMember();
    roomId = (await createRoom(admin, { capacity: 6 })).id;
  });

  it("books an available room", async () => {
    const response = await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);

    expect(response.body).toMatchObject({
      title: "Team meeting",
      status: "CONFIRMED",
      userId: member.id,
      room: { id: roomId },
    });
  });

  it("rejects an overlapping booking", async () => {
    const otherMember = await createMember();
    await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(4)).expect(201);

    const response = await bookRoom(otherMember, roomId, hoursFromNow(3), hoursFromNow(5)).expect(409);

    expect(response.body.error.message).toBe("The room is already booked for this period.");
  });

  it("accepts back-to-back bookings", async () => {
    await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);
    await bookRoom(member, roomId, hoursFromNow(3), hoursFromNow(4)).expect(201);
  });

  it("never stores overlapping bookings under concurrent requests", async () => {
    const members = await Promise.all([createMember(), createMember(), createMember(), createMember()]);

    const responses = await Promise.all(
      members.map((user) => bookRoom(user, roomId, hoursFromNow(5), hoursFromNow(6))),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(members.length - 1);
  });

  it("rejects a booking in the past", async () => {
    const response = await bookRoom(member, roomId, hoursFromNow(-3), hoursFromNow(-2)).expect(422);

    expect(response.body).toMatchObject({ error: { code: "BUSINESS_RULE_VIOLATION" } });
  });

  it("rejects more attendees than the room capacity", async () => {
    await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3), 7).expect(422);
  });

  it("rejects a booking for an unknown room", async () => {
    await bookRoom(member, crypto.randomUUID(), hoursFromNow(2), hoursFromNow(3)).expect(404);
  });

  it("lists upcoming bookings of the current member only", async () => {
    const otherMember = await createMember();
    await bookRoom(member, roomId, hoursFromNow(5), hoursFromNow(6)).expect(201);
    await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);
    await bookRoom(otherMember, roomId, hoursFromNow(8), hoursFromNow(9)).expect(201);

    const response = await request(app)
      .get("/api/bookings/me")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body.totalCount).toBe(2);
    const startTimes = response.body.items.map((booking: { startsAt: string }) => booking.startsAt);
    expect(startTimes).toEqual([hoursFromNow(2).toISOString(), hoursFromNow(5).toISOString()]);
  });

  it("lets the owner cancel a booking and frees the slot", async () => {
    const booking = await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);

    const response = await request(app)
      .post(`/api/bookings/${booking.body.id}/cancel`)
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ status: "CANCELLED", cancelledAt: expect.any(String) });
    await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);
  });

  it("rejects cancelling a booking twice", async () => {
    const booking = await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);
    const url = `/api/bookings/${booking.body.id}/cancel`;

    await request(app).post(url).set("Authorization", `Bearer ${member.token}`).expect(200);
    await request(app).post(url).set("Authorization", `Bearer ${member.token}`).expect(409);
  });

  it("hides a booking from other members", async () => {
    const otherMember = await createMember();
    const booking = await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);

    await request(app)
      .get(`/api/bookings/${booking.body.id}`)
      .set("Authorization", `Bearer ${otherMember.token}`)
      .expect(404);

    await request(app)
      .post(`/api/bookings/${booking.body.id}/cancel`)
      .set("Authorization", `Bearer ${otherMember.token}`)
      .expect(404);
  });

  it("lets an administrator cancel any booking", async () => {
    const booking = await bookRoom(member, roomId, hoursFromNow(2), hoursFromNow(3)).expect(201);

    await request(app)
      .post(`/api/bookings/${booking.body.id}/cancel`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
  });
});
