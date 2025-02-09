import express from "express";
import { 
    createPromo
} from "../controllers/deal.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.post("/", verifyToken, createPromo);
export default router;