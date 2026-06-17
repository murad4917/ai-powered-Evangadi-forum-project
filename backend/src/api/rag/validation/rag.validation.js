// ======================================================
// T-23: Semantic Search Validation
// Endpoint: GET /api/rag/documents/:documentId/search
// ======================================================

import { param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validationErrorHandler.js";

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