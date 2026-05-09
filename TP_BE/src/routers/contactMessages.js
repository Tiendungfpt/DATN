import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  createContactMessage,
  getAllContactMessagesAdmin,
  getMyContactMessages,
  markContactReplyAsRead,
  replyContactMessageAdmin,
  closeContactMessageAdmin,
} from "../controllers/contactMessageController.js";

const router = Router();

router.post("/", createContactMessage);
router.get("/my", checkAuth, getMyContactMessages);
router.put("/:id/read-reply", checkAuth, markContactReplyAsRead);
router.get("/", checkAuth, checkAdmin, getAllContactMessagesAdmin);
router.put("/:id/reply", checkAuth, checkAdmin, replyContactMessageAdmin);
router.put("/:id/close", checkAuth, checkAdmin, closeContactMessageAdmin);

export default router;
