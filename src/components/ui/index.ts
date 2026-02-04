// Level 1: Base Primitives (shadcn/ui)
// Pure visual components without internal state management

export * from './animated-grid-pattern';
export {
  AnimatedGroup,
  type PresetType as AnimatedGroupPresetType,
} from './animated-group';
export * from './avatar';
export * from './badge';
export * from './breadcrumb';
export * from './button-group';
export * from './button';
export * from './card';
export * from './chart';
export * from './checkbox';
export * from './form';
export * from './highlighter';
export * from './infinite-slider';
export * from './input-group';
export * from './input';
export * from './label';
export * from './marquee';
export * from './pagination';
export * from './progress';
export * from './progressive-blur';
export * from './radio-group';
export * from './scroll-animation';
export * from './scroll-area';
export * from './separator';
export * from './sidebar';
export * from './skeleton';
export * from './sonner';
export * from './switch';
export * from './table';
export * from './text-effect';
export * from './textarea';
export * from './toggle-group';
export * from './toggle';

// Re-export Level 2.5 Compound Components for backward compatibility
// New code should import from '@/components/compound' directly
export * from '../compound';
