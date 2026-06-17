import { StatusCodes } from "http-status-codes";
import { persistMemoryUpload } from "../../../middleware/rag.upload.js";
import { getUploadedText } from "../../../utils/errors/ingest-pdf.js";
import { BadRequestError } from "../../../utils/errors/index.js";
import { createDocumentFromUploadService } from "../service/rag.service.js";

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
