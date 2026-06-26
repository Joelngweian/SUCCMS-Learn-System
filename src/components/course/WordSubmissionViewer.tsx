import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveSubmissionFileUrl } from "@/lib/submissionStorage";
import type {
  AiGradingAnnotation,
  SubmissionFile,
} from "./coursePageTypes";

type WordSubmissionViewerProps = {
  file: SubmissionFile | null;
  annotations: AiGradingAnnotation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TextPoint = {
  node: Text;
  offset: number;
};

type HighlightMatch = {
  annotation: AiGradingAnnotation;
  annotationIndex: number;
  start: number;
  end: number;
  startPoint: TextPoint;
  endPoint: TextPoint;
};

const annotationMeta: Record<
  AiGradingAnnotation["status"],
  { label: string; badgeClassName: string }
> = {
  incorrect: {
    label: "Incorrect",
    badgeClassName: "border-red-200 bg-red-100 text-red-800",
  },
  correct: {
    label: "Reviewed & Correct",
    badgeClassName: "border-sky-200 bg-sky-100 text-sky-800",
  },
  uncertain: {
    label: "Lecturer Check",
    badgeClassName: "border-amber-200 bg-amber-100 text-amber-800",
  },
};

const normalizeText = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLocaleLowerCase();

const normalizeFileName = (value: string) =>
  value.replaceAll("\\", "/").split("/").pop()?.trim().toLocaleLowerCase() || "";

const buildTextMap = (element: Element) => {
  const walker = element.ownerDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
  );
  const points: TextPoint[] = [];
  let normalized = "";
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const text = textNode.data;

    for (let offset = 0; offset < text.length; offset += 1) {
      const character = text[offset];
      if (/\s/.test(character)) {
        if (normalized.length > 0 && normalized.at(-1) !== " ") {
          normalized += " ";
          points.push({ node: textNode, offset });
        }
      } else {
        normalized += character.toLocaleLowerCase();
        points.push({ node: textNode, offset });
      }
    }

    currentNode = walker.nextNode();
  }

  while (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    points.pop();
  }

  return { normalized, points };
};

const rangesOverlap = (
  start: number,
  end: number,
  matches: HighlightMatch[],
) =>
  matches.some(match => start < match.end && end > match.start);

