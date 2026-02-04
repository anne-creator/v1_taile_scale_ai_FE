/**
 * SectionSpacer - Level 3 Custom Component
 * 
 * Used in Page (Level 5) to handle spacing between Block components.
 * References section spacing tokens from Level 0 (theme.css).
 * 
 * Usage in Page:
 * ```tsx
 * <HeroSection />
 * <SectionSpacer size="xl" />
 * <FeaturesSection />
 * ```
 */

interface SectionSpacerProps {
  /** Spacing size referencing Level 0 tokens */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional additional className */
  className?: string;
}

const sizeClasses = {
  sm: 'h-[var(--section-gap-sm)]',   // 48px
  md: 'h-[var(--section-gap-md)]',   // 80px
  lg: 'h-[var(--section-gap-lg)]',   // 128px
  xl: 'h-[var(--section-gap-xl)]',   // 192px
} as const;

export function SectionSpacer({ size = 'md', className }: SectionSpacerProps) {
  return (
    <div 
      className={`${sizeClasses[size]}${className ? ` ${className}` : ''}`} 
      aria-hidden="true" 
    />
  );
}
