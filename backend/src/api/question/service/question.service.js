import {
  normalizeQuestionText,
  findSimilarQuestionsByText,
  getVectorConfig,
} from "./vector.service.js";

/**
 * Performs semantic search on questions using vector similarity.
 *
 * @param {Object} params - Search parameters
 * @param {string} params.query - The search query text
 * @param {number} [params.k=5] - Maximum number of similar questions to return
 * @param {number} [params.threshold] - Similarity threshold (uses config default if not provided)
 * @returns {Promise<Object>} Object containing similar questions and search metadata
 */
export const searchQuestionsSemanticService = async ({
  query,
  k = 5,
  threshold,
}) => {
  const sourceText = normalizeQuestionText({ title: query });
  const vectorConfig = getVectorConfig();

  const searchThreshold = threshold !== undefined ? threshold : vectorConfig.recommendThreshold;

  const result = await findSimilarQuestionsByText({sourceText, threshold: searchThreshold, k});

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
