import express from "express";
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword 
} from "../controllers/userController.js";

const router = express.Router();

import { checkAuth } from "../middlewares/checkAuth.js";

router.get("/profile", checkAuth, getUserProfile);

router.put("/profile", checkAuth, updateUserProfile);

router.put("/change-password", checkAuth, changePassword);

export default router;