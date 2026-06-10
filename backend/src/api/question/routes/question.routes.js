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
);

export default router;
