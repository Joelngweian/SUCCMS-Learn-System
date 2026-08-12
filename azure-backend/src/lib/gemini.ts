import { getConfig } from "./config";

export type AiGradeDraftInput = {
  assignmentTitle: string;
  submissionText: string;
  markingGuide?: string;
};

type GoogleGenAIClient = InstanceType<typeof import("@google/genai").GoogleGenAI>;

let client: GoogleGenAIClient | null = null;

async function getGeminiClient() {
  if (client) return client;
  const { GoogleGenAI } = await import("@google/genai");
  client = new GoogleGenAI({ apiKey: getConfig().geminiApiKey });
  return client;
}

export async function generateAiGradeDraft(input: AiGradeDraftInput) {
  const config = getConfig();
  const prompt = [
    "You are grading a college assignment for SUCCMS.",
    "Return concise JSON with score, feedback, rubricHighlights, and sentenceHighlights.",
    `Assignment title: ${input.assignmentTitle}`,
    input.markingGuide ? `Marking guide: ${input.markingGuide}` : "",
    `Submission: ${input.submissionText}`
  ]
    .filter(Boolean)
    .join("\n\n");

  const ai = await getGeminiClient();
  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt
  });

  return {
    provider: "gemini",
    model: config.geminiModel,
    text: response.text || ""
  };
}
