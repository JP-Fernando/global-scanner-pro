/**
 * Report Generation Job Processor
 *
 * Generates Excel or PDF reports asynchronously without blocking the
 * HTTP event loop. The generated report is base64-encoded and returned
 * as the job result so callers can stream it back to the client.
 *
 * Expected job data shape:
 * ```json
 * {
 *   "type": "excel" | "pdf",
 *   "reportKind": "scan" | "portfolio" | "backtest" | "comparative",
 *   "title": "Q1 2026 Scan Results",
 *   "data": { ... }    // report-specific payload
 * }
 * ```
 *
 * @module queue/processors/report-generation.processor
 */

import type { Job } from 'bullmq';
import { log } from '../../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportType = 'excel' | 'pdf';
export type ReportKind = 'scan' | 'portfolio' | 'backtest' | 'comparative';

export interface ReportJobData {
  type: ReportType;
  reportKind: ReportKind;
  title: string;
  data: unknown;
}

export interface ReportResult {
  type: ReportType;
  reportKind: ReportKind;
  title: string;
  mimeType: string;
  filename: string;
  /** Base64-encoded report file content */
  content: string;
  sizeBytes: number;
  processingTimeMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mimeType(type: ReportType): string {
  return type === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
}

function filenameFor(kind: ReportKind, type: ReportType, title: string): string {
  const safe = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const ext = type === 'excel' ? 'xlsx' : 'pdf';
  const ts = new Date().toISOString().slice(0, 10);
  return `${kind}_${safe}_${ts}.${ext}`;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export async function reportGenerationProcessor(job: Job<ReportJobData>): Promise<ReportResult> {
  const t0 = Date.now();
  const { type, reportKind, title, data } = job.data;

  log.info(`Report generation started: ${type}/${reportKind}`, { jobId: job.id, title });
  await job.updateProgress(10);

  let content: Buffer;

  try {
    if (type === 'excel') {
      // Dynamically import the report generator to avoid loading xlsx at startup
      const reportModule = await import('../../reports/report-generator.js');
      const ReportGeneratorClass = (reportModule as any).ReportGenerator;
      const generator = new ReportGeneratorClass();
      await job.updateProgress(30);

      const workbook = await (generator as any).generateExcelReport(reportKind, title, data);
      await job.updateProgress(70);

      // xlsx writeBuffer returns an ArrayBuffer
      const { default: XLSX } = await import('xlsx');
      const ab: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      content = Buffer.from(ab);
    } else {
      // PDF generation via jsPDF
      const { jsPDF } = await import('jspdf');
      await job.updateProgress(30);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toISOString()}`, 14, 30);
      doc.text(`Report kind: ${reportKind}`, 14, 37);

      // Render data as JSON summary (placeholder — real templates in reports/pdf-templates.ts)
      const summary = JSON.stringify(data, null, 2).slice(0, 2000);
      const lines = doc.splitTextToSize(summary, 180);
      doc.text(lines, 14, 50);

      await job.updateProgress(70);
      const pdfArray = doc.output('arraybuffer');
      content = Buffer.from(pdfArray);
    }
  } catch (err) {
    log.error(`Report generation failed: ${type}/${reportKind}`, {
      jobId: job.id,
      error: (err as Error).message
    });
    throw err;
  }

  await job.updateProgress(90);

  const b64 = content.toString('base64');
  const processingTimeMs = Date.now() - t0;

  log.info(`Report generation completed: ${type}/${reportKind} (${content.length} bytes, ${processingTimeMs}ms)`, {
    jobId: job.id
  });

  await job.updateProgress(100);

  return {
    type,
    reportKind,
    title,
    mimeType: mimeType(type),
    filename: filenameFor(reportKind, type, title),
    content: b64,
    sizeBytes: content.length,
    processingTimeMs
  };
}
