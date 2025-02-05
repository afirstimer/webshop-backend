import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { 
    crawlAmazonProduct,
    getListings,
    getListing,
    updateListing,
    deleteListing,
    getListingsOnShop
} from "../controllers/listing.controller.js";

const router = express.Router();

// crawl ko can verify token
router.post("/", crawlAmazonProduct);

// verify token
router.get("/",  verifyToken, getListings);
router.get("/listing-on-shops", verifyToken, getListingsOnShop);
router.get("/:id", verifyToken, getListing);
router.put("/:id", verifyToken, updateListing);
router.delete("/:id", verifyToken, deleteListing);

export default router;
