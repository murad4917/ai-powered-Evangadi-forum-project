import { GoogleGenAI } from "@google/genai";
 
//single shared client instance,autenticated with the API key in the environment variable
const al = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

//models that turn text to text into embedding vectors((used for semantic search))
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "GEMINI_EMBEDDING_MODEL";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "GEMINI_TEXT_MODEL";


/**
 * Embed a stored document chunk
 * taskType RETRIVAL_DOCUMENTS optimize the vector for being search againest
 * @param {string} text - the text to embed
 * @returns {Promise<number[]>} - the embedding vector
 */
export const getDocumentEmbedding = async (text) => {
    const result = await al.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [text],
        config: {
            taskType: "RETRIEVAL_DOCUMENTS",
            outputDimensionality: 768,
        },
    });
    return result.embeddings?.[0]?.values || [];
}

/**
 * Embed a user's question
 * tasktype QUESTION_ANSWERING tunes vector for maching aginest documents
 * @param{ string} Question - the text to embed
 * @returns {Promise<number[]>} - the embedding vector
 * 
 */
export const getQuestionEmbedding = async (question) => {
    const result = await al.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [question],
        config: {
            taskType: "QUESTION_ANSWERING",
            outputDimensionality: 768,
        },
    });
    return result.embeddings?.[0]?.values || [];
}   
      


/**
 * generate final anwer (the "G" in RAG) from the retrivied context
 * the prompt ground the model in context and tell it to admit when
 * the answer isn't there which reduce hallucination
 * @param {question: string, context: string []} args - context i array
 * of retrieved chunks (a single string is also accepted for convenience)
 * @returns {Promise<string>} - the final answer
  */
export async function generateAnswer({ question, context }) {
    //normalize to array so callers can pass one or many context chunks
    const contextChunks = Array.isArray(context) ? context : [context];

    //number each chunk model can treat them as district soures

    const contextBlock = contextChunks.map((chunk, index) => `[${index + 1}]: ${chunk}`)
        .join("\n\n");

    const prompt = `You are a helpful assistant Evangadi forum that answers questions based on . 
If the answer is not present in the context, please respond with "I don't know." 
Do not make up information or provide answers that are not supported by the context.

Answer the following question based on the context provided below.

Rules:
-Be warm, friendly, and polite in your response.
- If the answer is not present in the context, respond with "I don't know."
Grounding every fact in the numbered context chunks provided.
- Do not make up information or provide answers that are not supported by the context.
- If the answer is present in the context, provide a clear and concise answer.
Say so plolitey in your answer if you are not sure about the answer.
Invite them to ask follow-up questions if they need more information.
keep answer short and concise, clearly
Do not invet name,dates,numbers, or political information that is not present in the context.

Retrival context:
${contextBlock}

user question: ${question}

Answer:`;

  try {
    const result = await al.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
    });
    const text = result.text;
    if (typeof text === "string" && text.trim()) return text.trim();
  } catch {
    // fall through to fallback
  }

  return "I could not generate a response. Please try again.";
}
