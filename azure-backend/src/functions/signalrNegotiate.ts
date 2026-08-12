import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { corsHeaders, internalError, options, unauthorized } from "../lib/http";
import { requireUser } from "../lib/auth";
import { createSignalRNegotiation } from "../lib/realtime";

app.http("signalrNegotiate", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "signalr/negotiate",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      return {
        status: 200,
        jsonBody: await createSignalRNegotiation(user),
        headers: {
          ...corsHeaders,
          "content-type": "application/json; charset=utf-8"
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      context.error(error);
      return internalError();
    }
  }
});
