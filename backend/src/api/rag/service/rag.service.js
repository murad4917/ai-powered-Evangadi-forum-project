import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import { safeExecute } from "../../../../db/config.js";
import { BadRequestError } from "../../../utils/errors/index.js";
import { generateQuestionEmbedding } from "../../question/service/vector.service.js";

function mapDocumentToResponse(row) {
  return {
    document_id: row.document_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: Number(row.byte_size),
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    storage_path: row.storage_path,
  };
}

async function extractPagesFromPdf(absolutePath) {
  const buffer = await fs.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const pages = (result.pages || [])
      .map((page) => ({
        pageNumber: page.num,
        text: (page.text || "").replace(/\r\n/g, "\n"),
      }))
      .filter((page) => page.text.trim());

    if (pages.length === 0) {
      throw new BadRequestError("No extractable text found in PDF.");
    }

    return pages;
  } finally {
    await parser.destroy();
  }
}

/**
 * Split plain text into chunks (one non-empty line = one chunk).
 */
function chunkText(pages) {
  const chunks = [];

  for (const page of pages) {
    const lines = page.text.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length > 0) {
        chunks.push({
          chunkIndex: chunks.length,
          content: trimmedLine,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
        });
      }
    }
  }

  return chunks;
}

async function insertDocumentRecord({
  userId,
  title,
  mimeType,
  storagePath,
  byteSize,
}) {
  const sql = `
    INSERT INTO documents (
      user_id,
      title,
      mime_type,
      storage_path,
      byte_size,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'processing')
  `;

  try {
    return await safeExecute(sql, [
      userId,
      title,
      mimeType,
      storagePath,
      byteSize,
    ]);
  } catch (error) {
    if (error?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new BadRequestError("User does not exist");
    }

    throw error;
  }
}

async function fetchDocumentById(documentId) {
  const sql = `
    SELECT
      document_id,
      user_id,
      title,
      mime_type,
      storage_path,
      byte_size,
      status,
      error_message,
      created_at,
      updated_at
    FROM documents
    WHERE document_id = ?
    LIMIT 1
  `;

  const rows = await safeExecute(sql, [documentId]);
  return rows[0] ?? null;
}

async function updateDocumentStatus({ documentId, status, errorMessage = null }) {
  const sql = `
    UPDATE documents
    SET status = ?, error_message = ?
    WHERE document_id = ?
  `;

  await safeExecute(sql, [status, errorMessage, documentId]);
}

async function deleteDocumentChunksByDocumentId(documentId) {
  const sql = `
    DELETE FROM document_chunks
    WHERE document_id = ?
  `;

  await safeExecute(sql, [documentId]);
}

