import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  crawlArticle,
} from "../controllers/article.controller.js";

const router = express.Router();

router.get("/", getArticles);
router.get("/:slug", getArticle);
router.post("/", verifyToken, createArticle);
router.put("/:id", verifyToken, updateArticle);
router.delete("/:id", verifyToken, deleteArticle);

router.post("/crawl", crawlArticle);

export default router;
