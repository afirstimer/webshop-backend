import express from "express";
import {     
    getSetting,
    createSetting,
    updateSetting,
    deleteSetting,
    getNotis
} from "../controllers/setting.controller.js";

const router = express.Router();

router.get("/", getSetting);
router.post("/", createSetting);
router.put("/", updateSetting);
router.delete("/:id", deleteSetting);

// Noti
router.get("/notis", getNotis);


export default router;