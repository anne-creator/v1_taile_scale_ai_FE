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
 * load page component from @/components/pages/
 */
export async function getThemePage(pageName: string) {
  const module = await import(`@/components/pages/${pageName}`);
  return module.default;
}

/**
 * load layout component from @/components/layouts/
 */
export async function getThemeLayout(layoutName: string) {
  const module = await import(`@/components/layouts/${layoutName}`);
  return module.default;
}

/**
 * load block component from @/components/blocks/landing/
 */
export async function getThemeBlock(blockName: string) {
  const pascalCaseName = kebabToPascalCase(blockName);
  const module = await import(`@/components/blocks/landing/${blockName}`);
  const component = module[pascalCaseName] || module[blockName] || module.default;

  if (!component) {
    throw new Error(`No valid export found in block "${blockName}"`);
  }

  return component;
}
