import { cn } from "@/shared/lib/utils";
import { CSSProperties, FC, ReactNode } from "react";

interface TextShimmerProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export const TextShimmer: FC<TextShimmerProps> = ({
  children,
  className,
  shimmerWidth = 100,
}) => {
  return (
    <p
      style={
        {
          "--shimmer-width": `${shimmerWidth}px`,
          backgroundSize: `calc(100% + var(--shimmer-width)) 100%`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md",
        "animate-text-shimmer bg-clip-text text-transparent bg-no-repeat",
        "bg-[linear-gradient(90deg,_var(--color-neutral-400)_0%,_var(--color-neutral-400)_35%,_var(--color-neutral-900)_50%,_var(--color-neutral-400)_65%,_var(--color-neutral-400)_100%)]",
        "dark:bg-[linear-gradient(90deg,_var(--color-neutral-500)_0%,_var(--color-neutral-500)_35%,_var(--color-neutral-100)_50%,_var(--color-neutral-500)_65%,_var(--color-neutral-500)_100%)]",
        className
      )}
    >
      {children}
    </p>
  );
};
