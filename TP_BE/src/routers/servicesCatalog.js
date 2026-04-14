import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  listServices,
  createService,
  updateService,
} from "../controllers/serviceCatalogController.js";

const r = Router();
r.get("/", checkAuth, listServices);
r.post("/", checkAuth, checkAdmin, createService);
r.put("/:id", checkAuth, checkAdmin, updateService);

export default r;
