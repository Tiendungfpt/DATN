import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  createDiscountCode,
  deleteDiscountCode,
  listDiscountCodes,
  listPublicDiscountCodes,
  updateDiscountCode,
  validateDiscountCode,
} from "../controllers/discountCodeController.js";

const r = Router();

r.get("/validate", validateDiscountCode);
r.get("/public", listPublicDiscountCodes);
r.get("/", checkAuth, checkAdmin, listDiscountCodes);
r.post("/", checkAuth, checkAdmin, createDiscountCode);
r.put("/:id", checkAuth, checkAdmin, updateDiscountCode);
r.delete("/:id", checkAuth, checkAdmin, deleteDiscountCode);

export default r;
