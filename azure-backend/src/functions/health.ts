import { app, type HttpRequest } from "@azure/functions";
import { ok, options } from "../lib/http";

app.http("health", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request: HttpRequest) => {
    if (request.method === "OPTIONS") return options();

    return ok({
      service: "succms-azure-backend",
      status: "ok",
      time: new Date().toISOString()
    });
  }
});
