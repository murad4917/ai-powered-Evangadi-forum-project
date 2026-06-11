import { GoogleGenerativeAI } from "@google/generative-ai";

// Force the SDK to use the v1beta endpoint pathway
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1beta",
});

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
