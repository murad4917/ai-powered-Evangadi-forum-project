import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
import {
  createDocumentMulterErrorHandler,
  handlePdfUpload,
} from "../../../middleware/rag.upload.js";
import {
  documentIdParamValidation,
  queryDocumentValidation,
  getDocumentFileValidation,
} from "../validation/rag.validation.js";
import {
  createDocumentController,
  queryDocumentController,
  getDocumentMetaController,
  getDocumentFileController
} from "../controller/rag.controller.js";
import { searchInDocumentController } from "../controller/rag.controller.js";

const router = express.Router();

/**
 * @route POST /api/rag/documents
 * @desc Upload and process a PDF document for RAG
 * @access Protected
 */
router.post(
  "/documents",
  authenticateUser,
  handlePdfUpload,
  createDocumentController,
);

router.use(createDocumentMulterErrorHandler);

export default router;
/**
 *  T-23: Semantic Search Route
 * GET /api/rag/documents/:documentId/search
 */

router.get(
  "/documents/:documentId/search",
  authenticateUser,
  searchInDocumentController,
);

/**
 * @route POST /api/rag/documents/:documentId/query
 * @desc Generate an AI answer grounded in the most relevant chunks of one document
 * @access Protected
 */
router.post(
  "/documents/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);
router.get(
  "/documents/:documentId",
  authenticateUser,
  documentIdParamValidation,
  validationErrorHandler,
  getDocumentMetaController,
);


router.get(
  "/documents/:documentId/file",
  authenticateUser,
  getDocumentFileValidation,
  getDocumentFileController,
);