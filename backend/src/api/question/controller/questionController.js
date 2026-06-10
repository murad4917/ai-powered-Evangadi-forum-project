import { StatusCodes } from 'http-status-codes';
import {
  createQuestionService,
  getQuestionsService,
  getSingleQuestionService,
  searchQuestionSemanticService,
} from '../service/question.service.js';
import { assessAnswerAgainstQuestionService } from '../service/geminTextCoach.service.js';


/**
 * Handles creating a new question
 * 
 * @param {import('express').Request} req - The request object
 * @param {import('express').Response} res - The response object
 * @returns {Promise<void>} - A promise that resolves when the question is created  
 * @returns {Promise<void>}
 */
export const createQuestionController = async (req, res, next) => {
    try {
        // Extract title and content from the request body
        const { title, content } = req.body;
        const data = await createQuestionService({
             userId: req.user.id //autor id (authenticated user)
            , title
            , content
        });
        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Question posted successfully.',
            data,
        });
    } catch (error) {
        next(error);
    }
};/**
 * Handles fetching a single question with answers. Max 100 answers.
 * * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const getSingleQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    
    const result = await getSingleQuestionService({
      questionHash,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Question fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};



