import type { CampusPost, CampusPostAttachment } from "./campusFeedTypes";

interface CampusPostMediaProps {
  onOpen: (attachment: CampusPostAttachment) => void;
  post: CampusPost;
}

export function CampusPostMedia({
  onOpen,
  post,
}: CampusPostMediaProps) {
  if (post.attachments.length === 0) return null;

  if (post.attachments.length === 1) {
    const attachment = post.attachments[0];
    if (!attachment.url) return null;

    return (
      <div className="flex max-h-[520px] justify-center overflow-hidden border-y bg-muted/30">
        <button
          type="button"
          onClick={() => onOpen(attachment)}
          className="flex w-full cursor-zoom-in justify-center"
          aria-label={`View ${attachment.name}`}
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="block max-h-[520px] max-w-full object-contain"
          />
        </button>
      </div>
    );
  }

  const gridClass =
    post.attachments.length === 2
      ? "grid-cols-2 auto-rows-[300px]"
      : "grid-cols-2 auto-rows-[220px]";

  return (
    <div className={`grid gap-1 overflow-hidden bg-muted ${gridClass}`}>
      {post.attachments.map((attachment, index) =>
        attachment.url ? (
          <button
            type="button"
            key={attachment.path}
            onClick={() => onOpen(attachment)}
            className={`cursor-zoom-in overflow-hidden ${
              post.attachments.length === 3 && index === 0
                ? "row-span-2"
                : ""
            }`}
            aria-label={`View ${attachment.name}`}
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
            />
          </button>
        ) : null,
      )}
    </div>
  );
}
