import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as ExcelJS from 'exceljs';
import { GreenWasteAiRepository } from './green-waste-ai.repository';
import { GoogleGenAiService } from '../../libs/google-genai/google-gen-ai.service';

const CATEGORY_LABELS: Record<string, string> = {
  PILAH_SAMPAH: 'Pilah & Olah Sampah',
  TANAM_POHON: 'Tanam Pohon & Area Hijau',
  KONSUMSI_HIJAU: 'Konsumsi Hijau',
  AKSI_KOLEKTIF: 'Aksi Kolektif',
};

type KelurahanReport = Awaited<
  ReturnType<GreenWasteAiRepository['getKelurahanReport']>
>;

@Injectable()
export class GreenWasteAiReportService {
  private readonly logger = new Logger(GreenWasteAiReportService.name);

  constructor(
    private readonly repository: GreenWasteAiRepository,
    private readonly genAiService: GoogleGenAiService,
  ) {}

  async getDistinctDistricts(): Promise<{ district: string; city: string }[]> {
    return this.repository.getDistinctKelurahans();
  }

  async generateDistrictPdf(district: string): Promise<Buffer> {
    const report = await this.repository.getKelurahanReport(district);

    if (report.totalActions === 0) {
      throw new NotFoundException(
        `No verified green action data found for district "${district}"`,
      );
    }

    const narrative = await this.generateNarrative(report);
    return this.buildPdf(report, narrative);
  }