async function insertDocumentChunk({
  documentId,
  chunkIndex,
  content,
  pageStart,
  pageEnd,
}) {
  const sql = `
    INSERT INTO document_chunks (
      document_id,
      chunk_index,
      content,
      page_start,
      page_end
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  const result = await safeExecute(sql, [
    documentId,
    chunkIndex,
    content,
    pageStart,
    pageEnd,
  ]);
  return result.insertId;
}

async function insertDocumentChunkVector({ chunkId, sourceText, embedding }) {
  const sql = `
    INSERT INTO document_chunk_vectors (
      chunk_id,
      source_text,
      embedding,
      status
    )
    VALUES (?, ?, ?, 'ready')
  `;

  await safeExecute(sql, [chunkId, sourceText, JSON.stringify(embedding)]);
}

async function storeDocumentChunksWithEmbeddings(documentId, chunks) {
  for (const chunk of chunks) {
    const { embedding } = await generateQuestionEmbedding(chunk.content, {
      taskType: "RETRIEVAL_DOCUMENT",
    });

    const chunkId = await insertDocumentChunk({
      documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
    });

    await insertDocumentChunkVector({
      chunkId,
      sourceText: chunk.content,
      embedding,
    });
  }
}

async function processDocumentContent(documentId, filePath) {
  const pages = await extractPagesFromPdf(filePath);
  const chunks = chunkText(pages);

  if (chunks.length === 0) {
    throw new BadRequestError("No chunkable text found in PDF.");
  }

  await storeDocumentChunksWithEmbeddings(documentId, chunks);
}

async function markDocumentFailed(documentId, error) {
  try {
    await deleteDocumentChunksByDocumentId(documentId);
  } catch (cleanupError) {
    console.error(
      `Failed to remove partial chunks for document ${documentId}:`,
      cleanupError,
    );
  }

  await updateDocumentStatus({
    documentId,
    status: "failed",
    errorMessage: error.message,
  });
}


export async function createDocumentFromUploadService({
  userId,
  file,
  storagePath,
}) {
  if (!file) {
    throw new BadRequestError("PDF file is required.");
  }

  if (!storagePath) {
    throw new BadRequestError("Uploaded file storage path is missing.");
  }

  const insertResult = await insertDocumentRecord({
    userId,
    title: file.originalname,
    mimeType: file.mimetype || "application/pdf",
    storagePath,
    byteSize: file.size,
  });

  const documentId = insertResult.insertId;

  try {
    await processDocumentContent(documentId, file.path);
    await updateDocumentStatus({
      documentId,
      status: "ready",
      errorMessage: null,
    });
  } catch (error) {
    await markDocumentFailed(documentId, error);

    const failedDocument = await fetchDocumentById(documentId);
    if (!failedDocument) {
      throw error;
    }

    return mapDocumentToResponse(failedDocument);
  }

  const readyDocument = await fetchDocumentById(documentId);

  if (!readyDocument) {
    throw new Error("Failed to load document after processing.");
  }

  return mapDocumentToResponse(readyDocument);
}


/**
 * ======================================================
 * T-23: Safe embedding parser
 * Handles:
 * - JSON string from DB
 * - Already-parsed array
 * ======================================================
 */
function parseEmbedding(embedding) {
  if (!embedding) return [];

  if (typeof embedding === "string") {
    try {
      return JSON.parse(embedding);
    } catch (error) {
      // Prevent crash if DB has corrupted data
      return [];
    }
  }

  return embedding;
}

/**
 * ======================================================
 * T-23: Cosine Similarity Function
 * Measures similarity between query and chunk vectors
 * ======================================================
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);

  return denom === 0 ? 0 : dot / denom;
}

/**
 * ======================================================
 * T-23: Fetch all chunk embeddings for a document
 * ======================================================
 */
async function fetchDocumentChunksWithVectors(documentId) {
  const sql = `
    SELECT
      dc.chunk_id,
      dc.chunk_index,
      dc.content,
      dcv.embedding
    FROM document_chunks dc
    INNER JOIN document_chunk_vectors dcv
      ON dc.chunk_id = dcv.chunk_id
    WHERE dc.document_id = ?
  `;

  return await safeExecute(sql, [documentId]);
}

/**
 * ======================================================
 * T-23: Semantic Search Service
 * Flow:
 * 1. Verify document exists
 * 2. Check ownership
 * 3. Ensure document is ready
 * 4. Generate query embedding (Gemini)
 * 5. Fetch stored embeddings
 * 6. Compute similarity
 * 7. Rank results
 * 8. Return top K
 * ======================================================
 */
export async function searchInDocumentService({
  documentId,
  query,
  k = 5,
  userId,
}) {
  /**
   * T-23: Step 1 - Fetch document
   */
  const document = await fetchDocumentById(documentId);

  if (!document) {
    throw new BadRequestError("Document not found.");
  }

  /**
   * T-23: Step 2 - Verify ownership
   */
  if (document.user_id !== userId) {
    throw new BadRequestError("You do not have access to this document.");
  }

  /**
   * T-23: Step 3 - Check processing status
   */
  if (document.status !== "ready") {
    throw new BadRequestError("Document is not ready for searching.");
  }

  /**
   * T-23: Step 4 - Generate query embedding
   */
  const { embedding: queryEmbedding } =
    await generateQuestionEmbedding(query, {
      taskType: "RETRIEVAL_QUERY",
    });

  /**
   * T-23: Step 5 - Load stored chunk vectors
   */
  const chunks = await fetchDocumentChunksWithVectors(documentId);

  /**
   * T-23: Step 6 - Compute similarity scores
   */
  const rankedResults = chunks.map((chunk) => {
    const embedding = parseEmbedding(chunk.embedding);

    return {
      chunkId: chunk.chunk_id,
      chunkIndex: chunk.chunk_index,
      excerpt: chunk.content,

      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  /**
   * T-23: Step 7 - Sort by highest relevance
   */
  rankedResults.sort((a, b) => b.score - a.score);

  /**
   * T-23: Step 8 - Return top K results
   */
  const topResults = rankedResults.slice(0, k);

  return {
    query,
    results: topResults,
  };
}