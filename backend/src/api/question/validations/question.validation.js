import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const createQuestionValidation = [
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 5 })
        .withMessage('Title must be at least 5 characters')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),

    body('content')
        .notEmpty()
        .withMessage('Body is required')
        .isLength({ max: 5000 })
        .withMessage('Body cannot exceed 5000 characters'),

    validationErrorHandler,
];
export const getQuestionsValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search query must be a string")
    .trim(),
  query("mine")
    .optional()
    .isBoolean()
    .withMessage("Mine query parameter must be a boolean")
    .toBoolean(),
  validationErrorHandler,
];

export const getSingleQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash must be a string")
    .matches(/^[a-f0-9]{32}$/)
    .withMessage("Question hash must be a 32-character lowercase hex string")
    .trim(),
  validationErrorHandler,
];
