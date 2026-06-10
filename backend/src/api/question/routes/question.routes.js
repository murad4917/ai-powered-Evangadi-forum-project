import express from 'express';
import {
  createQuestionController,
} from '../controller/questionController.js';
import {
  createQuestionValidation,
} from '../validations/question.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route POST /api/questions
 * @desc Create a new question
 * @access Protected
 */
router.post(
  '/',
  authenticateUser,  
  createQuestionValidation,
  createQuestionController,
);


/**
 * @route GET /api/questions
 * @desc List questions with optional search and filtering
 * @access Protected
 */
router.get('/', 
  authenticateUser,
  getQuestionsValidation, 
  getQuestionsController);


export default router;
