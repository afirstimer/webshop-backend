import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    getProducts,
    getProduct,
    getTiktokProduct,
    getJSONProducts,
    createProduct,
    editProduct,    
    uploadCert,
    uploadTiktokProducts,
    deleteProduct,
    updateTiktokProduct,
    updateTiktokPrice
} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/", verifyToken, getProducts);
router.get("/json", verifyToken, getJSONProducts);
router.get("/:id", verifyToken, getProduct);
router.post("/tiktok/:id", verifyToken, getTiktokProduct);
router.post("/edit/:id", verifyToken, editProduct);
router.post("/upload-cert", verifyToken, uploadCert);
router.post("/upload-to-tiktok", verifyToken, uploadTiktokProducts);
router.delete("/:id", verifyToken, deleteProduct);

// Tiktok
router.put("/tiktok-product/:id", verifyToken, updateTiktokProduct);
router.post("/tiktok-price", verifyToken, updateTiktokPrice);

export default router;