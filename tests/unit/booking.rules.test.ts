import { describe, expect, it } from "vitest";
import { Role } from "../../src/generated/prisma/client.js";
import { AppError } from "../../src/lib/errors.js";
import {
  assertCancellable,
  assertRoomCapacity,
  assertValidBookingPeriod,
  canManageBooking,
} from "../../src/modules/bookings/booking.rules.js";

const now = new Date("2030-03-10T09:00:00Z");
const at = (time: string) => new Date(`2030-03-10T${time}:00Z`);

describe("assertValidBookingPeriod", () => {
  it("accepts a period in the future within the allowed duration", () => {
    expect(() => {
      assertValidBookingPeriod(at("10:00"), at("11:30"), now);
    }).not.toThrow();
  });

  it.each([
    ["starts in the past", at("08:00"), at("09:30")],
    ["ends before it starts", at("11:00"), at("10:00")],
    ["is shorter than 15 minutes", at("10:00"), at("10:10")],
    ["is longer than 8 hours", at("10:00"), at("18:30")],
  ])("rejects a period that %s", (_description, startsAt, endsAt) => {
    expect(() => {
      assertValidBookingPeriod(startsAt, endsAt, now);
    }).toThrow(AppError);
  });
});

describe("assertRoomCapacity", () => {
  it("accepts a number of attendees equal to the capacity", () => {
    expect(() => {
      assertRoomCapacity(6, 6);
    }).not.toThrow();
  });

  it("rejects more attendees than the capacity", () => {
    expect(() => {
      assertRoomCapacity(7, 6);
    }).toThrow("This room can host up to 6 people.");
  });
});

describe("assertCancellable", () => {
  it("rejects a booking that has already started", () => {
    expect(() => {
      assertCancellable(at("08:30"), now);
    }).toThrow(AppError);
  });
});

describe("canManageBooking", () => {
  const booking = { userId: "owner" };

  it("allows the owner", () => {
    expect(canManageBooking({ id: "owner", role: Role.MEMBER }, booking)).toBe(true);
  });

  it("allows an administrator", () => {
    expect(canManageBooking({ id: "admin", role: Role.ADMIN }, booking)).toBe(true);
  });

  it("denies another member", () => {
    expect(canManageBooking({ id: "someone-else", role: Role.MEMBER }, booking)).toBe(false);
  });
});
