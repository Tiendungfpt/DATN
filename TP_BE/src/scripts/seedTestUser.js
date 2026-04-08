import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/thinhphathotel";

const TEST_USER = {
  name: process.env.TEST_USER_NAME || "Test Thinh Phat Hotel",
  email: (process.env.TEST_USER_EMAIL || "test@thinhphathotel.com")
    .trim()
    .toLowerCase(),
  password: process.env.TEST_USER_PASSWORD || "12345678",
  role: process.env.TEST_USER_ROLE === "admin" ? "admin" : "user",
};

const seedTestUser = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    const existingUser = await User.findOne({ email: TEST_USER.email });
    if (existingUser) {
      console.log(`Test user already exists: ${TEST_USER.email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    await User.create({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: hashedPassword,
      role: TEST_USER.role,
    });

    console.log("Created default test user successfully.");
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`Role: ${TEST_USER.role}`);
  } catch (error) {
    console.error("Failed to seed test user:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedTestUser();
