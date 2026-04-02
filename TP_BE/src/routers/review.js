import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { createReview } from "../controllers/review.js";

const reviewRouter = Router();

reviewRouter.post("/", checkAuth, createReview);

export default reviewRouter;
