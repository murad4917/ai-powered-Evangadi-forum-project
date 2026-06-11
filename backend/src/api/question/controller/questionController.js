import { StatusCodes } from "http-status-codes";
import {
  createQuestionService,
  getQuestionsService,
  getSingleQuestionService,
  searchQuestionsSemanticService,
  getSimilarQuestionsService,
} from "../service/question.service.js";
import {
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
} from "../service/geminiTextCoach.service.js";

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
 * Handles fetching a single question with answers. Max 100 answers.
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

/**
 * Handle listing questions with optional search and filtering max 100 records
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      mine: req.query.mine === "true" || req.query.mine === true,
      userId: req.user.id, // pass authenticated user id for filtering if mine=true
    };
    const result = await getQuestionsService(filters);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Questions retrieved successfully",
      ...result,
    });
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};

export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const result = await searchQuestionsSemanticService({
      query: req.query.query,
      k: req.query.k ? Number(req.query.k) : 5,
      threshold:
        req.query.threshold !== undefined
          ? Number(req.query.threshold)
          : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Semantic search completed successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const k = req.query.k ? Number(req.query.k) : undefined;
    const threshold =
      req.query.threshold !== undefined
        ? Number(req.query.threshold)
        : undefined;
    const result = await getSimilarQuestionsService({
      questionHash,
      k,
      threshold,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Similar questions fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
