import { createReadUrl } from "../lib/blob";
import { corsHeaders, internalError } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send } from "./runtime";

type RequestWithParams = ClassicRequest & {
  params?: {
    path?: string;
  };
  query?: {
    path?: string;
  };
};

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const path = decodeURIComponent(request.query?.path || request.params?.path || "");
    if (!path) {
      send(context, internalError("Storage path is required."));
      return;
    }
    const read = await createReadUrl(path, 3600);
    context.res = {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: read.url
      },
      body: ""
    };
  } catch (error) {
    logError(context, error);
    send(context, internalError(error instanceof Error ? error.message : undefined));
  }
};

export = handler;
