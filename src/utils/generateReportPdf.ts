import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Entry } from '../types/userData';
import { isTransferEntry } from './entryUtils';

interface ReportPdfInput {
  userName: string;
  entries: Entry[];
  investments: { length: number };
  goals: { length: number };
}

/** Gera relatório financeiro mensal em PDF (compatível com o legado). */
export function generateReportPdf(input: ReportPdfInput): void {
  const { userName, entries, investments, goals } = input;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const mesAno = mes.charAt(0).toUpperCase() + mes.slice(1);
  const displayName = userName?.trim() || 'Usuário';

  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const mesEntries = entries.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() === cm && d.getFullYear() === cy;
  });
  const mesEntriesNoTransfer = mesEntries.filter((e) => !isTransferEntry(e));
  const receitaMes = mesEntriesNoTransfer.filter((e) => e.type === 'receita').reduce((s, e) => s + Number(e.value), 0);
  const despesaMes = mesEntriesNoTransfer.filter((e) => e.type === 'despesa').reduce((s, e) => s + Number(e.value), 0);
  const saldoMes = receitaMes - despesaMes;

  // Capa
  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Sibanki', 105, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Financeiro Mensal', 105, 32, { align: 'center' });
  doc.text(mesAno, 105, 40, { align: 'center' });
  doc.setFillColor(46, 125, 50);
  doc.rect(0, 50, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(displayName, 14, 60);
  doc.text('Gerado em ' + today, 14, 67);

  doc.addPage();
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.text('Resumo Financeiro', 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [['Indicador', 'Valor (R$)']],
    body: [
      ['Receitas do Mês', 'R$ ' + receitaMes.toFixed(2)],
      ['Despesas do Mês', 'R$ ' + despesaMes.toFixed(2)],
      ['Saldo do Mês', 'R$ ' + saldoMes.toFixed(2)],
      ['Total Lançamentos', String(entries.length)],
      ['Total Investimentos', String(investments.length)],
      ['Total Metas', String(goals.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [26, 35, 126] },
    styles: { fontSize: 10 },
  });

  let startY = (doc as any).lastAutoTable?.finalY != null ? (doc as any).lastAutoTable.finalY + 15 : 75;

  doc.setFontSize(14);
  doc.text('Lançamentos do Mês', 14, startY);
  startY += 10;

  const sorted = [...mesEntries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (sorted.length > 0) {
    const rows = sorted.map((e) => [
      new Date((e.date || '') + 'T12:00:00').toLocaleDateString('pt-BR'),
      e.type === 'receita' ? 'Receita' : 'Despesa',
      (e.desc || '-').slice(0, 40),
      e.category || '-',
      'R$ ' + Number(e.value).toFixed(2),
      e.account || '-',
    ]);
    autoTable(doc, {
      startY,
      head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Conta']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [26, 35, 126] },
      styles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' } },
    });
    startY = (doc as any).lastAutoTable?.finalY != null ? (doc as any).lastAutoTable.finalY + 15 : startY + 50;
  }

  const cats: Record<string, number> = {};
  mesEntriesNoTransfer.filter((e) => e.type === 'despesa').forEach((e) => {
    const c = e.category || 'Outros';
    cats[c] = (cats[c] || 0) + Number(e.value);
  });
  const catRows = Object.keys(cats)
    .sort((a, b) => cats[b] - cats[a])
    .map((c) => {
      const pct = despesaMes > 0 ? ((cats[c] / despesaMes) * 100).toFixed(1) : '0';
      return [c, 'R$ ' + cats[c].toFixed(2), pct + '%'];
    });

  if (catRows.length > 0) {
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }
    doc.setFontSize(14);
    doc.text('Despesas por Categoria', 14, startY);
    autoTable(doc, {
      startY: startY + 5,
      head: [['Categoria', 'Valor', '%']],
      body: catRows,
      theme: 'grid',
      headStyles: { fillColor: [26, 35, 126] },
      styles: { fontSize: 9 },
    });
  }

  const totalPag = doc.getNumberOfPages();
  for (let p = 1; p <= totalPag; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Sibanki', 14, 290);
    doc.text('Página ' + p + ' de ' + totalPag + ' | Gerado em ' + today, 105, 290, { align: 'center' });
  }

  doc.save('Sibanki_Relatorio_' + new Date().toISOString().split('T')[0] + '.pdf');
}
