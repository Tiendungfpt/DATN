/**
 * Phải import file này TRƯỚC mọi model/router khác trong app.js
 * để strictPopulate áp dụng đúng (import ES module chạy trước thân file).
 */
import mongoose from "mongoose";

mongoose.set("strictPopulate", false);
