import express from "express";
import {
  getPromos,
  getPromo,
  createPromo,
  updatePromo,
  updatePromoProducts,
  removePromoProducts,
  getCoupons,
  getJSONPromos,
} from "../controllers/promo.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.get("/", verifyToken, getPromos);
router.get("/json", verifyToken, getJSONPromos);
router.get("/:id", verifyToken, getPromo);
router.post("/", verifyToken, createPromo);
router.put("/:id", verifyToken, updatePromo);
router.put("/:id/products", verifyToken, updatePromoProducts);
router.delete("/:id/products", verifyToken, removePromoProducts);
router.get("/coupons", verifyToken, getCoupons);
export default router;
