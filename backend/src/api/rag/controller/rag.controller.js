import path from "node:path";
import fs from "node:fs/promises";
import { StatusCodes } from "http-status-codes";
import {
  persistMemoryUpload,
  RAG_UPLOADS_ROOT,
} from "../../../middleware/rag.upload.js";
import { getUploadedText } from "../../../utils/errors/ingest-pdf.js";
import { BadRequestError } from "../../../utils/errors/index.js";
import {
  createDocumentFromUploadService,
  searchInDocumentService,
  queryDocumentService,
  getDocumentMetaService,
  assertOwnedDocument,
} from "../service/rag.service.js";

/**
 * Handles POST /api/rag/documents — delegates upload processing to the service layer.
 */
export const createDocumentController = async (req, res, next) => {
  try {
    await getUploadedText(req);

    const storagePath = await persistMemoryUpload(req);

    if (!storagePath) {
      throw new BadRequestError("Uploaded file storage path is missing.");
    }

    const data = await createDocumentFromUploadService({
      userId: req.user.id,
      file: req.file,
      storagePath,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Document uploaded and processed.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ======================================================
 * T-23: Semantic Search in RAG Document Controller
 * Endpoint: GET /api/rag/documents/:documentId/search
 * ======================================================
 */

export const searchInDocumentController = async (req, res, next) => {
  try {
    // ==================================================
    // T-23: Validate and extract params safely
    // ==================================================
    const documentId = parseInt(req.params.documentId, 10);

    if (isNaN(documentId)) {
      throw new BadRequestError("Invalid documentId parameter");
    }

    const query = req.query.query?.trim();

    if (!query) {
      throw new BadRequestError("Search query is required");
    }

    const k = req.query.k ? parseInt(req.query.k, 10) : 5;

    if (isNaN(k) || k <= 0) {
      throw new BadRequestError("k must be a positive number");
    }

    // ==================================================
    // T-23: Call semantic search service
    // ==================================================
    const data = await searchInDocumentService({
      documentId,
      query,
      k,
      userId: req.user.id,
    });

    // ==================================================
    // T-23: Response
    // ==================================================
    return res.status(200).json({
      success: true,
      message: "Ranked chunk excerpts",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const queryDocumentController = async (req, res, next) => {
  try {
    const answerPayload = await queryDocumentService({
      userId: req.user.id,
      documentId: req.params.documentId,
      query: req.body.query,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Answer and citations",
      data: answerPayload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId
 * Returns metadata for a single document owned by the logged in user.
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const documentId = Number(req.params.documentId);
    const userId = req.user.id;

    const document = await getDocumentMetaService(documentId, userId);

    res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// T-24: GET /api/rag/documents/:documentId/file

export const getDocumentFileController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const documentId = Number(req.params.documentId);
    if (!userId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }
    // 1. verify ownership + get document
    const doc = await assertOwnedDocument(documentId, userId);
    // 2. build absolute path
    const absPath = path.join(RAG_UPLOADS_ROOT, doc.storage_path);
    // 3. verify file exists
    try {
      await fs.access(absPath);
    } catch {
      throw new Error("Document file not found.");
    }
    // 4. headers
    res.setHeader("Content-Type", doc.mime_type || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.title || "document.pdf")}"`,
    );
    // 5. stream file
    return res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
};
