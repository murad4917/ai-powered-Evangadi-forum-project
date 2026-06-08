import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
// controllers
import {
  searchQuestionsSemanticController,
} from "../controller/question.controller.js";
// validations
import {
  searchQuestionsSemanticValidation,
} from "../validations/question.validation.js";
// routes
const router = express.Router();

/**
 * @route GET /api/questions/search
 * @desc Semantic search for questions using vector embeddings based on a text query
 * @access Private
 */
router.get("/search", authenticateUser, searchQuestionsSemanticValidation, searchQuestionsSemanticController);

export default router;
