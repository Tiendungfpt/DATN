import { Router } from "express";
import momoController from "../controllers/momoController.js";

const momoRoutes = Router();

momoRoutes.post("/create", momoController.createPayment);        
momoRoutes.get("/callback", momoController.callback);            

export default momoRoutes;