import { Router } from "express";
import momoController from "../controllers/momoController";

const momoRoutes = Router();

momoRoutes.post("/create", momoController.createPayment);        
momoRoutes.get("/callback", momoController.callback);            
momoRoutes.post("/ipn", momoController.ipn);                   
momoRoutes.get("/query/:orderId", momoController.queryTransaction); 

export default momoRoutes;