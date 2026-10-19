import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import { Role } from "../src/generated/prisma/client.js";
import { prisma } from "../src/lib/prisma.js";

const rooms = [
  { name: "Garonne", capacity: 4, floor: 1, equipment: ["screen", "whiteboard"] },
  { name: "Chartrons", capacity: 8, floor: 1, equipment: ["screen", "videoconference"] },
  { name: "Bastide", capacity: 12, floor: 2, equipment: ["projector", "videoconference", "whiteboard"] },
  { name: "Pey-Berland", capacity: 30, floor: 3, equipment: ["projector", "microphone"] },
];

const seed = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the database.");
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: "Administrator",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, env.PASSWORD_HASH_ROUNDS),
    },
  });

  for (const room of rooms) {
    await prisma.room.upsert({ where: { name: room.name }, update: {}, create: room });
  }
};

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
