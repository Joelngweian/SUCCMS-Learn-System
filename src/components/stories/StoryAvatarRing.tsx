import type { ReactNode } from "react";

interface StoryAvatarRingProps {
  active: boolean;
  children: ReactNode;
  className?: string;
  viewed?: boolean;
}

export function StoryAvatarRing({
  active,
  children,
  className = "",
  viewed = false,
}: StoryAvatarRingProps) {
  const ringClass = !active
    ? "bg-transparent"
    : viewed
      ? "bg-gray-300 dark:bg-zinc-700"
      : "bg-gradient-to-tr from-blue-500 via-purple-500 to-orange-500";

  return (
    <span
      className={`inline-flex rounded-full p-[3px] transition-all ${ringClass} ${className}`}
    >
      <span className="inline-flex rounded-full bg-background p-[2px]">
        {children}
      </span>
    </span>
  );
}
