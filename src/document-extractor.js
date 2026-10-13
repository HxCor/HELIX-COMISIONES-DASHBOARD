import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseHelixText } from './parse-document.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const pageToLines = async (page) => {
  const content = await page.getTextContent();
  const rows = new Map();
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5] / 3) * 3;
    const row = rows.get(y) || [];
    row.push({ x: item.transform[4], text: item.str });
    rows.set(y, row);
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join('  '))
    .join('\n');
};

export async function extractHelixPdf(file, clientNames) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    pages.push(await pageToLines(await document.getPage(pageNumber)));
  }
  const text = pages.join('\n\n--- PÁGINA ---\n\n');
  if (text.replace(/\s/g, '').length < 80) {
    throw new Error('Este PDF parece escaneado y no contiene texto extraíble. Usa el PDF digital original.');
  }
  return parseHelixText(text, { clientNames, pageCount: document.numPages });
}
