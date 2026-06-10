import { StatusCodes } from "http-status-codes";

// Only import createQuestionService since it's the only one used here right now
import { createQuestionService } from "../service/question.service.js";

// Import your draft coach service function
import { generateQuestionDraftCoachService } from "../service/geminiTextCoach.service.js";

/**
 * Handles creating a new question
 */
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const data = await createQuestionService({
      userId: req.user.id,
      title,
      content,
    });
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Question posted successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Generate AI improvement tips for a draft question [Task T-17]
 * @route POST /api/question/draft-coach
 * @access Protected
 */
export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    // Call your Gemini service function with the object it expects
    const result = await generateQuestionDraftCoachService({ title, content });

    // Return the tips back to Postman
    res.status(StatusCodes.OK).json({
      success: true,
      tips: result.tips,
    });
  } catch (error) {
    next(error);
  }
};
