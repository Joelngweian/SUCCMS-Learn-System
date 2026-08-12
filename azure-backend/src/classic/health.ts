import { ok } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, send } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  send(
    context,
    ok({
      service: "succms-azure-backend",
      status: "ok",
      time: new Date().toISOString()
    })
  );
};

export = handler;
