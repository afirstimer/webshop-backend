import express from "express";
import {
    getWarehouses,
    getWarehouse,
    createWarehouse    
} from "../controllers/warehouse.controller.js";
import {verifyToken} from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getWarehouses);
router.get("/:id", verifyToken, getWarehouse);
router.post("/", verifyToken, createWarehouse);

export default router;