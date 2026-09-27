import type { MonthKey } from '@/lib/month';
import { rowsFromInvoiceText, rowsFromMatrix, type ImportedRow } from './rows';

export class ImportFileError extends Error {}

/**
 * Lê um arquivo de extrato (.csv, .xlsx ou .pdf) e devolve as linhas já
 * interpretadas. As bibliotecas de planilha e de PDF só entram no bundle
 * quando a pessoa realmente importa algo -- o mesmo padrão de import
 * dinâmico usado nas exportações.
 */
export async function extractRowsFromFile(
  file: File,
  referenceMonth: MonthKey,
): Promise<ImportedRow[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    const matrix = await readSheet(file);
    return rowsFromMatrix(matrix, referenceMonth);
  }

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    return rowsFromMatrix(parseCsv(text), referenceMonth);
  }

  if (name.endsWith('.pdf')) {
    const text = await extractPdfText(file);
    return rowsFromInvoiceText(text, referenceMonth);
  }

  throw new ImportFileError('Formato não reconhecido. Envie um .csv, .xlsx ou .pdf.');
}

/** Parser de CSV simples: aspas, células com o separador dentro e `\r\n` ou
 *  `\n`. Detecta ";" como separador quando o arquivo usa mais ";" que ",",
 *  já que é o padrão de banco brasileiro exportado do Excel em pt-BR. */
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const lines: string[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();

    // O PDF entrega cada fragmento de texto solto, sem garantir a ordem de
    // leitura -- agrupa por linha (mesma altura) e ordena da esquerda para
    // a direita antes de juntar.
    const byLine = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const str = item.str;
      if (!str.trim()) continue;

      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const bucket = byLine.get(y) ?? [];
      bucket.push({ x, text: str });
      byLine.set(y, bucket);
    }

    const orderedLines = [...byLine.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.text)
          .join(' '),
      );

    lines.push(...orderedLines);
  }

  return lines.join('\n');
}
