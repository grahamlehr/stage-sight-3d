import type { StageScreen, StoryboardSet } from '../store/useStageStore';
import { SLOT_HEIGHT, SLOT_WIDTH, appendixRows, formatCoverDate, pageSize, storyboardPages, toWinAnsi } from './storyboardPdf';

export interface StoryboardCover {
  eventName: string;
  speakerName: string;
  /** yyyy-mm-dd, as an `<input type="date">` gives it. */
  date: string;
  agencyName: string;
  logo: { bytes: Uint8Array; type: 'png' | 'jpeg' } | null;
}

export interface ExportStoryboardOptions {
  sets: readonly StoryboardSet[];
  cover: StoryboardCover;
  roomName: string;
  includeAppendix: boolean;
  primaryScreen: Pick<StageScreen, 'position' | 'rotation' | 'height'>;
}

// Colours match the app's ground and ink tokens
const GROUND: [number, number, number] = [0x0d / 255, 0x12 / 255, 0x1b / 255];
const INK: [number, number, number] = [0xf2 / 255, 0xf5 / 255, 0xf9 / 255];
const ACCENT: [number, number, number] = [0xec / 255, 0x30 / 255, 0x13 / 255];

/**
 * Builds the client-ready storyboard PDF entirely in the browser. pdf-lib is
 * imported on demand so it sits in its own chunk, outside the main bundle.
 */
export async function exportStoryboardPdf(options: ExportStoryboardOptions): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const { sets, cover, roomName, includeAppendix, primaryScreen } = options;

  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const ground = rgb(...GROUND);
  const ink = rgb(...INK);
  const muted = rgb(0.62, 0.66, 0.72);

  const title = toWinAnsi(cover.eventName.trim() || roomName.trim() || 'Storyboard');
  pdf.setTitle(title);
  pdf.setCreator('StageSight 3D');
  pdf.setProducer('StageSight 3D');

  // Shrinks text until it fits the width, so long names never run off the page
  const fit = (text: string, font: typeof bold, size: number, maxWidth: number, minSize = 12) => {
    let s = size;
    while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 1;
    return s;
  };

  // — Cover —
  const coverPage = pdf.addPage([SLOT_WIDTH, SLOT_HEIGHT]);
  coverPage.drawRectangle({ x: 0, y: 0, width: SLOT_WIDTH, height: SLOT_HEIGHT, color: ground });
  coverPage.drawRectangle({ x: 64, y: 232, width: 56, height: 5, color: rgb(...ACCENT) });
  if (cover.logo) {
    const image = cover.logo.type === 'png' ? await pdf.embedPng(cover.logo.bytes) : await pdf.embedJpg(cover.logo.bytes);
    const scale = Math.min(220 / image.width, 90 / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    coverPage.drawImage(image, { x: 64, y: SLOT_HEIGHT - 48 - h, width: w, height: h });
  }
  const eventText = toWinAnsi(cover.eventName.trim() || 'Event storyboard');
  coverPage.drawText(eventText, {
    x: 64,
    y: 262,
    size: fit(eventText, bold, 52, SLOT_WIDTH - 128, 24),
    font: bold,
    color: ink,
  });
  const speaker = toWinAnsi(cover.speakerName.trim());
  if (speaker) coverPage.drawText(speaker, { x: 64, y: 196, size: fit(speaker, regular, 26, SLOT_WIDTH - 128), font: regular, color: ink });
  const dateText = toWinAnsi(formatCoverDate(cover.date));
  if (dateText) coverPage.drawText(dateText, { x: 64, y: speaker ? 164 : 196, size: 18, font: regular, color: muted });
  const agency = toWinAnsi(cover.agencyName.trim());
  const room = toWinAnsi(roomName.trim());
  if (room) coverPage.drawText(room, { x: 64, y: 78, size: 12, font: regular, color: muted });
  if (agency) coverPage.drawText(toWinAnsi(`Prepared by ${agency}`), { x: 64, y: 54, size: 12, font: regular, color: muted });

  // — Shot pages —
  const multipleSets = sets.length > 1;
  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedJpg>>>();
  for (const page of storyboardPages(sets)) {
    const size = pageSize(page.slots.length);
    const pdfPage = pdf.addPage([size.width, size.height]);
    pdfPage.drawRectangle({ x: 0, y: 0, width: size.width, height: size.height, color: ground });
    for (let i = 0; i < page.slots.length; i++) {
      const { frame, setLabel } = page.slots[i];
      const rect = size.slots[i];
      let image = embedded.get(frame.id);
      if (!image) {
        image = await pdf.embedJpg(await frame.blob.arrayBuffer());
        embedded.set(frame.id, image);
      }
      pdfPage.drawImage(image, rect);

      if (i === 0) {
        const name = toWinAnsi(page.shotName);
        const textSize = 16;
        const textWidth = bold.widthOfTextAtSize(name, textSize);
        const bandW = Math.min(textWidth, SLOT_WIDTH - 64) + 28;
        pdfPage.drawRectangle({ x: rect.x + 16, y: rect.y + rect.height - 16 - 32, width: bandW, height: 32, color: ground, opacity: 0.72 });
        pdfPage.drawText(name, {
          x: rect.x + 30,
          y: rect.y + rect.height - 16 - 21,
          size: fit(name, bold, textSize, SLOT_WIDTH - 92, 9),
          font: bold,
          color: ink,
        });
      }
      if (multipleSets) {
        const label = toWinAnsi(setLabel);
        const textSize = 12;
        const w = Math.min(bold.widthOfTextAtSize(label, textSize), SLOT_WIDTH - 64) + 20;
        pdfPage.drawRectangle({ x: rect.x + 16, y: rect.y + 16, width: w, height: 24, color: ground, opacity: 0.72 });
        pdfPage.drawText(label, { x: rect.x + 26, y: rect.y + 24, size: fit(label, bold, textSize, SLOT_WIDTH - 84, 8), font: bold, color: ink });
      }
    }
  }

  // — Technical appendix —
  if (includeAppendix) {
    const rows = appendixRows(sets.flatMap((s) => s.frames), primaryScreen);
    const page = pdf.addPage([SLOT_WIDTH, SLOT_HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: SLOT_WIDTH, height: SLOT_HEIGHT, color: ground });
    page.drawText('Technical appendix', { x: 64, y: SLOT_HEIGHT - 80, size: 28, font: bold, color: ink });
    const cols = [64, 480, 620, 760];
    const headY = SLOT_HEIGHT - 128;
    ['Shot', 'Distance (m)', 'D/H', 'Off-axis (°)'].forEach((h, i) =>
      page.drawText(toWinAnsi(h), { x: cols[i], y: headY, size: 11, font: bold, color: muted }),
    );
    page.drawLine({ start: { x: 64, y: headY - 8 }, end: { x: SLOT_WIDTH - 64, y: headY - 8 }, thickness: 0.75, color: muted });
    const rowHeight = Math.min(26, (headY - 40 - 40) / Math.max(rows.length, 1));
    rows.forEach((row, r) => {
      const y = headY - 30 - r * rowHeight;
      if (y < 36) return;
      const cells = [row.shot, row.distance.toFixed(1), row.dhRatio.toFixed(2), row.offAxis.toFixed(1)].map(toWinAnsi);
      cells.forEach((c, i) =>
        page.drawText(c, { x: cols[i], y, size: i === 0 ? fit(c, regular, 13, 390, 8) : 13, font: regular, color: ink }),
      );
    });
  }

  return new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
}