  async generateDistrictExcel(district: string): Promise<Buffer> {
    const actions = await this.repository.findAllByDistrict(district);

    if (actions.length === 0) {
      throw new NotFoundException(
        `No green action data found for district "${district}"`,
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sirkula';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Green Actions');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Kategori', key: 'category', width: 22 },
      { header: 'Deskripsi', key: 'description', width: 35 },
      { header: 'Kuantitas', key: 'quantity', width: 12 },
      { header: 'Satuan', key: 'actionType', width: 10 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Skor AI', key: 'aiScore', width: 10 },
      { header: 'Feedback AI', key: 'aiFeedback', width: 40 },
      { header: 'Poin', key: 'points', width: 8 },
      { header: 'Lokasi', key: 'locationName', width: 28 },
      { header: 'Kelurahan', key: 'district', width: 18 },
      { header: 'Kota', key: 'city', width: 18 },
      { header: 'Latitude', key: 'latitude', width: 14 },
      { header: 'Longitude', key: 'longitude', width: 14 },
      { header: 'Media URL', key: 'mediaUrl', width: 40 },
      { header: 'Tipe Media', key: 'mediaType', width: 10 },
      { header: 'Nama Warga', key: 'userName', width: 22 },
      { header: 'Email Warga', key: 'userEmail', width: 28 },
      { header: 'Tanggal', key: 'createdAt', width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B5E20' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i] as any;
      sheet.addRow({
        no: i + 1,
        id: a.id,
        category: CATEGORY_LABELS[a.category] || a.category,
        description: a.description || '',
        quantity: a.quantity,
        actionType: a.action_type || '',
        status: a.status,
        aiScore: a.ai_score,
        aiFeedback: a.ai_feedback || '',
        points: a.points,
        locationName: a.location_name || '',
        district: a.district || '',
        city: a.city || '',
        latitude: a.latitude,
        longitude: a.longitude,
        mediaUrl: a.media_url,
        mediaType: a.media_type,
        userName: a.user?.name || '',
        userEmail: a.user?.email || '',
        createdAt: a.created_at,
      });
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { vertical: 'middle', wrapText: true };
      row.font = { size: 10 };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async generateNarrative(report: KelurahanReport): Promise<string> {
    const categoryBreakdown = report.byCategory
      .map(
        (c) =>
          `${CATEGORY_LABELS[c.category] || c.category}: ${c.count} aksi, kuantitas ${c.quantity}`,
      )
      .join('; ');

    const prompt = `Kamu adalah penulis laporan resmi pemerintahan tentang program lingkungan hidup.
Buatkan narasi laporan formal dalam Bahasa Indonesia untuk kelurahan berikut. Gunakan gaya bahasa formal seperti laporan Dinas Lingkungan Hidup.

DATA KELURAHAN:
- Nama Kelurahan: ${report.district}
- Kota: ${report.city}
- Total Aksi Terverifikasi: ${report.totalActions}
- Total Kuantitas: ${report.totalQuantity}
- Total Poin: ${report.totalPoints}
- Jumlah Warga Partisipan: ${report.totalUsers}
- Aksi Ditolak: ${report.rejectedActions}

RINCIAN PER KATEGORI:
${categoryBreakdown || 'Belum ada data kategori'}

INSTRUKSI:
1. Buat paragraf pembuka yang menjelaskan gambaran umum kegiatan aksi hijau di kelurahan tersebut
2. Jelaskan rincian per kategori aksi yang telah dilakukan warga
3. Berikan analisis singkat mengenai partisipasi warga dan dampak terhadap lingkungan
4. Buat paragraf penutup dengan saran atau rekomendasi
5. Gunakan bahasa Indonesia formal, resmi, dan profesional
6. HANYA gunakan angka dari data di atas, JANGAN mengarang angka
7. Maksimal 400 kata
8. Jangan gunakan format markdown, bullets, atau heading. Tulis dalam paragraf narasi saja.`;

    try {
      const response = await this.genAiService.generateFromText(prompt);
      if (response.success && response.text) {
        return response.text.trim();
      }
      this.logger.warn('AI narrative generation failed, using fallback');
      return this.buildFallbackNarrative(report);
    } catch (error) {
      this.logger.error('Error generating narrative', error);
      return this.buildFallbackNarrative(report);
    }
  }

  private buildFallbackNarrative(report: KelurahanReport): string {
    const parts: string[] = [];

    parts.push(
      `Berdasarkan data yang tercatat dalam sistem Sirkula, Kelurahan ${report.district}, ${report.city} telah mencatatkan sebanyak ${report.totalActions} aksi hijau terverifikasi dengan total kuantitas sebesar ${report.totalQuantity}. Kegiatan ini melibatkan ${report.totalUsers} warga partisipan yang secara aktif berkontribusi dalam program pelestarian lingkungan hidup.`,
    );

    if (report.byCategory.length > 0) {
      const categoryDesc = report.byCategory
        .map(
          (c) =>
            `kategori ${CATEGORY_LABELS[c.category] || c.category} sebanyak ${c.count} aksi dengan kuantitas ${c.quantity}`,
        )
        .join(', ');
      parts.push(
        `Adapun rincian kegiatan per kategori meliputi ${categoryDesc}.`,
      );
    }

    parts.push(
      `Total poin yang berhasil dikumpulkan oleh warga di kelurahan ini adalah ${report.totalPoints} poin. Hal ini menunjukkan tingkat partisipasi dan komitmen warga dalam menjaga kelestarian lingkungan di wilayah Kelurahan ${report.district}.`,
    );

    return parts.join('\n\n');
  }

  private buildPdf(
    report: KelurahanReport,
    narrative: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
        bufferPages: true,
        info: {
          Title: `Laporan Aksi Hijau - Kelurahan ${report.district}`,
          Author: 'Sirkula - Sense Every Action, Reward Every Impact',
          Subject: `Laporan per Kelurahan ${report.district}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentWidth = right - left;
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      this.renderHeader(doc, report, dateStr, left, contentWidth);
      this.renderSummaryTable(doc, report, left, contentWidth);
      this.renderCategoryTable(doc, report, left, contentWidth);
      this.renderNarrative(doc, narrative, left, contentWidth);
      this.renderRecentActions(doc, report, left, contentWidth);
      this.renderClosing(doc, dateStr, left, contentWidth);

      doc.end();
    });
  }

  private renderHeader(
    doc: PDFKit.PDFDocument,
    report: KelurahanReport,
    dateStr: string,
    left: number,
    w: number,
  ) {
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(
      'PEMERINTAH KOTA ' + (report.city || '').toUpperCase(),
      left,
      doc.y,
      { align: 'center', width: w },
    );
    doc.text('DINAS LINGKUNGAN HIDUP', left, doc.y, {
      align: 'center',
      width: w,
    });

    doc.moveDown(0.4);
    const lineY = doc.y;
    doc
      .moveTo(left, lineY)
      .lineTo(left + w, lineY)
      .lineWidth(1.5)
      .strokeColor('#000000')
      .stroke();
    doc
      .moveTo(left, lineY + 2)
      .lineTo(left + w, lineY + 2)
      .lineWidth(0.5)
      .stroke();

    doc.y = lineY + 14;

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text('LAPORAN AKSI HIJAU', left, doc.y, {
      align: 'center',
      width: w,
    });

    doc.fontSize(12);
    doc.text(`KELURAHAN ${report.district.toUpperCase()}`, left, doc.y, {
      align: 'center',
      width: w,
    });

    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(`Tanggal Cetak: ${dateStr}`, left, doc.y, {
      align: 'center',
      width: w,
    });

    doc.moveDown(1.2);
  }

  private renderSummaryTable(
    doc: PDFKit.PDFDocument,
    report: KelurahanReport,
    left: number,
    w: number,
  ) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('I. Ringkasan Data', left, doc.y, { width: w });
    doc.moveDown(0.5);

    const rows: [string, string][] = [
      ['Kelurahan', report.district],
      ['Kota', report.city || '-'],
      ['Total Aksi Terverifikasi', String(report.totalActions)],
      ['Total Kuantitas', String(report.totalQuantity)],
      ['Total Poin', String(report.totalPoints)],
      ['Jumlah Warga Partisipan', String(report.totalUsers)],
      ['Aksi Ditolak', String(report.rejectedActions)],
    ];

    const labelW = w * 0.45;
    const rowH = 24;
    let y = doc.y;

    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];

      if (i % 2 === 0) {
        doc.save();
        doc.rect(left, y, w, rowH).fill('#f2f2f2');
        doc.restore();
      }

      doc.save();
      doc.rect(left, y, w, rowH).lineWidth(0.3).strokeColor('#cccccc').stroke();
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333');
      doc.text(label, left + 10, y + 7, { width: labelW - 20 });

      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      doc.text(value, left + labelW + 10, y + 7, { width: w - labelW - 20 });

      y += rowH;
    }

    doc.x = left;
    doc.y = y + 18;
  }

  private renderCategoryTable(
    doc: PDFKit.PDFDocument,
    report: KelurahanReport,
    left: number,
    w: number,
  ) {
    if (!report.byCategory || report.byCategory.length === 0) return;
    this.ensureSpace(doc, 100);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('II. Rincian Per Kategori', left, doc.y, { width: w });
    doc.moveDown(0.5);

    const cols = [w * 0.5, w * 0.25, w * 0.25];
    const headers = ['Kategori', 'Jumlah Aksi', 'Kuantitas'];
    const rowH = 24;
    let y = doc.y;

    doc.save();
    doc.rect(left, y, w, rowH).fill('#1b5e20');
    doc.restore();

    let x = left;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + 10, y + 7, { width: cols[i] - 20 });
      x += cols[i];
    }
    y += rowH;

    for (let i = 0; i < report.byCategory.length; i++) {
      const row = report.byCategory[i];

      if (i % 2 === 0) {
        doc.save();
        doc.rect(left, y, w, rowH).fill('#f2f2f2');
        doc.restore();
      }

      doc.save();
      doc.rect(left, y, w, rowH).lineWidth(0.3).strokeColor('#cccccc').stroke();
      doc.restore();

      const data = [
        CATEGORY_LABELS[row.category] || row.category,
        String(row.count),
        String(row.quantity),
      ];

      x = left;
      for (let j = 0; j < data.length; j++) {
        doc
          .font(j === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor('#333333');
        doc.text(data[j], x + 10, y + 7, { width: cols[j] - 20 });
        x += cols[j];
      }
      y += rowH;
    }

    doc.x = left;
    doc.y = y + 18;
  }

  private renderNarrative(
    doc: PDFKit.PDFDocument,
    narrative: string,
    left: number,
    w: number,
  ) {
    this.ensureSpace(doc, 80);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('III. Analisis dan Pembahasan', left, doc.y, { width: w });
    doc.moveDown(0.5);

    const paragraphs = narrative.split(/\n+/);
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      this.ensureSpace(doc, 40);
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(trimmed, left, doc.y, {
        width: w,
        align: 'justify',
        lineGap: 2,
        indent: 28,
      });
      doc.moveDown(0.4);
    }

    doc.moveDown(0.8);
  }

  private renderRecentActions(
    doc: PDFKit.PDFDocument,
    report: KelurahanReport,
    left: number,
    w: number,
  ) {
    if (!report.recentActions || report.recentActions.length === 0) return;
    this.ensureSpace(doc, 100);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('IV. Daftar Aksi Terbaru', left, doc.y, { width: w });
    doc.moveDown(0.5);

    const cols = [
      w * 0.06,
      w * 0.25,
      w * 0.12,
      w * 0.1,
      w * 0.15,
      w * 0.17,
      w * 0.15,
    ];
    const headers = [
      'No',
      'Kategori',
      'Kuantitas',
      'Poin',
      'Tanggal',
      'Lokasi',
      'Warga',
    ];
    const rowH = 20;
    let y = doc.y;

    doc.save();
    doc.rect(left, y, w, rowH).fill('#1b5e20');
    doc.restore();

    let x = left;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + 4, y + 6, { width: cols[i] - 8 });
      x += cols[i];
    }
    y += rowH;

    const maxRows = Math.min(report.recentActions.length, 15);
    for (let i = 0; i < maxRows; i++) {
      this.ensureSpace(doc, rowH + 5);
      y = doc.y > y ? doc.y : y;

      const action = report.recentActions[i];

      if (i % 2 === 0) {
        doc.save();
        doc.rect(left, y, w, rowH).fill('#f8f8f8');
        doc.restore();
      }

      doc.save();
      doc.rect(left, y, w, rowH).lineWidth(0.2).strokeColor('#dddddd').stroke();
      doc.restore();

      const dateStr = new Date(action.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });

      const loc = this.truncate(action.locationName || '-', 18);
      const userName = this.truncate(action.userName, 14);

      const rowData = [
        String(i + 1),
        CATEGORY_LABELS[action.category] || action.category,
        `${action.quantity}${action.actionType ? ' ' + action.actionType : ''}`,
        String(action.points),
        dateStr,
        loc,
        userName,
      ];

      x = left;
      doc.font('Helvetica').fontSize(7.5).fillColor('#333333');
      for (let j = 0; j < rowData.length; j++) {
        doc.text(rowData[j], x + 4, y + 6, { width: cols[j] - 8 });
        x += cols[j];
      }
      y += rowH;
    }

    doc.x = left;
    doc.y = y + 18;
  }

  private renderClosing(
    doc: PDFKit.PDFDocument,
    dateStr: string,
    left: number,
    w: number,
  ) {
    this.ensureSpace(doc, 160);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('V. Penutup', left, doc.y, { width: w });
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(10).fillColor('#333333');
    doc.text(
      'Demikian laporan aksi hijau ini disusun berdasarkan data yang tercatat dalam sistem Sirkula. Laporan ini dapat digunakan sebagai bahan evaluasi dan referensi dalam pengambilan keputusan terkait program pelestarian lingkungan hidup di wilayah terkait.',
      left,
      doc.y,
      { width: w, align: 'justify', lineGap: 2, indent: 28 },
    );

    doc.moveDown(2.5);

    const sigX = left + w * 0.55;
    const sigW = w * 0.42;

    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    doc.text(dateStr, sigX, doc.y, { width: sigW });
    doc.moveDown(0.2);

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
    doc.text('Sirkula - Sense Every Action, Reward Every Impact', sigX, doc.y, {
      width: sigW,
    });

    doc.moveDown(3.5);

    const lineStartY = doc.y;
    doc
      .moveTo(sigX, lineStartY)
      .lineTo(sigX + sigW * 0.85, lineStartY)
      .lineWidth(0.5)
      .strokeColor('#333333')
      .stroke();

    doc.y = lineStartY + 6;
    doc.font('Helvetica').fontSize(8).fillColor('#888888');
    doc.text('Dicetak secara otomatis oleh sistem', sigX, doc.y, {
      width: sigW,
    });
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  private truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max - 2) + '..';
  }
}
