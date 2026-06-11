import express from "express";
import {
  createQuestionController,
  generateQuestionDraftCoachController,
  getQuestionsController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
} from "../controller/questionController.js";
import {
  createQuestionValidation,
  generateQuestionDraftCoachValidation,
  getQuestionsValidation,
  searchQuestionsSemanticValidation,
  getSimilarQuestionsValidation,
} from "../validations/question.validation.js";
import { authenticateUser } from "../../../middleware/authentication.js";

const router = express.Router();

router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

router.post(
  "/draft-coach",
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

router.get(
  "/",
  authenticateUser,
  getQuestionsValidation,
  getQuestionsController,
);

router.get(
  "/search",
  authenticateUser,
  searchQuestionsSemanticValidation,
  searchQuestionsSemanticController,
);

router.get(
  "/:questionHash/similar",
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);

export default router;
