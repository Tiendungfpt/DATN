import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  listServiceCategories,
  createServiceCategory,
  updateServiceCategory,
} from "../controllers/serviceCategoryController.js";

const r = Router();

r.get("/", checkAuth, listServiceCategories);
r.post("/", checkAuth, checkAdmin, createServiceCategory);
r.put("/:id", checkAuth, checkAdmin, updateServiceCategory);

export default r;

