/**
 * Global State Providers
 * 
 * Following code_principle.md: Providers are placed in the providers/ directory
 * and use { state, actions } interface pattern.
 * 
 * Usage in layout.tsx:
 * ```tsx
 * import { ThemeProvider, AuthProvider, UIProvider } from '@/providers';
 * 
 * <ThemeProvider>
 *   <AuthProvider>
 *     <UIProvider>
 *       {children}
 *     </UIProvider>
 *   </AuthProvider>
 * </ThemeProvider>
 * ```
 */

export { ThemeProvider } from './theme-provider';
export { 
  AuthProvider, 
  useAuth, 
  useAuthContext,
  type AuthState,
  type AuthActions,
  type AuthContextType,
  type AuthContextValue,
} from './auth-provider';
export { 
  UIProvider, 
  useUI, 
  useUIContext,
  type UIState,
  type UIActions,
  type UIContextType,
  type UIContextValue,
} from './ui-provider';
export {
  ImageGeneratorProvider,
  useImageGenerator,
  MAX_PROMPT_LENGTH,
  MODEL_OPTIONS,
  PROVIDER_OPTIONS,
  type ImageGeneratorTab,
  type GeneratedImage,
  type ImageGeneratorConfig,
  type ImageGeneratorState,
  type ImageGeneratorActions,
  type ImageGeneratorContextValue,
} from './image-generator-provider';
export {
  VideoGeneratorProvider,
  useVideoGenerator,
  MAX_PROMPT_LENGTH as VIDEO_MAX_PROMPT_LENGTH,
  VIDEO_MODEL_OPTIONS,
  VIDEO_PROVIDER_OPTIONS,
  type VideoGeneratorTab,
  type GeneratedVideo,
  type VideoGeneratorConfig,
  type VideoGeneratorState,
  type VideoGeneratorActions,
  type VideoGeneratorContextValue,
} from './video-generator-provider';
export {
  MusicGeneratorProvider,
  useMusicGenerator,
  MUSIC_COST_CREDITS,
  MUSIC_MODEL_OPTIONS,
  type GeneratedSong,
  type MusicGeneratorState,
  type MusicGeneratorActions,
  type MusicGeneratorContextValue,
} from './music-generator-provider';
