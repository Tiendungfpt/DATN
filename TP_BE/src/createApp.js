import "./config/loadEnv.js";
import "./config/mongooseInit.js";
import express from "express";
import cors from "cors";

import postRouter from "./routers/post.js";
import roomsRouter from "./routers/rooms.js";
import authRouter from "./routers/auth.js";
import hotelRouter from "./routers/hotel.js";
import bookingRouter from "./routers/booking.js";
import hotelBusinessFlowRouter from "./routers/hotelBusinessFlow.js";
import roomTypesRouter from "./routers/roomTypes.js";
import servicesCatalogRouter from "./routers/servicesCatalog.js";
import serviceCategoriesRouter from "./routers/serviceCategories.js";
import reviewRouter from "./routers/review.js";
import adminRouter from "./routers/admin.js";
import momoRouter from "./routers/momoRoutes.js";
import userRoutes from "./routers/user.js";
import dashboardRoutes from "./routers/dashboard.route.js";
import siteRouter from "./routers/site.js";
import adminSiteRouter from "./routers/adminSite.js";
import contactMessagesRouter from "./routers/contactMessages.js";
import discountCodesRouter from "./routers/discountCodes.js";
import refundRouter from "./routers/refund.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use("/api/hotels", hotelRouter);
  app.use("/api/posts", postRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api", hotelBusinessFlowRouter);
  app.use("/api/room-types", roomTypesRouter);
  app.use("/api/service-categories", serviceCategoriesRouter);
  app.use("/api/services-catalog", servicesCatalogRouter);
  app.use("/api/reviews", reviewRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin/site", adminSiteRouter);
  app.use("/api/momo", momoRouter);
  app.use("/api/users", userRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/site", siteRouter);
  app.use("/api/contact-messages", contactMessagesRouter);
  app.use("/api/discount-codes", discountCodesRouter);
  app.use("/api/refunds", refundRouter);

  app.use("/uploads", express.static("uploads"));

  return app;
}

