import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { formatCents } from '../money';
import { formatDateBR, type MonthKey } from '../month';
import { limitProgress } from '../summary';
import { buildExportPayload, categoryName, exportFileName, type ExportPayload } from './data';
import type { Bill, Category, Couple, Transaction } from '../types';

const MARGIN = 40;

// Cores do PDF, em RGB. Ficam aqui em vez de vir do CSS porque o PDF é sempre
// claro, independente do tema do celular.
const INK: [number, number, number] = [21, 24, 29];
const MUTED: [number, number, number] = [110, 118, 130];
const BRAND: [number, number, number] = [13, 148, 136];
const NEGATIVE: [number, number, number] = [190, 18, 60];
const HEADER_BG: [number, number, number] = [232, 245, 243];

/** Espaço não separável do Intl quebra o layout do PDF; trocamos por espaço normal. */
function money(cents: number): string {
  return formatCents(cents).replace(/ /g, ' ');
}

/**
 * Gera o PDF do mês: cabeçalho com saldo e limite, ranking de categorias,
 * extrato de lançamentos e as contas. Tudo no navegador.
 */
export function exportMonthToPdf(input: {
  couple: Couple;
  month: MonthKey;
  transactions: Transaction[];
  categories: Category[];
  bills: Bill[];
}): void {
  const payload = buildExportPayload(input);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let cursorY = drawHeader(doc, payload);
  cursorY = drawRanking(doc, payload, cursorY);
  cursorY = drawTransactions(doc, payload, cursorY);
  drawBills(doc, payload, cursorY);
  drawFooter(doc);

  doc.save(exportFileName(payload.month, 'pdf'));
}

function drawHeader(doc: jsPDF, payload: ExportPayload): number {
  const { couple, monthLabel, summary } = payload;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(couple.name, MARGIN, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`Controle de ${monthLabel}`, MARGIN, 76);

  // Saldo em destaque, à direita.
  const pageWidth = doc.internal.pageSize.getWidth();
  const negative = summary.balanceCents < 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...(negative ? NEGATIVE : BRAND));
  doc.text(money(summary.balanceCents), pageWidth - MARGIN, 58, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('saldo do mês', pageWidth - MARGIN, 72, { align: 'right' });

  autoTable(doc, {
    startY: 96,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    body: [
      ['Receitas', money(summary.incomeCents)],
      ['Despesas', money(summary.expenseCents)],
      [
        'Limite do mês',
        couple.monthly_limit_cents > 0
          ? `${money(summary.expenseCents)} de ${money(couple.monthly_limit_cents)}` +
            ` (${Math.round(limitProgress(summary.expenseCents, couple.monthly_limit_cents) * 100)}%)`
          : 'não definido',
      ],
    ],
    columnStyles: {
      0: { textColor: MUTED, cellWidth: 110 },
      1: { textColor: INK, fontStyle: 'bold' },
    },
  });

  return afterTable(doc, 96) + 14;
}

function drawRanking(doc: jsPDF, payload: ExportPayload, startY: number): number {
  const { ranking } = payload.summary;
  if (ranking.length === 0) return startY;

  sectionTitle(doc, 'Gastos por categoria', startY);

  autoTable(doc, {
    startY: startY + 14,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'striped',
    head: [['Categoria', 'Gasto', '% do total']],
    body: ranking.map((row) => [
      row.name,
      money(row.cents),
      `${Math.round(row.share * 100)}%`,
    ]),
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: HEADER_BG, textColor: INK, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right', cellWidth: 70 },
    },
  });

  return afterTable(doc, startY) + 20;
}

function drawTransactions(doc: jsPDF, payload: ExportPayload, startY: number): number {
  sectionTitle(doc, 'Lançamentos', startY);

  const body =
    payload.transactions.length > 0
      ? payload.transactions.map((t) => [
          formatDateBR(t.occurred_on),
          t.kind === 'income' ? 'Receita' : 'Despesa',
          categoryName(payload, t.category_id),
          t.description ?? '',
          `${t.kind === 'income' ? '+' : '-'} ${money(t.amount_cents)}`,
        ])
      : [['—', '', 'Nenhum lançamento neste mês', '', '']];

  autoTable(doc, {
    startY: startY + 14,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'striped',
    head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
    body,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: HEADER_BG, textColor: INK, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 52 },
      2: { cellWidth: 92 },
      4: { halign: 'right', cellWidth: 82 },
    },
  });

  return afterTable(doc, startY) + 20;
}

function drawBills(doc: jsPDF, payload: ExportPayload, startY: number): void {
  const all = [...payload.openBills, ...payload.paidBills].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );
  if (all.length === 0) return;

  const openTotal = payload.openBills.reduce((sum, b) => sum + b.amount_cents, 0);
  sectionTitle(doc, `Contas a pagar — ${money(openTotal)} em aberto`, startY);

  autoTable(doc, {
    startY: startY + 14,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'striped',
    head: [['Conta', 'Vencimento', 'Valor', 'Situação']],
    body: all.map((b) => [
      b.title,
      formatDateBR(b.due_date),
      money(b.amount_cents),
      b.paid_at ? 'Paga' : 'Em aberto',
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: HEADER_BG, textColor: INK, fontStyle: 'bold' },
    columnStyles: {
      1: { cellWidth: 76 },
      2: { halign: 'right', cellWidth: 76 },
      3: { cellWidth: 72 },
    },
  });
}

function sectionTitle(doc: jsPDF, text: string, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(text, MARGIN, y);
}

function drawFooter(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Gerado pelo Fincouple', MARGIN, pageHeight - 24);
    doc.text(`${page} de ${pages}`, pageWidth - MARGIN, pageHeight - 24, { align: 'right' });
  }
}

/**
 * Onde a última tabela terminou. O plugin grava isso em `lastAutoTable`;
 * o fallback existe para o caso de a tabela não ter sido desenhada.
 */
function afterTable(doc: jsPDF, fallbackY: number): number {
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY : fallbackY;
}
