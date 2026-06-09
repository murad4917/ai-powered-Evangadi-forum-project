import { GoogleGenAI } from '@google/genai';
import { safeExecute } from '../../../../db/config.js';

import {
  BadRequestError,
  NotFoundError,
} from '../../../utils/errors/index.js';

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RECOMMENDED_THRESHOLD =
  Number(process.env.RECOMMENDED_SIMILARITY_THRESHOLD) || 0.75;

const RECOMMENDED_K = Number(process.env.RECOMMENDED_K) || 5;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

// NEW SDK INITIALIZATION (using @google/genai)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function extractEmbeddingValues(embeddingCandidate) {
  if (Array.isArray(embeddingCandidate)) return embeddingCandidate;
  if (Array.isArray(embeddingCandidate?.values)) return embeddingCandidate.values;
  if (Array.isArray(embeddingCandidate?.embedding)) return embeddingCandidate.embedding;
  if (Array.isArray(embeddingCandidate?.embedding?.values)) return embeddingCandidate.embedding.values;

  if (ArrayBuffer.isView(embeddingCandidate?.values)) return Array.from(embeddingCandidate.values);
  if (ArrayBuffer.isView(embeddingCandidate)) return Array.from(embeddingCandidate);

  return [];
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeQuestionText({ title }) {
  return normalizeWhitespace((title || '')
    .normalize('NFKC')
    .toLowerCase());
}


function validateEmbedding(embedding) {
  if (!Array.isArray(embedding)) throw new Error('Embedding must be an array');
  if (embedding.length === 0) throw new Error('Embedding array cannot be empty');

  if (!embedding.every(v => typeof v === 'number' && !Number.isNaN(v))) {
    throw new Error('Embedding array must contain only valid numbers');
  }
}

export async function storeQuestionVector({
  questionId,
  sourceText = '',
  embedding,
  status,
}) {
  if (status === 'failed' || (embedding && embedding.length === 0)) {
    const sql = `
      INSERT INTO question_vectors (
        question_id,
        source_text,
        embedding,
        status
      )
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        source_text = VALUES(source_text),
        embedding = VALUES(embedding),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `;

    await safeExecute(sql, [
      questionId,
      sourceText,
      JSON.stringify([]),
      status,
    ]);

    return;
  }

  validateEmbedding(embedding);

  const embeddingJson = JSON.stringify(embedding);

  const sql = `
    INSERT INTO question_vectors (
      question_id,
      source_text,
      embedding,
      status
    )
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      source_text = VALUES(source_text),
      embedding = VALUES(embedding),
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP
  `;

  await safeExecute(sql, [
    questionId,
    sourceText,
    embeddingJson,
    status,
  ]);
}

// generate embedding using NEW SDK
export async function generateQuestionEmbedding(sourceText, options = {}) {
  // keep requested line for compatibility
  const { tasktype = 'RETRIVE_DOCUMENT' } = options;

  if (!sourceText || typeof sourceText !== 'string') {
    throw new Error('Source text must be a non-empty string');
  }

  const result = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: sourceText,
  });

  let embedding =
    result?.embeddings?.[0]?.values ||
    result?.embedding?.values ||
    result?.embedding ||
    [];

  embedding = extractEmbeddingValues(embedding);

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Gemini API did not return a valid embedding vector');
  }

  const allNumbers = embedding.every(v => typeof v === 'number' && !Number.isNaN(v));
  if (!allNumbers) {
    throw new Error('Embedding contains invalid numeric values');
  }

  return { embedding };
}



