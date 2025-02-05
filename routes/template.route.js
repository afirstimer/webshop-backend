import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { 
    getTemplates,
    getTemplatesByShop,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate
} from "../controllers/template.controller.js";

const router = express.Router();

router.get("/", verifyToken, getTemplates);
router.get("/shop/:id", verifyToken, getTemplatesByShop);
router.get("/:id", verifyToken, getTemplate);
router.post("/", verifyToken, createTemplate);
router.put("/:id", verifyToken, updateTemplate);
router.delete("/:id", verifyToken, deleteTemplate);

export default router;