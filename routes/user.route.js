import express from "express";
import {
  deleteUser,
  deleteMultiUsers,
  getUser,
  createUser,
  getUsers,
  getMembers,
  getUsersByTeamID,
  updateUser,
  addUsersToGroup,
  savePost,
  profilePosts,
  getNotificationNumber,
  upgradeToAdmin,
  checkHasDefaultShop,
  removeDefaultShop
} from "../controllers/user.controller.js";
import {verifyToken} from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getUsers);
router.get("/members", verifyToken, getMembers);
router.get("/ids/:teamId", verifyToken, getUsersByTeamID);
router.get("/:id", verifyToken, getUser);
router.post("/getDefaultShop", verifyToken, checkHasDefaultShop);
router.post("/removeDefaultShop/:id", verifyToken, removeDefaultShop);
router.post("/", verifyToken, createUser);
router.post("/addToGroup", verifyToken, addUsersToGroup);
router.put("/:id", verifyToken, updateUser);
router.delete("/multi", verifyToken, deleteMultiUsers);
router.delete("/:id", verifyToken, deleteUser);
router.post("/save", verifyToken, savePost);
router.get("/profilePosts", verifyToken, profilePosts);
router.get("/notification", verifyToken, getNotificationNumber);

/** Upgrade account */
router.put("/toAdmin/:id", verifyToken, upgradeToAdmin);

export default router;