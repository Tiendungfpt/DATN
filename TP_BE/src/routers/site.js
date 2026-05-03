import { Router } from "express";
import {
  getLocation,
  listAmenities,
  listFaqs,
  listGallery,
  listRecentReviews,
  listRatings,
  subscribeNewsletter,
} from "../controllers/siteContent.js";

const siteRouter = Router();

siteRouter.get("/amenities", listAmenities);
siteRouter.get("/gallery", listGallery);
siteRouter.get("/ratings", listRatings);
siteRouter.get("/location", getLocation);
siteRouter.get("/faqs", listFaqs);
siteRouter.get("/reviews", listRecentReviews);
siteRouter.post("/newsletter", subscribeNewsletter);

export default siteRouter;

