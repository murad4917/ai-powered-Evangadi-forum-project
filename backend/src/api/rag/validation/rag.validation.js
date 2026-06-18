// ======================================================
// T-23: Semantic Search Validation
// Endpoint: GET /api/rag/documents/:documentId/search
// ======================================================

import { param, query, body } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";


export const searchDocumentValidation = [
  // T-23: Validate documentId param
  param("documentId")
    .isInt()
    .withMessage("documentId must be an integer"),

  // T-23: Validate search query
  query("query")
    .notEmpty()
    .withMessage("query is required")
    .isString()
    .withMessage("query must be a string"),

  // T-23: Validate k (optional)
  query("k")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("k must be a number between 1 and 50"),

  // T-23: Final validation handler
  validationErrorHandler,
];

export const documentIdParamValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("documentId must be a positive integer")
    .toInt(),
  validationErrorHandler,
];

export const documentIdValidation = documentIdParamValidation;

export const queryDocumentValidation = [
  ...documentIdParamValidation.slice(0, -1),
  body("query")
    .isString()
    .withMessage("query must be a string")
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage("query must be between 3 and 1000 characters"),
  validationErrorHandler,
];
