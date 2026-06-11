import express from "express";
import {
  createQuestionController,
  generateQuestionDraftCoachController,
} from "../controller/questionController.js";
import {
  createQuestionValidation,
  generateQuestionDraftCoachValidation,
} from "../validations/question.validation.js";
import { authenticateUser } from "../../../middleware/authentication.js";
  getQuestionsController,
  getQuestionsValidation,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
} from '../controller/questionController.js';
import {
  createQuestionValidation,
  searchQuestionsSemanticValidation,
  getSimilarQuestionsValidation,
} from '../validations/question.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route POST /api/question
 * @desc Create a new question
 * @access Protected
 * @history Checked against production standard
 */
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route POST /api/question/draft-coach
 * @desc Generate AI improvement tips for a draft question [Task T-17]
 * @access Protected
 */
router.post(
  "/draft-coach",
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,

/**
 * @route GET /api/questions
 * @desc List questions with optional search and filtering
 * @access Protected
 */
router.get('/', 
  authenticateUser,
  getQuestionsValidation, 
  getQuestionsController);

/**
 * @route GET /api/questions/search
 * @desc Semantic search for questions using vector embeddings based on a text query
 * @access Private
 */
router.get(
  "/search",
  authenticateUser,
  searchQuestionsSemanticValidation,
  searchQuestionsSemanticController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Get similar questions based on vector embeddings
 * @access Private (Requires Bearer Token)
 */
router.get(
  "/:questionHash/similar",
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);
export default router;
