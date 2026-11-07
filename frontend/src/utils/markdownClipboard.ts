/**
 * markdownClipboard.ts
 *
 * Robust clipboard utility to convert formatted rich text (HTML from web, apps,
 * spreadsheets, ChatGPT, Google Docs) or unformatted plain text into standard,
 * clean GitHub-Flavored Markdown (GFM).
 */

export interface ParsedMarkdownPhaste {
  title: string;
  category?: string;
  tags: string[];
  isTodo: boolean;
  content: string;
}

/**
 * Checks if an HTML string contains meaningful rich structural tags
 * rather than being a plain text wrapper.
 */
export function hasRichHtmlFormatting(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  return /<(h[1-6]|table|thead|tbody|tr|th|td|ul|ol|li|strong|b|em|i|del|s|strike|pre|code|blockquote|a|img|hr)[\s>]/i.test(
    html
  );
}

/**
 * Converts a Tab-Separated Values (TSV) string (e.g. copied from Excel/Google Sheets)
 * into a GitHub Flavored Markdown table.
 */
export function tsvToMarkdownTable(tsv: string): string {
  const lines = tsv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';

  const rows = lines.map((line) => line.split('\t').map((c) => c.trim()));
  const colCount = Math.max(...rows.map((r) => r.length));
  if (colCount < 2 && rows.length < 2) return tsv;

  const paddedRows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy;
  });

  const header = paddedRows[0];
  const separator = new Array(colCount).fill('---');
  const body = paddedRows.slice(1);

  const headerStr = `| ${header.join(' | ')} |`;
  const sepStr = `| ${separator.join(' | ')} |`;
  const bodyStrs = body.map((r) => `| ${r.join(' | ')} |`);

  return [headerStr, sepStr, ...bodyStrs].join('\n');
}

/**
 * Converts an HTML string or fragment into clean Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return '';

    return nodeToMarkdown(body).trim().replace(/\n{3,}/g, '\n\n');
  } catch (err) {
    console.warn('htmlToMarkdown conversion error:', err);
    return '';
  }
}

/**
 * Recursive DOM to Markdown converter
 */
function nodeToMarkdown(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // Preserve raw text inside PRE or CODE
    const parentTag = (node.parentElement?.tagName || '').toLowerCase();
    if (parentTag === 'pre' || parentTag === 'code') {
      return node.textContent || '';
    }
    // Collapse internal spaces slightly but preserve single spaces
    return (node.textContent || '').replace(/[\t\r\n]+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Child processing helper
  const childMd = (customDepth = listDepth): string => {
    let result = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      result += nodeToMarkdown(el.childNodes[i], customDepth);
    }
    return result;
  };

  switch (tag) {
    case 'h1':
      return `\n\n# ${childMd().trim()}\n\n`;
    case 'h2':
      return `\n\n## ${childMd().trim()}\n\n`;
    case 'h3':
      return `\n\n### ${childMd().trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${childMd().trim()}\n\n`;
    case 'h5':
      return `\n\n##### ${childMd().trim()}\n\n`;
    case 'h6':
      return `\n\n###### ${childMd().trim()}\n\n`;

    case 'p':
      return `\n\n${childMd().trim()}\n\n`;

    case 'br':
      return '\n';

    case 'hr':
      return '\n\n---\n\n';

    case 'strong':
    case 'b': {
      const text = childMd().trim();
      return text ? `**${text}**` : '';
    }

    case 'em':
    case 'i': {
      const text = childMd().trim();
      return text ? `*${text}*` : '';
    }

    case 'del':
    case 's':
    case 'strike': {
      const text = childMd().trim();
      return text ? `~~${text}~~` : '';
    }

    case 'code': {
      // If code is inside PRE, handled in pre
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return childMd();
      }
      const codeText = el.textContent || '';
      return codeText ? `\`${codeText}\`` : '';
    }

    case 'pre': {
      const langMatch =
        el.className.match(/(?:language|lang|highlight-source)-([a-zA-Z0-9_-]+)/) ||
        el.firstElementChild?.className.match(/(?:language|lang|highlight-source)-([a-zA-Z0-9_-]+)/);
      const lang = langMatch ? langMatch[1] : '';
      const text = (el.textContent || '').replace(/\r\n/g, '\n').trim();
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const inner = childMd().trim();
      const quoted = inner
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
      return `\n\n${quoted}\n\n`;
    }

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = childMd().trim() || href;
      if (!href) return text;
      return `[${text}](${href})`;
    }

    case 'img': {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || 'image';
      if (!src) return '';
      return `![${alt}](${src})`;
    }

    case 'ul':
    case 'ol': {
      let listResult = '\n';
      let index = 1;
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
          const liEl = child as HTMLElement;
          const indent = '  '.repeat(listDepth);

          // Check for task checklist
          const checkbox = liEl.querySelector('input[type="checkbox"]');
          if (checkbox) {
            const isChecked = (checkbox as HTMLInputElement).checked || checkbox.hasAttribute('checked');
            const clone = liEl.cloneNode(true) as HTMLElement;
            clone.querySelector('input[type="checkbox"]')?.remove();
            const liText = nodeToMarkdown(clone, listDepth + 1).trim();
            listResult += `${indent}- [${isChecked ? 'x' : ' '}] ${liText}\n`;
          } else if (tag === 'ol') {
            const liText = nodeToMarkdown(liEl, listDepth + 1).trim();
            listResult += `${indent}${index}. ${liText}\n`;
            index++;
          } else {
            const liText = nodeToMarkdown(liEl, listDepth + 1).trim();
            listResult += `${indent}- ${liText}\n`;
          }
        }
      }
      return listResult + '\n';
    }

    case 'li':
      return childMd(listDepth);

    case 'table': {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const parsedRows: string[][] = rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td'));
        return cells.map((c) => (c.textContent || '').replace(/[\r\n|]+/g, ' ').trim());
      });

      const maxCols = Math.max(...parsedRows.map((r) => r.length), 0);
      if (maxCols === 0) return '';

      const normalizedRows = parsedRows.map((r) => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });

      const header = normalizedRows[0];
      const sep = new Array(maxCols).fill('---');
      const body = normalizedRows.slice(1);

      const tableLines = [
        `| ${header.join(' | ')} |`,
        `| ${sep.join(' | ')} |`,
        ...body.map((r) => `| ${r.join(' | ')} |`),
      ];

      return `\n\n${tableLines.join('\n')}\n\n`;
    }

    default:
      return childMd();
  }
}

