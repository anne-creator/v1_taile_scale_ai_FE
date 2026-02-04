import React, { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Ripple - Level 2 Animation Wrapper
 * 
 * Wraps children and adds an animated ripple effect background.
 * Following code_principle.md: Must accept children and apply effects.
 */
interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Children to wrap with ripple effect
   */
  children?: ReactNode;
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export const Ripple = React.memo(function Ripple({
  children,
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {/* Ripple effect layer */}
      <div className="pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,white,transparent)]">
        {Array.from({ length: numCircles }, (_, i) => {
          const size = mainCircleSize + i * 70;
          const opacity = mainCircleOpacity - i * 0.03;
          const animationDelay = `${i * 0.06}s`;
          const borderStyle = "solid";

          return (
            <div
              key={i}
              className={`absolute animate-ripple rounded-full border bg-foreground/25 shadow-xl`}
              style={
                {
                  "--i": i,
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity,
                  animationDelay,
                  borderStyle,
                  borderWidth: "1px",
                  borderColor: `var(--foreground)`,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) scale(1)",
                } as CSSProperties
              }
            />
          );
        })}
      </div>
      {/* Children content layer */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
});

Ripple.displayName = "Ripple";
