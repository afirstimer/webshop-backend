import express from "express";
import {
  createPromo,
  createPromoDetail,
} from "../controllers/deal.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.post("/", verifyToken, createPromo);
router.post("/activities", verifyToken, createPromoDetail);
export default router;
