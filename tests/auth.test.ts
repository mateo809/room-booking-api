import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app, DEFAULT_PASSWORD, resetDatabase, uniqueEmail } from "./helpers.js";

describe("auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("registers a member and returns an access token", async () => {
    const email = uniqueEmail();

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: `  ${email.toUpperCase()} `, password: DEFAULT_PASSWORD, fullName: "Jane Doe" })
      .expect(201);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      expiresIn: expect.any(Number),
      user: { email, fullName: "Jane Doe", role: "MEMBER" },
    });
    expect(response.body).not.toHaveProperty("user.passwordHash");
  });

  it("rejects a duplicate email", async () => {
    const email = uniqueEmail();
    const payload = { email, password: DEFAULT_PASSWORD, fullName: "Jane Doe" };
    await request(app).post("/api/auth/register").send(payload).expect(201);

    const response = await request(app).post("/api/auth/register").send(payload).expect(409);

    expect(response.body).toMatchObject({ error: { code: "CONFLICT" } });
  });

  it("rejects an invalid payload with validation details", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short", fullName: "" })
      .expect(400);

    expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(response.body.error.details).toHaveLength(3);
  });

  it("rejects malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{ invalid")
      .expect(400);

    expect(response.body).toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it("logs in with valid credentials", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, fullName: "Jane Doe" })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: DEFAULT_PASSWORD })
      .expect(200);

    expect(response.body).toMatchObject({ accessToken: expect.any(String), user: { email } });
  });

  it("rejects a wrong password", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, fullName: "Jane Doe" })
      .expect(201);

    await request(app).post("/api/auth/login").send({ email, password: "wrong-password" }).expect(401);
  });

  it("returns the current user profile", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .send({ email: uniqueEmail(), password: DEFAULT_PASSWORD, fullName: "Jane Doe" })
      .expect(201);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registration.body.accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(registration.body.user.id);
  });

  it("rejects requests without a valid token", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid").expect(401);
  });
});
