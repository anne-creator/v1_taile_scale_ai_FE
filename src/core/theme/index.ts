import { envConfigs } from '@/config';
import { defaultTheme } from '@/config/theme';

/**
 * get active theme
 * @deprecated Theme system is being phased out. Use direct imports from @/components/
 */
export function getActiveTheme(): string {
  const theme = envConfigs.theme as string;

  if (theme) {
    return theme;
  }

  return defaultTheme;
}

/**
 * convert kebab-case to PascalCase
 */
function kebabToPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * load theme page
 * Now loads from @/components/pages/ with fallback to legacy @/themes/
 */
export async function getThemePage(pageName: string, theme?: string) {
  try {
    // Try new location first: @/components/pages/
    const module = await import(`@/components/pages/${pageName}`);
    return module.default;
  } catch {
    // Fallback to legacy theme system
    const loadTheme = theme || getActiveTheme();
    try {
      const module = await import(`@/themes/${loadTheme}/pages/${pageName}`);
      return module.default;
    } catch (error) {
      // fallback to default theme
      if (loadTheme !== defaultTheme) {
        try {
          const fallbackModule = await import(
            `@/themes/${defaultTheme}/pages/${pageName}`
          );
          return fallbackModule.default;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw error;
    }
  }
}

/**
 * load theme layout
 * Now loads from @/components/layouts/ with fallback to legacy @/themes/
 */
export async function getThemeLayout(layoutName: string, theme?: string) {
  try {
    // Try new location first: @/components/layouts/
    const module = await import(`@/components/layouts/${layoutName}`);
    return module.default;
  } catch {
    // Fallback to legacy theme system
    const loadTheme = theme || getActiveTheme();
    try {
      const module = await import(`@/themes/${loadTheme}/layouts/${layoutName}`);
      return module.default;
    } catch (error) {
      // fallback to default theme
      if (loadTheme !== defaultTheme) {
        try {
          const fallbackModule = await import(
            `@/themes/${defaultTheme}/layouts/${layoutName}`
          );
          return fallbackModule.default;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw error;
    }
  }
}

/**
 * load theme block
 * Now loads from @/components/blocks/landing/ with fallback to legacy @/themes/
 */
export async function getThemeBlock(blockName: string, theme?: string) {
  const pascalCaseName = kebabToPascalCase(blockName);

  try {
    // Try new location first: @/components/blocks/landing/
    const module = await import(`@/components/blocks/landing/${blockName}`);
    const component = module[pascalCaseName] || module[blockName] || module.default;
    if (component) {
      return component;
    }
    throw new Error(`No valid export found in block "${blockName}"`);
  } catch {
    // Fallback to legacy theme system
    const loadTheme = theme || getActiveTheme();
    try {
      const module = await import(`@/themes/${loadTheme}/blocks/${blockName}`);
      const component = module[pascalCaseName] || module[blockName];
      if (!component) {
        throw new Error(`No valid export found in block "${blockName}"`);
      }
      return component;
    } catch (error) {
      // fallback to default theme
      if (loadTheme !== defaultTheme) {
        try {
          const fallbackModule = await import(
            `@/themes/${defaultTheme}/blocks/${blockName}`
          );
          const fallbackComponent =
            fallbackModule[pascalCaseName] || fallbackModule[blockName];
          if (!fallbackComponent) {
            throw new Error(
              `No valid export found in fallback block "${blockName}"`
            );
          }
          return fallbackComponent;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw error;
    }
  }
}
