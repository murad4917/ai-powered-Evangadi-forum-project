import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createDocumentMulterErrorHandler,
  handlePdfUpload,
} from "../../../middleware/rag.upload.js";
import { createDocumentController } from "../controller/rag.controller.js";

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
