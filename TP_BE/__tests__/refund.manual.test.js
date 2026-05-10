import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/createApp.js";
import Booking from "../src/models/Booking.js";

async function registerAndLogin(app, { name, email, password, role }) {
  await request(app).post("/api/auth/register").send({ name, email, password, role }).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return res.body?.token;
}

describe("Refund manual flow", () => {
  /** @type {import("mongodb-memory-server").MongoMemoryServer | null} */
  let mongo = null;
  /** @type {import("express").Express} */
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test_secret";
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "test" });
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  afterEach(async () => {
    const colls = await mongoose.connection.db.collections();
    await Promise.all(colls.map((c) => c.deleteMany({})));
  });

  test("user can request refund with payout info; admin can approve -> booking marked refunded/paid", async () => {
    const userEmail = `user_${Date.now()}@example.com`;
    const adminEmail = `admin_${Date.now()}@example.com`;
    const pwd = "123456";

    const userToken = await registerAndLogin(app, {
      name: "User",
      email: userEmail,
      password: pwd,
      role: "user",
    });

    const adminToken = await registerAndLogin(app, {
      name: "Admin",
      email: adminEmail,
      password: pwd,
      role: "admin",
    });

    // create a paid booking that can be cancelled/refunded
    const booking = await Booking.create({
      user_id: new mongoose.Types.ObjectId(), // placeholder, will set to real user below
      check_in_date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      check_out_date: new Date(Date.now() + 6 * 24 * 3600 * 1000),
      room_quantity: 1,
      total_price: 1100000,
      prepaid_amount: 1100000,
      is_paid: true,
      status: "confirmed",
      payment_provider: "momo",
      payment_transaction_id: "TRANS_TEST",
      guest_name: "Guest",
    });

    // patch booking.user_id to match registered user
    const loginRes = await request(app).post("/api/auth/login").send({ email: userEmail, password: pwd });
    const userId = loginRes.body?.user?._id;
    booking.user_id = new mongoose.Types.ObjectId(String(userId));
    await booking.save();

    const reqRes = await request(app)
      .post("/api/refunds/request")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        bookingId: String(booking._id),
        reason: "Không đi được",
        payoutMethod: "momo",
        payoutPhone: "0900000000",
      })
      .expect(201);

    expect(String(reqRes.body?.message || "")).toMatch(/admin/i);
    expect(reqRes.body?.refund?.status).toBe("pending");
    expect(reqRes.body?.refund?.payoutMethod).toBe("momo");
    expect(reqRes.body?.refund?.payoutPhone).toBe("0900000000");

    const listRes = await request(app)
      .get("/api/refunds/admin/list")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const item = listRes.body?.items?.find((x) => String(x.bookingId) === String(booking._id));
    expect(item).toBeTruthy();
    expect(item.payoutMethod).toBe("momo");

    const approveRes = await request(app)
      .post(`/api/refunds/admin/approve/${item.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ manualRef: "MANUAL_1", adminNote: "Đã chuyển khoản" })
      .expect(200);

    expect(approveRes.body?.refund?.status).toBe("completed");
    const updated = await Booking.findById(booking._id).lean();
    expect(updated?.refund_status).toBe("paid");
    expect(["refunded", "partial_refunded"]).toContain(String(updated?.deposit_status || ""));
  });

  test("admin can reject pending refund -> booking marked rejected", async () => {
    const userEmail = `user2_${Date.now()}@example.com`;
    const adminEmail = `admin2_${Date.now()}@example.com`;
    const pwd = "123456";

    const userToken = await registerAndLogin(app, {
      name: "User2",
      email: userEmail,
      password: pwd,
      role: "user",
    });

    const adminToken = await registerAndLogin(app, {
      name: "Admin2",
      email: adminEmail,
      password: pwd,
      role: "admin",
    });

    const loginRes = await request(app).post("/api/auth/login").send({ email: userEmail, password: pwd });
    const userId = loginRes.body?.user?._id;

    const booking = await Booking.create({
      user_id: new mongoose.Types.ObjectId(String(userId)),
      check_in_date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      check_out_date: new Date(Date.now() + 6 * 24 * 3600 * 1000),
      room_quantity: 1,
      total_price: 1100000,
      prepaid_amount: 1100000,
      is_paid: true,
      status: "confirmed",
      payment_provider: "momo",
      payment_transaction_id: "TRANS_TEST_2",
      guest_name: "Guest2",
    });

    await request(app)
      .post("/api/refunds/request")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        bookingId: String(booking._id),
        reason: "Đổi lịch",
        payoutMethod: "bank",
        payoutBankName: "VCB",
        payoutBankAccountNumber: "0123456789",
        payoutBankAccountName: "NGUYEN VAN A",
      })
      .expect(201);

    const listRes = await request(app)
      .get("/api/refunds/admin/list")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const item = listRes.body?.items?.find((x) => String(x.bookingId) === String(booking._id));
    expect(item).toBeTruthy();

    await request(app)
      .post(`/api/refunds/admin/reject/${item.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Không đủ điều kiện" })
      .expect(200);

    const updated = await Booking.findById(booking._id).lean();
    expect(updated?.refund_status).toBe("rejected");
    expect(String(updated?.refund_rejected_reason || "")).toMatch(/không đủ/i);
  });
});

