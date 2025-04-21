import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

import {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getArticlesByTag,
} from "../controllers/tag.controller.js";

const router = express.Router();

router.get("/all", getTags);
router.get("/articles/:slug", getArticlesByTag);
router.get("/detail/:slug", getTag);
router.post("/", createTag);
router.put("/:id", verifyToken, updateTag);
router.delete("/:id", verifyToken, deleteTag);

export default router;
