import crypto from 'crypto';
import { safeExecute } from '../../../../db/config.js';
import { BadRequestError } from '../../../utils/errors/index.js';

import {
    normalizeQuestionText,
    storeQuestionVector,
    generateQuestionEmbedding,
} from './vector.service.js';

const generateQuestionHash = () =>
    crypto.randomBytes(8).toString('hex');

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
        if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new BadRequestError('User does not exist');
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
            throw new Error('Failed to generate embedding');
        }

        await storeQuestionVector({
            questionId,
            sourceText,
            embedding: embeddingResult.embedding,
            status: 'ready',
        });
    } catch (error) {
        console.error('VECTOR GENERATION FAILED:', error);

        await storeQuestionVector({
            questionId,
            sourceText,
            embedding: [],
            status: 'failed',
        }).catch((e) =>
            console.error('Failed to store failed vector state:', e)
        );
    }

    return creationResult;
};
const buildQuestionFilters = (filters = {}) => {
    const condition = [];
    const params = [];

    if (filters.search) {
        condition.push('(q.title LIKE ? OR q.content LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.mine) {
        condition.push('q.user_id = ?');
        params.push(filters.userId);
    }

    if (condition.length === 0) {
        return { whereClause: '', params: [] };
    }

    return {
        whereClause: 'WHERE ' + condition.join(' AND '),
        params,
    };
};          


// Export alias for createQuestionWithVectorService
export const createQuestionService = createQuestionWithVectorService;

/**
 * Get all questions with optional filtering
 * @param {object} filters - filter options
 * @returns {Promise<object>}
 */

export const getQuestionsService = async (filters) => {
    const normalizedLimit = 100; // enforce a maximum limit of 100 records
    const sortColumn = 'q.created_at';
    const sortOrder = 'DESC';
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
            JOIN users u ON q.user_id = u.user_id
            LEFT JOIN answers a ON q.question_id = a.question_id
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
        data: rows.map(row => ({
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
            sortBy: 'newest',
            sortOrder: sortOrder.toLowerCase(),
        },
    };
};
