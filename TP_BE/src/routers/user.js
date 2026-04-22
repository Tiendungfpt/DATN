import express from "express";
import { 
  getUserProfile, 
  updateUserProfile, 
  updateUserAvatar,
  changePassword 
} from "../controllers/userController.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

import { checkAuth } from "../middlewares/checkAuth.js";
import upload from "../middlewares/upload.js";

router.get("/profile", checkAuth, getUserProfile);

router.put("/profile", checkAuth, updateUserProfile);

router.put("/avatar", checkAuth, upload.single("avatar"), updateUserAvatar);

router.put("/change-password", checkAuth, changePassword);
router.get("/notifications", checkAuth, getMyNotifications);
router.patch("/notifications/read-all", checkAuth, markAllNotificationsRead);
router.patch("/notifications/:id/read", checkAuth, markNotificationRead);

export default router;