import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createDocumentMulterErrorHandler,
  handlePdfUpload,
} from "../../../middleware/rag.upload.js";
import { createDocumentController } from "../controller/rag.controller.js";
import { searchInDocumentController } from "../controller/rag.controller.js";
import { listDocumentsController } from "../controller/rag.controller.js";
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
 * T-24: List RAG Documents Route
 * GET /api/rag/documents
 */
router.get("/documents", authenticateUser, listDocumentsController);

export default router;
