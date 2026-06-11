import { GoogleGenerativeAI } from "@google/generative-ai";
import { ServiceUnavailableError } from "../../../utils/errors/index.js";
// Force the SDK to use the v1beta endpoint pathway
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1beta",
});
const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite";
function parseJsonObjectFromGeminiText(raw) {
  if (!raw || typeof raw !== "string") return null;

  let t = raw.trim();

  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  try {
    const v = JSON.parse(t);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
async function fetchGeminiJsonTextResponse(userPrompt) {
  const model = genai.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
  });
  const response = await model.generateContent(userPrompt);

  const text = response?.response?.text?.();
  return typeof text === "string" ? text : "";
}
export const generateQuestionDraftCoachService = async ({ title, content }) => {
  try {
    const prompt = `
You are a senior programming forum expert.

Your task is to review a question draft and give improvement tips.

Rules:
- Focus on clarity, completeness, and usefulness
- Do NOT answer the question
- Only give improvement suggestions

Title:
${title || "No title"}

Content:
${content || "No content"}

Return ONLY 3–5 short bullet-point tips.
`;

    // Clean, standard model string
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const tips = text
      .split("\n")
      .map((t) => t.replace(/^[-*•]\s*/, "").trim())
      .filter((t) => t.length > 0);

    return { tips };
  } catch (error) {
    console.error("Draft coach error:", error.message);
    throw error;
  }
};
/**
 * Whether a draft answer seems to address the question (relevance, not correctness).
 *
 * @param {{ questionTitle: string; questionContent: string; answerText: string }} param
 * @returns {Promise<{ level: string; note: string }>}
 */
export const assessAnswerAgainstQuestionService = async ({
  questionTitle,
  questionContent,
  answerText,
}) => {
  const userPrompt = `You review whether a forum ANSWER draft addresses the QUESTION (relevance and completeness of engagement - not whether the answer is factually correct).

QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

ANSWER DRAFT:
${answerText}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"level":"strong"|"partial"|"weak","note":"one short sentence"}

Rules:
- level: "strong" if the draft clearly engages with the question; "partial" if somewhat related but missing key parts of the ask; "weak" if mostly off-topic or too vague.
- note: one sentence, plain language, no markdown, under 200 characters. Frame as fit/relevance, not grading.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);

    const levelRaw = parsed?.level;
    const noteRaw = parsed?.note;

    const level =
      levelRaw === "strong" || levelRaw === "partial" || levelRaw === "weak"
        ? levelRaw
        : "partial";
    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim().slice(0, 200)
        : "Could not summarize fit; treat this as a partial match.";

    return { level, note };
  } catch (error) {
    console.error("assessAnswerAgainstQuestionService:", error);

    throw new ServiceUnavailableError(
      "AI fit check is temporarily unavailable. Please try again later.",
    );
  }
};
