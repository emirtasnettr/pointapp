import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

/** Admin/kampanya HTML — script, event handler ve tehlikeli URL’leri kaldırır. */
export function sanitizeRichHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  return sanitizeHtml(trimmed, SANITIZE_OPTIONS);
}

export function assertRichHtmlLength(html: string, maxChars = 500_000): string {
  const out = sanitizeRichHtml(html);
  if (out.length > maxChars) {
    throw new Error('İçerik çok uzun');
  }
  return out;
}
