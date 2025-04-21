import express from "express";

import { createSurvey } from "../controllers/survey.controller.js";

const router = express.Router();

router.post("/", createSurvey);

export default router;
