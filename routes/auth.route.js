import express from "express";
import { 
    login, 
    logout, 
    register,
    validateToken
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/validate-token", validateToken);

export default router;