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



export default router;
