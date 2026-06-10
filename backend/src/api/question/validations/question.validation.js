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
        .withMessage("Mine query must be a boolean"),
    validationErrorHandler,
];