/**
 * Intelligently processes clipboard data (HTML or plain text) into clean Markdown.
 */
export function processClipboardToMarkdown(html?: string | null, plainText?: string | null): string {
  const plain = (plainText || '').trim();

  // 1. Check if TSV (Excel / Google Sheets)
  if (plain && plain.includes('\t') && plain.split('\n').filter((l) => l.includes('\t')).length >= 1) {
    if (!html || !html.includes('<table')) {
      const tsvTable = tsvToMarkdownTable(plain);
      if (tsvTable) return tsvTable;
    }
  }

  // 2. If rich HTML is present, convert it
  if (html && hasRichHtmlFormatting(html)) {
    const md = htmlToMarkdown(html);
    if (md) return md;
  }

  // 3. If plain text already has explicit markdown structure, keep it verbatim
  return plain;
}

/**
 * Parses markdown into title, category, hashtags, todo status, and clean content.
 */
export function parseMarkdownPhaste(rawTextOrHtml: { html?: string | null; plain?: string | null }): ParsedMarkdownPhaste {
  const markdown = processClipboardToMarkdown(rawTextOrHtml.html, rawTextOrHtml.plain);
  const lines = markdown.split('\n');

  let title = '📝 Untitled Phaste';

  const firstNonEmptyIndex = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmptyIndex !== -1) {
    const firstLine = lines[firstNonEmptyIndex].trim();
    const headingMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else {
      const cleanSnippet = firstLine.replace(/^[*\-_\s>#]+/, '').slice(0, 60).trim();
      if (cleanSnippet) {
        title = cleanSnippet;
      }
    }
  }

  const isTodo = /-\s*\[([ xX])\]/.test(markdown);

  const tagMatches = markdown.match(/#([a-zA-Z0-9_\-]+)/g) || [];
  const tags = Array.from(new Set(tagMatches.map((t) => t.slice(1).toLowerCase())));

  let category: string | undefined = undefined;
  if (tags.length > 0) {
    category = tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
  }

  return {
    title,
    category,
    tags,
    isTodo,
    content: markdown,
  };
}

/**
 * Reads from the OS clipboard, checking both formatted HTML and plain text.
 */
export async function readClipboardMarkdown(): Promise<string> {
  // 1. Try modern navigator.clipboard.read() for rich HTML + PlainText
  if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        let html: string | null = null;
        let plain: string | null = null;

        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          html = await blob.text();
        }
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          plain = await blob.text();
        }

        if (html || plain) {
          const md = processClipboardToMarkdown(html, plain);
          if (md) return md;
        }
      }
    } catch {
      // Permission denied or fallback to readText
    }
  }

  // 2. Fallback to readText()
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    try {
      const text = await navigator.clipboard.readText();
      return (text || '').trim();
    } catch {
      return '';
    }
  }

  return '';
}
