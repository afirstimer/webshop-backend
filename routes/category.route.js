import express from "express";
import { 
    getCategories,
    deleteCategory,
    getTikTokCategories,
    getTikTokCategoryAttributes
} from "../controllers/category.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getCategories);    //TODO: Replace with /tiktok
router.get("/attributes", verifyToken, getTikTokCategoryAttributes);
router.get("/tiktok", verifyToken, getTikTokCategories);
router.delete("/:id", verifyToken, deleteCategory);

export default router;