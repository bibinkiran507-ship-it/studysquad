import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const MAX_EXTRACTED_CHARS = 60_000;
const MAX_XML_ENTRY_UNCOMPRESSED = 15 * 1024 * 1024; // 15 MB zip-bomb guard

const decodeXmlEntities = (str) =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : '';
    });

const stripXmlToReadableText = (xml) => {
  if (!xml) return '';
  const withBreaks = xml
    .replace(/<\/(?:w:p|a:p|p|tr|li|h[1-6])>/gi, '\n')
    .replace(/<(?:w:br|br|w:cr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:w:tc|a:tc|td|th)>/gi, '\t');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(withoutTags)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Reads selected XML entries from a ZIP buffer (.docx or .pptx) using the ZIP Central Directory
 * and Node's built-in `zlib.inflateRawSync` (zero external dependencies).
 */
function readZipXmlEntries(zipBuf, entryMatcher) {
  const minEocdSize = 22;
  if (!Buffer.isBuffer(zipBuf) || zipBuf.length < minEocdSize) return [];

  const maxCommentScan = Math.min(zipBuf.length, 65557);
  let eocdOffset = -1;
  for (let i = zipBuf.length - minEocdSize; i >= zipBuf.length - maxCommentScan; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return [];

  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuf.readUInt32LE(eocdOffset + 16);
  if (cdOffset >= zipBuf.length) return [];

  const results = [];
  let pos = cdOffset;

  for (let idx = 0; idx < totalEntries && pos + 46 <= zipBuf.length; idx++) {
    if (zipBuf.readUInt32LE(pos) !== 0x02014b50) break;

    const method = zipBuf.readUInt16LE(pos + 10);
    const compSize = zipBuf.readUInt32LE(pos + 20);
    const uncompSize = zipBuf.readUInt32LE(pos + 24);
    const nameLen = zipBuf.readUInt16LE(pos + 28);
    const extraLen = zipBuf.readUInt16LE(pos + 30);
    const commentLen = zipBuf.readUInt16LE(pos + 32);
    const localOffset = zipBuf.readUInt32LE(pos + 42);

    const entryName = zipBuf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');
    pos += 46 + nameLen + extraLen + commentLen;

    if (!entryMatcher(entryName)) continue;
    if (uncompSize > MAX_XML_ENTRY_UNCOMPRESSED) continue;
    if (localOffset + 30 > zipBuf.length) continue;
    if (zipBuf.readUInt32LE(localOffset) !== 0x04034b50) continue;

    const lfhNameLen = zipBuf.readUInt16LE(localOffset + 26);
    const lfhExtraLen = zipBuf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lfhNameLen + lfhExtraLen;
    if (dataStart + compSize > zipBuf.length) continue;

    const rawSlice = zipBuf.subarray(dataStart, dataStart + compSize);
    try {
      let xml = '';
      if (method === 0) {
        xml = rawSlice.toString('utf8');
      } else if (method === 8) {
        xml = zlib
          .inflateRawSync(rawSlice, { maxOutputLength: MAX_XML_ENTRY_UNCOMPRESSED })
          .toString('utf8');
      }
      if (xml) {
        results.push({ name: entryName, xml });
      }
    } catch {
      // Skip malformed individual XML entry gracefully
    }
  }

  return results;
}

/**
 * Extracts clean plain text from `.txt`, `.md`, `.csv`, `.json`, `.docx`, or `.pptx` files
 * so Gemini can analyze Office documents reliably and extracted text persists in PostgreSQL.
 */
export function extractDocumentText(filePath, explicitExt = '') {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    if (stat.size === 0 || stat.size > 30 * 1024 * 1024) return '';

    const ext = (explicitExt || path.extname(filePath)).toLowerCase();

    if (['.txt', '.md', '.csv', '.json', '.js', '.py', '.java', '.ts'].includes(ext)) {
      return fs.readFileSync(filePath, 'utf8').slice(0, MAX_EXTRACTED_CHARS).trim();
    }

    if (ext === '.docx') {
      const buf = fs.readFileSync(filePath);
      const entries = readZipXmlEntries(
        buf,
        (name) => name === 'word/document.xml' || name === 'word/footnotes.xml'
      );
      const combined = entries.map((e) => stripXmlToReadableText(e.xml)).filter(Boolean).join('\n\n');
      return combined.slice(0, MAX_EXTRACTED_CHARS);
    }

    if (ext === '.pptx') {
      const buf = fs.readFileSync(filePath);
      const entries = readZipXmlEntries(buf, (name) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(name)
      );
      entries.sort((a, b) => {
        const numA = Number(a.name.match(/slide(\d+)\.xml/i)?.[1] || 0);
        const numB = Number(b.name.match(/slide(\d+)\.xml/i)?.[1] || 0);
        return numA - numB;
      });
      const slidesText = entries
        .map((e, i) => {
          const slideNum = e.name.match(/slide(\d+)\.xml/i)?.[1] || i + 1;
          const text = stripXmlToReadableText(e.xml);
          return text ? `[Slide ${slideNum}]\n${text}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      return slidesText.slice(0, MAX_EXTRACTED_CHARS);
    }

    return '';
  } catch (err) {
    console.warn('[DocExtractor] Could not extract text:', err.message);
    return '';
  }
}

