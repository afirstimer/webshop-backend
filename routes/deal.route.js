import express from "express";
import {
  createPromo,
  getPromo,
  createPromoDetail,
  deletePromo,
} from "../controllers/deal.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.post("/", verifyToken, createPromo);
router.get("/shop/:shopId/promo/:id", getPromo);
router.delete("/shop/:shopId/promo/:id", verifyToken, deletePromo);
router.post("/activities", verifyToken, createPromoDetail);
export default router;
