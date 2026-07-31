import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ContentItem } from '@prisma/client';
import { addDays, format } from 'date-fns';
import puppeteer, { Browser } from 'puppeteer';
import { getPuppeteerLaunchOptions } from '../../common/puppeteer.config';
import { PrismaService } from '../../prisma/prisma.service';

const WEEKDAY_LABELS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const GOALS = ['Meet deadlines.', 'Communicate clearly.', 'Deliver quality work.'];

const NOTES = [
  'Check in daily on progress.',
  'Report delays to leadership early.',
  'Stay organized and professional in all tasks.',
  'Keep files clearly named and easy to access.',
];

interface ClientCalendarData {
  clientName: string;
  itemsByWeekday: ContentItem[][];
}

@Injectable()
export class CalendarPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(CalendarPdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch(getPuppeteerLaunchOptions());
    }
    return this.browserPromise;
  }

  /** Mon=0 .. Sun=6, regardless of the JS Date.getDay() Sun=0 convention. */
  private weekdayIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
  }

  private bucketByWeekday(items: ContentItem[]): ContentItem[][] {
    const buckets: ContentItem[][] = Array.from({ length: 7 }, () => []);
    for (const item of items) {
      buckets[this.weekdayIndex(item.scheduledDate)].push(item);
    }
    return buckets;
  }

  async generateForClient(
    marketingClientId: string,
    weekStart: Date,
  ): Promise<{ buffer: Buffer; clientName: string }> {
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    const mc = await this.prisma.marketingClient.findUnique({
      where: { id: marketingClientId },
      include: { client: true },
    });
    if (!mc) {
      throw new Error('Marketing client not found');
    }

    const items = await this.prisma.contentItem.findMany({
      where: {
        marketingClientId,
        scheduledDate: { gte: weekStart, lte: weekEnd },
        deletedAt: null,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const clientName = mc.client?.companyName ?? 'Client';
    const html = this.renderDocument(
      [{ clientName, itemsByWeekday: this.bucketByWeekday(items) }],
      weekStart,
    );
    const buffer = await this.renderPdf(html);
    return { buffer, clientName };
  }

  async generateForAllClients(weekStart: Date): Promise<Buffer> {
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    const items = await this.prisma.contentItem.findMany({
      where: {
        scheduledDate: { gte: weekStart, lte: weekEnd },
        deletedAt: null,
        marketingClient: { isActive: true },
      },
      include: { marketingClient: { include: { client: true } } },
      orderBy: [{ marketingClientId: 'asc' }, { scheduledDate: 'asc' }],
    });

    const byClient = new Map<string, ClientCalendarData>();
    for (const item of items) {
      const existing = byClient.get(item.marketingClientId);
      if (existing) {
        existing.itemsByWeekday[this.weekdayIndex(item.scheduledDate)].push(item);
        continue;
      }
      const buckets: ContentItem[][] = Array.from({ length: 7 }, () => []);
      buckets[this.weekdayIndex(item.scheduledDate)].push(item);
      byClient.set(item.marketingClientId, {
        clientName: item.marketingClient.client?.companyName ?? 'Client',
        itemsByWeekday: buckets,
      });
    }

    // Include active clients with zero scheduled content this week too, so
    // the export still gives them a (empty) planning sheet.
    const allActive = await this.prisma.marketingClient.findMany({
      where: { isActive: true },
      include: { client: true },
    });
    for (const mc of allActive) {
      if (!byClient.has(mc.id)) {
        byClient.set(mc.id, {
          clientName: mc.client?.companyName ?? 'Client',
          itemsByWeekday: Array.from({ length: 7 }, () => []),
        });
      }
    }

    const sections = Array.from(byClient.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName),
    );

    if (sections.length === 0) {
      throw new Error('No active marketing clients found');
    }

    const html = this.renderDocument(sections, weekStart);
    return this.renderPdf(html);
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private renderDocument(sections: ClientCalendarData[], weekStart: Date): string {
    const weekEnd = addDays(weekStart, 6);
    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

    const pages = sections
      .map((section) => this.renderClientPage(section, weekLabel))
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; }
  .page {
    width: 100%;
    min-height: 100vh;
    padding: 48px 56px;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .title-row { display: flex; align-items: center; gap: 18px; }
  .title-row .hr { flex: 1; height: 1px; background: #7FCBE0; }
  .title-row h1 {
    margin: 0; font-size: 22px; font-weight: 400; letter-spacing: 7px;
    white-space: nowrap; color: #1f2937;
  }
  .week-label {
    text-align: center; margin: 6px 0 0; font-size: 11px; letter-spacing: 2px;
    color: #9ca3af; text-transform: uppercase;
  }
  .grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    margin-top: 32px;
  }
  .box {
    position: relative; border: 1.5px solid #F2A6C6; border-radius: 10px;
    min-height: 132px; padding: 24px 16px 16px; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
  }
  .box.blue { border-color: #7FCBE0; }
  .box-label {
    position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
    background: #fff; padding: 0 12px; font-size: 10px; letter-spacing: 3px;
    color: #6b7280; white-space: nowrap;
  }
  .box-content { font-size: 13px; font-weight: 700; letter-spacing: 1px; line-height: 1.9; color: #111827; }
  .bullets { margin: 0; padding: 0; list-style: none; text-align: left; font-size: 11.5px; font-weight: 700; line-height: 1.9; color: #111827; }
  .bullets li { padding-left: 14px; position: relative; }
  .bullets li::before { content: '•'; position: absolute; left: 0; }
  .notes-box { margin-top: 20px; }
  .notes-box .box { min-height: auto; align-items: flex-start; padding: 26px 24px 18px; }
</style>
</head>
<body>${pages}</body>
</html>`;
  }

  private renderClientPage(section: ClientCalendarData, weekLabel: string): string {
    const dayBoxes = WEEKDAY_LABELS.slice(0, 6)
      .map((label, i) => this.renderDayBox(label, section.itemsByWeekday[i]))
      .join('');
    const sundayBox = this.renderDayBox('SUNDAY', section.itemsByWeekday[6]);
    const goalsBox = `
      <div class="box blue">
        <span class="box-label">GOALS</span>
        <ul class="bullets">${GOALS.map((g) => `<li>${this.escapeHtml(g)}</li>`).join('')}</ul>
      </div>`;
    const notesBox = `
      <div class="notes-box">
        <div class="box blue">
          <span class="box-label">NOTES</span>
          <ul class="bullets">${NOTES.map((n) => `<li>${this.escapeHtml(n)}</li>`).join('')}</ul>
        </div>
      </div>`;

    return `
      <div class="page">
        <div class="title-row">
          <span class="hr"></span>
          <h1>${this.escapeHtml(section.clientName.toUpperCase())}</h1>
          <span class="hr"></span>
        </div>
        <p class="week-label">Week of ${weekLabel}</p>
        <div class="grid">
          ${dayBoxes}
          ${sundayBox}
          ${goalsBox}
        </div>
        ${notesBox}
      </div>`;
  }

  private renderDayBox(label: string, items: ContentItem[]): string {
    const content = items.length
      ? items.map((i) => this.escapeHtml(i.contentType)).join('<br>')
      : '';
    return `
      <div class="box">
        <span class="box-label">${label}</span>
        <div class="box-content">${content}</div>
      </div>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
