import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

import {
  getOrders,
  getOrderStats,
  getAllShopOrders,
  getTiktokOrder,
} from "../controllers/order.controller.js";

const router = express.Router();

router.get("/", verifyToken, getOrders);
router.get("/stats", verifyToken, getOrderStats);

// Tiktok
router.get("/tiktok/all-orders", verifyToken, getAllShopOrders);
router.get("/tiktok/:shopId/:id", verifyToken, getTiktokOrder);

export default router;
