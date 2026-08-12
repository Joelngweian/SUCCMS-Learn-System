import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";
import { requireUser } from "../lib/auth";
import { generateAiGradeDraft } from "../lib/gemini";
import { aiGradeAssignmentSchema } from "../lib/validators";

app.http("aiGradeAssignment", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "ai/grade-assignment",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      await requireUser(request);
      const body = aiGradeAssignmentSchema.parse(await request.json());
      const draft = await generateAiGradeDraft(body);

      return ok(draft);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid AI grading payload.", error.flatten());
      }
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      context.error(error);
      return internalError();
    }
  }
});
