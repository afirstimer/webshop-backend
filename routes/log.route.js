import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    getLogs,
    getLog,
    createLog,    
} from "../controllers/log.controller.js";

const router = express.Router();

router.get("/", verifyToken, getLogs);
router.get("/:id", verifyToken, getLog);
router.post("/", verifyToken, createLog);

export default router;