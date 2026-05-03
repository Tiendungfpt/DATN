import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  adminCreateAmenity,
  adminCreateFaq,
  adminCreateGallery,
  adminCreateLocationPlace,
  adminDeleteAmenity,
  adminDeleteFaq,
  adminDeleteGallery,
  adminDeleteLocationPlace,
  adminDeleteRating,
  adminListAmenities,
  adminListFaqs,
  adminListGallery,
  adminListLocationPlaces,
  adminListNewsletter,
  adminListRatings,
  adminUpdateAmenity,
  adminUpdateFaq,
  adminUpdateGallery,
  adminUpdateLocationPlace,
  adminUpsertRating,
} from "../controllers/adminSiteContent.js";
import { seedDefaultSiteContent } from "../controllers/siteSeed.js";

const adminSiteRouter = Router();

adminSiteRouter.use(checkAuth, checkAdmin);

// Amenities
adminSiteRouter.get("/amenities", adminListAmenities);
adminSiteRouter.post("/amenities", adminCreateAmenity);
adminSiteRouter.put("/amenities/:id", adminUpdateAmenity);
adminSiteRouter.delete("/amenities/:id", adminDeleteAmenity);

// Gallery
adminSiteRouter.get("/gallery", adminListGallery);
adminSiteRouter.post("/gallery", adminCreateGallery);
adminSiteRouter.put("/gallery/:id", adminUpdateGallery);
adminSiteRouter.delete("/gallery/:id", adminDeleteGallery);

// Ratings
adminSiteRouter.get("/ratings", adminListRatings);
adminSiteRouter.post("/ratings", adminUpsertRating);
adminSiteRouter.delete("/ratings/:id", adminDeleteRating);

// Location places
adminSiteRouter.get("/location-places", adminListLocationPlaces);
adminSiteRouter.post("/location-places", adminCreateLocationPlace);
adminSiteRouter.put("/location-places/:id", adminUpdateLocationPlace);
adminSiteRouter.delete("/location-places/:id", adminDeleteLocationPlace);

// FAQs
adminSiteRouter.get("/faqs", adminListFaqs);
adminSiteRouter.post("/faqs", adminCreateFaq);
adminSiteRouter.put("/faqs/:id", adminUpdateFaq);
adminSiteRouter.delete("/faqs/:id", adminDeleteFaq);

// Newsletter
adminSiteRouter.get("/newsletter", adminListNewsletter);

// Seed default content once (idempotent: only seeds empty collections)
adminSiteRouter.post("/seed", seedDefaultSiteContent);

export default adminSiteRouter;

