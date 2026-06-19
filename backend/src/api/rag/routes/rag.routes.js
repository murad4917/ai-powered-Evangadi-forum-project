import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createDocumentMulterErrorHandler,
  handlePdfUpload,
} from "../../../middleware/rag.upload.js";
import { createDocumentController } from "../controller/rag.controller.js";
import { searchInDocumentController } from "../controller/rag.controller.js";
import { deleteDocumentController } from "../controller/rag.controller.js";
import { deleteDocumentValidation } from "../validation/rag.validation.js";
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

// T-24: Document Deletion Route
// Endpoint: DELETE /api/rag/documents/:documentId

/* ── Document Management (Delete) ────────────────────────────────────── */
/**
 * @route DELETE /api/rag/documents/:documentId
 * @desc Delete a document record, chunks, vectors, and physical storage file
 * @access Protected
 */
router.delete(
  "/documents/:documentId",
  authenticateUser,
  deleteDocumentValidation, // Validates that documentId is a real integer
  deleteDocumentController,
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
