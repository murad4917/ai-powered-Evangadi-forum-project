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