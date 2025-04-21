import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getArticlesByCategory,
} from "../controllers/article.category.controller.js";

const router = express.Router();

router.get("/all", getCategories);
router.get("/detail/:slug", getCategory);
router.get("/with-articles/:slug", getArticlesByCategory);
router.post("/", createCategory);
router.put("/:id", verifyToken, updateCategory);
router.delete("/:id", verifyToken, deleteCategory);

export default router;
