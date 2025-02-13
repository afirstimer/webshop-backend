import express from "express";
import {
  getProxies,
  getProxy,
  createProxy,
  updateProxy,
  deleteProxy,
  connectViaProxy,
} from "../controllers/proxy.controller.js";

const router = express.Router();

router.get("/", getProxies);
router.post("/connect", connectViaProxy);
router.get("/:id", getProxy);
router.post("/", createProxy);
router.put("/:id", updateProxy);
router.delete("/:id", deleteProxy);

export default router;