const addAiHighlights = (
  html: string,
  annotations: AiGradingAnnotation[],
) => {
  if (!html || annotations.length === 0) {
    return { html, locatedIndexes: new Set<number>() };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<main>${html}</main>`, "text/html");
  const root = parsed.body.firstElementChild;
  const locatedIndexes = new Set<number>();

  if (!root) return { html, locatedIndexes };

  const blockSelector = "p,li,td,th,blockquote,h1,h2,h3,h4,h5,h6";
  const blocks = Array.from(root.querySelectorAll(blockSelector)).filter(
    block => !block.querySelector(blockSelector),
  );

  blocks.forEach(block => {
    const { normalized, points } = buildTextMap(block);
    if (!normalized || points.length === 0) return;

    const matches: HighlightMatch[] = [];

    annotations.forEach((annotation, annotationIndex) => {
      if (locatedIndexes.has(annotationIndex)) return;

      const excerpt = normalizeText(annotation.excerpt);
      if (!excerpt) return;

      let start = normalized.indexOf(excerpt);
      while (
        start >= 0 &&
        rangesOverlap(start, start + excerpt.length, matches)
      ) {
        start = normalized.indexOf(excerpt, start + 1);
      }
      if (start < 0) return;

      const end = start + excerpt.length;
      const startPoint = points[start];
      const finalPoint = points[end - 1];
      if (!startPoint || !finalPoint) return;

      matches.push({
        annotation,
        annotationIndex,
        start,
        end,
        startPoint,
        endPoint: {
          node: finalPoint.node,
          offset: finalPoint.offset + 1,
        },
      });
      locatedIndexes.add(annotationIndex);
    });

    matches
      .sort((left, right) => right.start - left.start)
      .forEach(match => {
        const range = parsed.createRange();
        range.setStart(match.startPoint.node, match.startPoint.offset);
        range.setEnd(match.endPoint.node, match.endPoint.offset);

        const mark = parsed.createElement("mark");
        mark.className = `word-ai-highlight word-ai-highlight-${match.annotation.status}`;
        mark.title = match.annotation.comment;
        mark.setAttribute(
          "aria-label",
          `${annotationMeta[match.annotation.status].label}: ${match.annotation.comment}`,
        );
        mark.append(range.extractContents());

        const number = parsed.createElement("sup");
        number.className = "word-ai-highlight-number";
        number.textContent = String(match.annotationIndex + 1);
        mark.append(number);
        range.insertNode(mark);
      });
  });

  return {
    html: DOMPurify.sanitize(root.innerHTML, {
      ADD_DATA_URI_TAGS: ["img"],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    }),
    locatedIndexes,
  };
};

export function WordSubmissionViewer({
  file,
  annotations,
  open,
  onOpenChange,
}: WordSubmissionViewerProps) {
  const [documentHtml, setDocumentHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [conversionMessages, setConversionMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !file) {
      setDocumentHtml("");
      setErrorMessage("");
      setConversionMessages([]);
      return;
    }

    const controller = new AbortController();

    const loadDocument = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setDocumentHtml("");
      setConversionMessages([]);

      try {
        const url = await resolveSubmissionFileUrl(file);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Word file download failed (${response.status}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            includeDefaultStyleMap: true,
            includeEmbeddedStyleMap: true,
            ignoreEmptyParagraphs: false,
          },
        );

        if (controller.signal.aborted) return;

        setDocumentHtml(
          DOMPurify.sanitize(result.value, {
            ADD_DATA_URI_TAGS: ["img"],
            FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
          }),
        );
        setConversionMessages(result.messages.map(message => message.message));
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The Word submission could not be displayed.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadDocument();
    return () => controller.abort();
  }, [file, open]);

  const relevantAnnotations = useMemo(() => {
    if (!file) return [];

    const targetName = normalizeFileName(file.name);
    const exactMatches = annotations.filter(
      annotation => normalizeFileName(annotation.fileName) === targetName,
    );

    return exactMatches.length > 0 ? exactMatches : annotations;
  }, [annotations, file]);

  const highlightedDocument = useMemo(
    () => addAiHighlights(documentHtml, relevantAnnotations),
    [documentHtml, relevantAnnotations],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-7xl">
        <DialogHeader className="border-b bg-white px-6 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            {file?.name || "Word Submission"}
          </DialogTitle>
          <DialogDescription>
            AI highlights the original submission text. Red is incorrect, light
            blue is reviewed and correct, and yellow needs lecturer review.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 bg-slate-100 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-auto p-4 sm:p-8">
            {isLoading ? (
              <div className="flex h-full min-h-80 items-center justify-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading Word submission...
              </div>
            ) : errorMessage ? (
              <div className="mx-auto mt-10 flex max-w-xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to open this Word file</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
              </div>
            ) : (
              <article
                className="word-submission-page mx-auto min-h-[1120px] max-w-[816px] bg-white px-10 py-12 text-slate-900 shadow-lg sm:px-16 sm:py-16"
                dangerouslySetInnerHTML={{ __html: highlightedDocument.html }}
              />
            )}
          </div>

          <aside className="min-h-0 overflow-auto border-l bg-white p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">AI Marking Notes</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                These are suggestions only. The lecturer keeps the final grading
                decision.
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {Object.entries(annotationMeta).map(([status, meta]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={meta.badgeClassName}
                >
                  {meta.label}
                </Badge>
              ))}
            </div>

            {relevantAnnotations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                Run AI grading to add highlights to this Word submission.
              </div>
            ) : (
              <div className="space-y-3">
                {relevantAnnotations.map((annotation, index) => {
                  const meta = annotationMeta[annotation.status];
                  const wasLocated =
                    highlightedDocument.locatedIndexes.has(index);

                  return (
                    <article
                      key={`${annotation.fileName}-${annotation.excerpt}-${index}`}
                      className="rounded-xl border bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className={meta.badgeClassName}
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs font-medium leading-relaxed text-slate-700">
                        “{annotation.excerpt}”
                      </p>
                      {annotation.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {annotation.comment}
                        </p>
                      )}
                      {!wasLocated && documentHtml && (
                        <p className="mt-2 text-xs text-amber-700">
                          Exact text was not found in the converted Word content.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {conversionMessages.length > 0 && (
              <details className="mt-5 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium">
                  Word conversion notes
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {conversionMessages.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              </details>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
