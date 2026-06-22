export interface WpThemeResult {
  detected: boolean;
  name: string | null;
  slug: string | null;
  version: string | null;
  isChild: boolean;
  parentTheme: string | null;
}

async function fetchSafe(url: string, timeout = 8000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

function parseStyleCssField(css: string, field: string): string | null {
  const match = css.match(new RegExp(`^${field}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : null;
}

export async function checkWpThemes(domain: string, pageHtml: string): Promise<WpThemeResult> {
  const result: WpThemeResult = {
    detected: false,
    name: null,
    slug: null,
    version: null,
    isChild: false,
    parentTheme: null,
  };

  // Extract theme slug from the first /wp-content/themes/{slug}/ reference in the HTML
  const slugMatch = pageHtml.match(/\/wp-content\/themes\/([^/'"]+)\//);
  if (!slugMatch) {
    return result;
  }

  const slug = slugMatch[1];
  result.slug = slug;

  // Fetch the theme's style.css
  const styleCssUrl = `https://${domain}/wp-content/themes/${slug}/style.css`;
  const styleRes = await fetchSafe(styleCssUrl);

  if (!styleRes || styleRes.status !== 200) {
    // Slug was found in HTML but style.css is not accessible; still mark as detected
    result.detected = true;
    return result;
  }

  let cssText: string;
  try {
    cssText = await styleRes.text();
  } catch {
    result.detected = true;
    return result;
  }

  result.detected = true;
  result.name = parseStyleCssField(cssText, 'Theme Name');
  result.version = parseStyleCssField(cssText, 'Version');

  const template = parseStyleCssField(cssText, 'Template');
  if (template) {
    result.isChild = true;

    // Fetch parent theme's style.css to resolve its display name
    const parentStyleUrl = `https://${domain}/wp-content/themes/${template}/style.css`;
    const parentRes = await fetchSafe(parentStyleUrl);

    if (parentRes && parentRes.status === 200) {
      try {
        const parentCss = await parentRes.text();
        const parentName = parseStyleCssField(parentCss, 'Theme Name');
        result.parentTheme = parentName ?? template;
      } catch {
        result.parentTheme = template;
      }
    } else {
      result.parentTheme = template;
    }
  }

  return result;
}
