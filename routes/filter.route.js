import express from "express";
import { 
    getFilter, 
    updateFilter    
} from "../controllers/filter.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getFilter);
router.put("/", verifyToken, updateFilter);

export default router;