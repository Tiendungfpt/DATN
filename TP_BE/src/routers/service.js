import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

const serviceRouter = Router();

// Public route
serviceRouter.get("/", getAllServices);
serviceRouter.get("/:id", getServiceById);

// Admin routes
serviceRouter.post("/", checkAuth, checkAdmin, createService);
serviceRouter.put("/:id", checkAuth, checkAdmin, updateService);
serviceRouter.delete("/:id", checkAuth, checkAdmin, deleteService);

export default serviceRouter;
