import { Router } from "express";
import momoController from "../controllers/momoController.js";

const momoRoutes = Router();

momoRoutes.post("/create", momoController.createPayment);        
momoRoutes.get("/callback", momoController.callback);            
momoRoutes.post("/ipn", momoController.ipn);

export default momoRoutes;