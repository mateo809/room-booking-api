import request from "supertest";
import { createApp } from "../src/app.js";
import { Role } from "../src/generated/prisma/client.js";
import { prisma } from "../src/lib/prisma.js";
import { signAccessToken } from "../src/modules/auth/token.js";

export const app = createApp();

export const DEFAULT_PASSWORD = "password-used-in-tests";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

export interface TestUser {
  id: string;
  token: string;
}

export const resetDatabase = () => prisma.$executeRaw`TRUNCATE TABLE bookings, rooms, users CASCADE`;

export const uniqueEmail = () => `user-${crypto.randomUUID()}@example.com`;

export const hoursFromNow = (hours: number) =>
  new Date(
    Math.ceil(Date.now() / HOUR_IN_MILLISECONDS) * HOUR_IN_MILLISECONDS + hours * HOUR_IN_MILLISECONDS,
  );

export const createMember = async (): Promise<TestUser> => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ email: uniqueEmail(), password: DEFAULT_PASSWORD, fullName: "Test Member" })
    .expect(201);

  const body = response.body as { accessToken: string; user: { id: string } };
  return { id: body.user.id, token: body.accessToken };
};

export const createAdmin = async (): Promise<TestUser> => {
  const admin = await prisma.user.create({
    data: { email: uniqueEmail(), fullName: "Test Admin", passwordHash: "not-used", role: Role.ADMIN },
  });

  return { id: admin.id, token: signAccessToken({ id: admin.id, role: admin.role }).accessToken };
};

export const createRoom = async (admin: TestUser, overrides: Record<string, unknown> = {}) => {
  const response = await request(app)
    .post("/api/rooms")
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ name: `Room ${crypto.randomUUID()}`, capacity: 6, floor: 1, equipment: ["screen"], ...overrides })
    .expect(201);

  return response.body as { id: string; name: string; capacity: number };
};

export const bookRoom = (user: TestUser, roomId: string, startsAt: Date, endsAt: Date, attendees = 2) =>
  request(app).post("/api/bookings").set("Authorization", `Bearer ${user.token}`).send({
    roomId,
    title: "Team meeting",
    attendees,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
