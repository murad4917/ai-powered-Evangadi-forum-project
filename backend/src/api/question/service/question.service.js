import crypto from "crypto";
import { safeExecute } from "../../../../db/config.js";
import { BadRequestError } from "../../../utils/errors/index.js";

import {
  normalizeQuestionText,
  storeQuestionVector,
  generateQuestionEmbedding,
  getVectorConfig,
  findSimilarQuestionsByText,
} from "./vector.service.js";

const generateQuestionHash = () => crypto.randomBytes(8).toString("hex");

/**
 * Create a new question with vector embedding
 */
export const createQuestionService = async (payload) => {
  const { userId, title, content } = payload;

  const insertQuestionSql = `
        INSERT INTO questions (
            question_hash,
            user_id,
            title,
            content
        )
        VALUES (?, ?, ?, ?)
    `;

  const questionHash = generateQuestionHash();
  let result;

  try {
    result = await safeExecute(insertQuestionSql, [
      questionHash,
      userId,
      title,
      content,
    ]);
  } catch (error) {
    if (error?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new BadRequestError("User does not exist");
    }
    throw error;
  }

  const questionId = result.insertId;

  const creationResult = {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };

  // Prepare text for embedding
  const sourceText = normalizeQuestionText({ title });

  try {
    const embeddingResult = await generateQuestionEmbedding(sourceText, {
      questionId,
    });

    if (
      !embeddingResult ||
      !embeddingResult.embedding ||
      embeddingResult.embedding.length === 0
    ) {
      throw new Error("Failed to generate embedding");
    }

    await storeQuestionVector({
      questionId,
      sourceText,
      embedding: embeddingResult.embedding,
      status: "ready",
    });
  } catch (error) {
    console.error("VECTOR GENERATION FAILED:", error);

    await storeQuestionVector({
      questionId,
      sourceText,
      embedding: [],
      status: "failed",
    }).catch((e) => console.error("Failed to store failed vector state:", e));
  }

  return creationResult;
};

const buildQuestionFilters = (filters = {}) => {
  const condition = [];
  const params = [];

  if (filters.search) {
    condition.push("(q.title LIKE ? OR q.content LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.mine) {
    condition.push("q.user_id = ?");
    params.push(filters.userId);
  }

  if (condition.length === 0) {
    return { whereClause: "", params: [] };
  }

  return {
    whereClause: "WHERE " + condition.join(" AND "),
    params,
  };
};

/**
 * Get all questions with optional filtering
 * @param {object} filters - filter options
 * @returns {Promise<object>}
 */
export const getQuestionsService = async (filters) => {
  const normalizedLimit = 100; // enforce a maximum limit of 100 records
  const sortColumn = "q.created_at";
  const sortOrder = "DESC";
  const { whereClause, params } = buildQuestionFilters(filters);
  const listSql = `
        SELECT 
            q.question_id AS id,
            q.question_hash AS questionHash,
            q.title,
            q.content, 
            q.created_at AS createdAt,
            q.updated_at AS updatedAt,
            u.user_id AS userId,
            u.first_name AS firstName,
            u.last_name AS lastName,
            COUNT(DISTINCT a.answer_id) AS answerCount
        FROM questions q
        JOIN users u ON u.user_id = q.user_id
        LEFT JOIN answers a ON a.question_id = q.question_id
        ${whereClause}
        GROUP BY
            q.question_id,
            q.question_hash,
            q.title,
            q.content,
            q.created_at,
            q.updated_at,
            u.user_id,
            u.first_name,
            u.last_name
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ${normalizedLimit}
    `;
  const rows = await safeExecute(listSql, params);

  return {
    data: rows.map((row) => ({
      id: row.id,
      questionHash: row.questionHash,
      title: row.title,
      content: row.content,
      answerCount: row.answerCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
      },
    })),
    meta: {
      limit: normalizedLimit,
      total: rows.length,
      sortBy: "newest",
      sortOrder: sortOrder.toLowerCase(),
    },
  };
};

/**
 * Get a single question by questionHash
 * @param {string} questionHash - The question hash identifier
 * @returns {Promise<object>} - The question object with author details
 * @throws {BadRequestError} - If question is not found
 */
export const getSingleQuestionService = async (questionHash) => {
  const sql = `
        SELECT  
            q.question_id AS id,
            q.question_hash AS questionHash,
            q.title,
            q.content,
            q.created_at AS createdAt,
            q.updated_at AS updatedAt,
            u.user_id AS userId,
            u.first_name AS firstName,
            u.last_name AS lastName,
            COUNT(DISTINCT a.answer_id) AS answerCount
        FROM questions q
        JOIN users u ON q.user_id = u.user_id
        LEFT JOIN answers a ON q.question_id = a.question_id
        WHERE q.question_hash = ?
        GROUP BY 
            q.question_id,
            q.question_hash,
            q.title,
            q.content,
            q.created_at,
            q.updated_at,
            u.user_id,
            u.first_name,
            u.last_name
    `;
  const rows = await safeExecute(sql, [questionHash]);

  if (rows.length === 0) {
    throw new BadRequestError("Question not found");
  }

  const row = rows[0];
  return {
    id: row.id,
    questionHash: row.questionHash,
    title: row.title,
    content: row.content,
    answerCount: row.answerCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
    },
  };
};

export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const result = await searchQuestionsSemanticService({
      query: req.query.query,
      k: req.query.k ? Number(req.query.k) : 5,
      threshold:
        req.query.threshold !== undefined
          ? Number(req.query.threshold)
          : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Semantic search completed successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const searchQuestionsSemanticService = async ({
  query,
  k = 5,
  threshold,
}) => {
  const sourceText = normalizeQuestionText({ title: query });
  const vectorConfig = getVectorConfig();

  const searchThreshold =
    threshold !== undefined ? threshold : vectorConfig.recommendThreshold;

  const result = await findSimilarQuestionsByText({
    sourceText,
    threshold: searchThreshold,
    k,
  });

  return {
    data: result.similarQuestions,
    meta: {
      query,
      k,
      threshold: searchThreshold,
      total: result.similarQuestions.length,
    },
  };
};

export const getSimilarQuestionsService = async ({
  questionHash,
  k = 5,
  threshold,
}) => {
  // Find the source question by hash
  const sql = `SELECT question_id AS id, title FROM questions WHERE question_hash = ?`;
  const rows = await safeExecute(sql, [questionHash]);
  if (!rows || rows.length === 0) {
    throw new NotFoundError("Question not found");
  }

  const question = rows[0];
  const sourceText = normalizeQuestionText({ title: question.title });

  const result = await findSimilarQuestionsByText({
    sourceText,
    k,
    threshold,
    // Exclude the source question itself so it never appears in its own recommendations.
    excludeQuestionId: question.id,
    queryEmbedding: sourceEmbedding, // optional param
  });

  return {
    data: result.similarQuestions,
    meta: {
      questionHash,
      k,
      threshold,
      total: result.similarQuestions.length,
    },
  };
};
