import { Router } from "express";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  requestRefund,
  approveRefundManual,
  rejectRefundManual,
  getMyRefunds,
  getRefundDetail,
  listRefundsAdmin,
} from "../controllers/refundController.js";

const refundRouter = Router();

refundRouter.post("/request", authenticateToken, requestRefund);
refundRouter.get("/my", authenticateToken, getMyRefunds);
refundRouter.get("/admin/list", authenticateToken, checkAdmin, listRefundsAdmin);
refundRouter.post("/admin/approve/:refundId", authenticateToken, checkAdmin, approveRefundManual);
refundRouter.post("/admin/reject/:refundId", authenticateToken, checkAdmin, rejectRefundManual);
refundRouter.get("/:refundId", authenticateToken, getRefundDetail);

export default refundRouter;
