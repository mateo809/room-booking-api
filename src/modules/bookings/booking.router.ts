import { Router } from "express";
import { currentUser } from "../../middleware/authenticate.js";
import { bookingParamsSchema, createBookingSchema, listMyBookingsQuerySchema } from "./booking.schemas.js";
import { cancelBooking, createBooking, getBooking, listMyBookings } from "./booking.service.js";

export const bookingRouter = Router();

bookingRouter.post("/", async (req, res) => {
  res.status(201).json(await createBooking(currentUser(req), createBookingSchema.parse(req.body)));
});

bookingRouter.get("/me", async (req, res) => {
  res.json(await listMyBookings(currentUser(req), listMyBookingsQuerySchema.parse(req.query)));
});

bookingRouter.get("/:bookingId", async (req, res) => {
  const { bookingId } = bookingParamsSchema.parse(req.params);
  res.json(await getBooking(currentUser(req), bookingId));
});

bookingRouter.post("/:bookingId/cancel", async (req, res) => {
  const { bookingId } = bookingParamsSchema.parse(req.params);
  res.json(await cancelBooking(currentUser(req), bookingId));
});
