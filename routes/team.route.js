import express from "express";
import {
    getTeams, 
    getTeam,    
    createTeam, 
    updateTeam,
    addMemberToTeam, 
    removeMemberFromTeam,
    deleteTeam
} from "../controllers/team.controller.js";
import {verifyToken} from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getTeams);
router.get("/:id", verifyToken, getTeam);
router.post("/", verifyToken, createTeam);
router.put("/:id", verifyToken, updateTeam);
router.post("/:id/members", verifyToken, addMemberToTeam);
router.delete("/:id/members", verifyToken, removeMemberFromTeam);
router.delete("/:id", verifyToken, deleteTeam);

export default router;