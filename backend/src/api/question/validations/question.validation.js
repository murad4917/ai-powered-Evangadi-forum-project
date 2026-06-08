import { query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

/**
 * Validation for searching questions semantically
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next function
 * @returns {void}
 */
export const searchQuestionsSemanticValidation = [
  query("query")
    .notEmpty()
    .withMessage("query is required")
    .isString()
    .withMessage("query must be a string")
    .isLength({ min: 5 })
    .withMessage("query must be at least 5 characters")
    .trim(),

  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be between 1 and 20")
    .toInt(),

  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be between 0 and 1")
    .toFloat(),

  validationErrorHandler,
];
