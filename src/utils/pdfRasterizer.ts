import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { drawStageSightMark } from './testPatternGenerator';

// Initialize PDF.js worker using Vite's ?url bundler import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Rasterizes an uploaded PDF ArrayBuffer into an array of high-resolution 4096px wide HTML5 Canvases.
 */
export async function rasterizePdf(
  data: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<HTMLCanvasElement[]> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    // Scale to crisp 4096px width
    const targetWidth = 4096;
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // White/clean background for PDF rendering
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderContext: any = {
        canvasContext: ctx,
        viewport,
      };
      await page.render(renderContext).promise;
      canvases.push(canvas);
    }

    if (onProgress) {
      onProgress(pageNum, numPages);
    }
  }

  return canvases;
}

/**
 * Rasterizes an image file (PNG/JPG) to a 4096px wide offscreen canvas.
 */
export async function rasterizeImageFile(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const targetWidth = 4096;
      const aspect = img.width / Math.max(1, img.height);
      const targetHeight = Math.round(targetWidth / aspect);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }
      resolve(canvas);
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Generates the 5-slide 32:9 Executive Demo Deck (4096 × 1152 px per slide).
 */
export function generateSampleExecutiveDeck(): HTMLCanvasElement[] {
  const W = 4096;
  const H = 1152; // 32:9 aspect ratio

  // Helper to create a base canvas with 32:9 dark executive theme
  const createBaseCanvas = (slideNumber: number, title: string, subtitle?: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Rich dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(0.5, '#0d1322');
    bgGradient.addColorStop(1, '#080a10');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Subtle ambient glow accent
    const glow = ctx.createRadialGradient(W * 0.8, 0, 100, W * 0.8, 0, 1400);
    glow.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Top Header Banner
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GLOBAL BIOTECH LEADERSHIP FORUM 2026', 120, 80);

    // Live Date & Confidentiality Tag
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('CONFIDENTIAL // EXECUTIVE BOARD PREVIEW', W - 120, 80);

    // Slide Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 120, 170);

    if (subtitle) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '500 28px sans-serif';
      ctx.fillText(subtitle, 120, 220);
    }

    // Horizontal Rule
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 245);
    ctx.lineTo(W - 120, 245);
    ctx.stroke();

    // Footer Bar with StageSight 3D mark
    drawStageSightMark(ctx, 136, H - 67, 30);
    ctx.fillStyle = '#64748b';
    ctx.font = '20px monospace';
    ctx.fillText(`SLIDE 0${slideNumber} OF 05 // ULTRA-WIDE 32:9 STAGESIGHT MASTER`, 164, H - 60);

    ctx.textAlign = 'right';
    ctx.fillText('AVIXA DISCAS COMPLIANT TYPOGRAPHY // MIN TEXT 24PT', W - 120, H - 60);

    return { canvas, ctx };
  };

  // ================= SLIDE 1: KEYNOTE VISION & HIGHLIGHTS =================
  const slide1 = (() => {
    const { canvas, ctx } = createBaseCanvas(
      1,
      'ACCELERATING NEXT-GEN THERAPEUTIC INNOVATION',
      'Unified 2026 Clinical Roadmap & AI-Driven Target Discovery Architecture'
    );

    // 4 Keynote Metric Blocks
    const metrics = [
      { num: '142', unit: 'ACTIVE TRIALS', label: 'Multi-center global clinical programs across Phase I-III', color: '#06b6d4' },
      { num: '$4.2B', unit: 'CAPITAL INJECTED', label: 'Cumulative institutional R&D capital committed to date', color: '#38bdf8' },
      { num: '18', unit: 'PHASE-III ASSETS', label: 'Breakthrough designation therapies awaiting FDA filing', color: '#10b981' },
      { num: '99.4%', unit: 'REPRODUCIBILITY', label: 'Machine-learning guided computational target validation', color: '#f59e0b' },
    ];

    const cardY = 320;
    const cardH = 650;
    const cardW = (W - 240 - 3 * 40) / 4;

    metrics.forEach((m, idx) => {
      const cardX = 120 + idx * (cardW + 40);

      // Card background
      ctx.fillStyle = '#111827';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Top accent bar
      ctx.fillStyle = m.color;
      ctx.fillRect(cardX, cardY, cardW, 8);

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 88px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.num, cardX + 40, cardY + 140);

      // Unit
      ctx.fillStyle = m.color;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(m.unit, cardX + 40, cardY + 200);

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + 240);
      ctx.lineTo(cardX + cardW - 40, cardY + 240);
      ctx.stroke();

      // Description text (32pt)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '28px sans-serif';
      const words = m.label.split(' ');
      let line = '';
      let textY = cardY + 310;
      for (const w of words) {
        const testLine = line + w + ' ';
        if (ctx.measureText(testLine).width > cardW - 80) {
          ctx.fillText(line, cardX + 40, textY);
          line = w + ' ';
          textY += 44;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, cardX + 40, textY);
    });

    return canvas;
  })();

  // ================= SLIDE 2: CLINICAL DATA & TRIAL OUTCOMES TABLE =================
  const slide2 = (() => {
    const { canvas, ctx } = createBaseCanvas(
      2,
      'PHASE-III ONCOLOGY CLINICAL OUTCOMES (N=4,820)',
      'Double-Blind Global Primary Endpoint Comparative Efficacy (Protocol BTX-408)'
    );

    // Multi-column clinical table
    const tableX = 120;
    const tableY = 300;
    const tableW = W - 240;
    const rowH = 95;

    const headers = [
      { title: 'TRIAL COHORT', width: 0.22, align: 'left' },
      { title: 'PATIENTS (N)', width: 0.12, align: 'center' },
      { title: 'MEDIAN PFS', width: 0.16, align: 'center' },
      { title: 'HAZARD RATIO [95% CI]', width: 0.22, align: 'center' },
      { title: 'P-VALUE', width: 0.14, align: 'center' },
      { title: 'STATUS', width: 0.14, align: 'center' },
    ];

    // Header row
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tableX, tableY, tableW, rowH);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px monospace';

    let curColX = tableX;
    headers.forEach((h) => {
      const colWidth = tableW * h.width;
      ctx.textAlign = h.align as CanvasTextAlign;
      const textX = h.align === 'center' ? curColX + colWidth / 2 : curColX + 30;
      ctx.fillText(h.title, textX, tableY + 58);
      curColX += colWidth;
    });

    const rows = [
      { cohort: 'Cohort A (BTX-Monotherapy)', n: '1,420', pfs: '18.4 Months', hr: '0.42 [0.35 - 0.51]', p: 'p < 0.0001', status: 'SUPERIOR', color: '#10b981' },
      { cohort: 'Cohort B (BTX + Checkpoint Combo)', n: '1,650', pfs: '24.8 Months', hr: '0.31 [0.24 - 0.39]', p: 'p < 0.0001', status: 'SUPERIOR', color: '#10b981' },
      { cohort: 'Cohort C (Standard of Care Control)', n: '1,200', pfs: '8.6 Months', hr: '1.00 [Reference]', p: 'Reference', status: 'BASELINE', color: '#64748b' },
      { cohort: 'Cohort D (High-Dose Escalation)', n: '550', pfs: '22.1 Months', hr: '0.36 [0.28 - 0.46]', p: 'p = 0.0002', status: 'SUPERIOR', color: '#10b981' },
    ];

    rows.forEach((r, idx) => {
      const rowY = tableY + (idx + 1) * rowH;
      ctx.fillStyle = idx % 2 === 0 ? '#0f172a' : '#141d33';
      ctx.fillRect(tableX, rowY, tableW, rowH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + rowH);
      ctx.lineTo(tableX + tableW, rowY + rowH);
      ctx.stroke();

      let cellX = tableX;
      // Cohort
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(r.cohort, cellX + 30, rowY + 58);
      cellX += tableW * headers[0].width;

      // N
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '26px monospace';
      ctx.fillText(r.n, cellX + (tableW * headers[1].width) / 2, rowY + 58);
      cellX += tableW * headers[1].width;

      // PFS
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(r.pfs, cellX + (tableW * headers[2].width) / 2, rowY + 58);
      cellX += tableW * headers[2].width;

      // Hazard Ratio
      ctx.fillStyle = '#ffffff';
      ctx.font = '26px monospace';
      ctx.fillText(r.hr, cellX + (tableW * headers[3].width) / 2, rowY + 58);
      cellX += tableW * headers[3].width;

      // P-Value
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(r.p, cellX + (tableW * headers[4].width) / 2, rowY + 58);
      cellX += tableW * headers[4].width;

      // Status Badge
      const statusBadgeW = 140;
      const statusBadgeH = 40;
      const badgeCenterX = cellX + (tableW * headers[5].width) / 2;
      ctx.fillStyle = r.color;
      ctx.fillRect(badgeCenterX - statusBadgeW / 2, rowY + 28, statusBadgeW, statusBadgeH);
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(r.status, badgeCenterX, rowY + 55);
    });

    // 18pt Legibility Threshold Footnote
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '20px sans-serif';
    ctx.fillText(
      '* Statistical significance determined via independent Central Review Blinded Radiologist Panel using RECIST 1.1 criteria. Hazard ratios calculated using stratified Cox proportional-hazards model.',
      tableX + 10,
      tableY + 5 * rowH + 60
    );

    return canvas;
  })();

  // ================= SLIDE 3: 2026–2030 STRATEGIC PIPELINE ROADMAP =================
  const slide3 = (() => {
    const { canvas, ctx } = createBaseCanvas(
      3,
      '2026–2030 ENTERPRISE PIPELINE & COMMERCIAL HORIZON',
      'Target Discovery, Regulatory Submission Gates, and Global Expansion Cadence'
    );

    const phases = [
      {
        quarter: 'PHASE 01: 2026 Q1-Q2',
        title: 'High-Throughput Screen',
        badge: 'COMPLETED',
        color: '#10b981',
        bullets: ['Automated 2.4M compound assay', 'Cryo-EM 1.8Å structure resolution', 'Pre-IND FDA scientific advice'],
      },
      {
        quarter: 'PHASE 02: 2026 Q3-Q4',
        title: 'IND Filing & Phase I Fast-Track',
        badge: 'ACTIVE FOCUS',
        color: '#06b6d4',
        bullets: ['First-in-human dose escalation (N=45)', 'Target biomarker validation', 'Safety review board clearance'],
      },
      {
        quarter: 'PHASE 03: 2027–2028',
        title: 'Pivotal Phase II/III Trials',
        badge: 'UPCOMING',
        color: '#3b82f6',
        bullets: ['Global multinational sites (60 centers)', 'Interim futility analysis gate', 'Commercial scale GMP manufacturing'],
      },
      {
        quarter: 'PHASE 04: 2029–2030',
        title: 'Commercial Launch & Scale',
        badge: 'STRATEGIC TARGET',
        color: '#f59e0b',
        bullets: ['FDA BLA & EMA approval filing', 'Exclusive distributor partnership', 'Expected peak sales: $3.2B annually'],
      },
    ];

    const cardY = 320;
    const cardH = 650;
    const cardW = (W - 240 - 3 * 36) / 4;

    phases.forEach((p, idx) => {
      const cardX = 120 + idx * (cardW + 36);

      // Card container
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = idx === 1 ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = idx === 1 ? 3 : 1.5;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Top Tag
      ctx.fillStyle = p.color;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.quarter, cardX + 36, cardY + 60);

      // Status Pill
      ctx.fillStyle = p.color;
      ctx.fillRect(cardX + cardW - 190, cardY + 38, 155, 34);
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.badge, cardX + cardW - 112, cardY + 61);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.title, cardX + 36, cardY + 140);

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 36, cardY + 180);
      ctx.lineTo(cardX + cardW - 36, cardY + 180);
      ctx.stroke();

      // Bullet Points
      let bulletY = cardY + 250;
      p.bullets.forEach((b) => {
        // Bullet circle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(cardX + 46, bulletY - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '26px sans-serif';
        ctx.fillText(b, cardX + 70, bulletY);
        bulletY += 80;
      });
    });

    return canvas;
  })();

  // ================= SLIDE 4: FINANCIAL KPIS & REVENUE =================
  const slide4 = (() => {
    const { canvas, ctx } = createBaseCanvas(
      4,
      'Q3 2026 FINANCIAL PERFORMANCE & REVENUE DIVERSIFICATION',
      'Strong Balance Sheet Stability with $1.48B Net Revenue (+34% Year-over-Year)'
    );

    // 4 Big KPI Blocks
    const kpis = [
      { stat: '$1.48B', sub: 'NET REVENUE', delta: '+34% YoY', color: '#10b981' },
      { stat: '78.4%', sub: 'GROSS MARGIN', delta: '+420 bps', color: '#06b6d4' },
      { stat: '$480M', sub: 'R&D INVESTMENT', delta: '32% of Rev', color: '#3b82f6' },
      { stat: '4.8x', sub: 'CAPITAL MULTIPLE', delta: 'Top Decile', color: '#f59e0b' },
    ];

    const kpiW = (W - 240 - 3 * 36) / 4;
    const kpiY = 310;
    const kpiH = 240;

    kpis.forEach((k, idx) => {
      const kX = 120 + idx * (kpiW + 36);

      ctx.fillStyle = '#111827';
      ctx.fillRect(kX, kpiY, kpiW, kpiH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(kX, kpiY, kpiW, kpiH);

      // Large Stat
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 76px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(k.stat, kX + 36, kpiY + 95);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(k.sub, kX + 36, kpiY + 155);

      // Delta Badge
      ctx.fillStyle = k.color;
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(k.delta, kX + kpiW - 36, kpiY + 155);
    });

    // Horizontal Bar Chart Section below
    const chartY = 610;
    const chartW = W - 240;
    const chartH = 360;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(120, chartY, chartW, chartH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(120, chartY, chartW, chartH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GLOBAL REVENUE BY THERAPEUTIC REGION (MILLIONS USD)', 160, chartY + 60);

    const bars = [
      { label: 'North America (US/CA)', amount: '$740M', pct: 0.74, color: '#06b6d4' },
      { label: 'Europe (EU/UK)', amount: '$420M', pct: 0.42, color: '#3b82f6' },
      { label: 'Asia-Pacific (JP/KR/AU)', amount: '$320M', pct: 0.32, color: '#10b981' },
    ];

    bars.forEach((b, idx) => {
      const barItemY = chartY + 115 + idx * 75;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(b.label, 160, barItemY + 28);

      const barStartX = 550;
      const maxBarWidth = chartW - 750;
      const barLen = maxBarWidth * b.pct;

      // Track background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barStartX, barItemY, maxBarWidth, 38);

      // Active Bar
      ctx.fillStyle = b.color;
      ctx.fillRect(barStartX, barItemY, barLen, 38);

      // Amount label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(b.amount, barStartX + barLen + 20, barItemY + 28);
    });

    return canvas;
  })();

  // ================= SLIDE 5: EXECUTIVE PANEL & SCIENTIFIC Q&A =================
  const slide5 = (() => {
    const { canvas, ctx } = createBaseCanvas(
      5,
      'EXECUTIVE PANEL DISCUSSION & SCIENTIFIC Q&A',
      'Open Forum with Scientific Advisory Board & Senior Leadership'
    );

    const panelists = [
      { name: 'Dr. Aris Thorne, MD, PhD', role: 'Chief Medical Officer', org: 'Former Head of Oncology at Memorial Sloan', mic: 'MIC 01' },
      { name: 'Dr. Elena Rostova, PhD', role: 'EVP Translational Research', org: 'Stanford Bioinformatics & AI Therapeutics Lab', mic: 'MIC 02' },
      { name: 'Marcus Sterling, MBA', role: 'Chief Financial Officer', org: 'Ex-Goldman Sachs Healthcare Investment Banking', mic: 'MIC 03' },
      { name: 'Dr. Priya Raman, PharmD', role: 'VP Regulatory Affairs & QA', org: '14+ Global Priority Review Submissions', mic: 'MIC 04' },
    ];

    const cardY = 320;
    const cardH = 500;
    const cardW = (W - 240 - 3 * 36) / 4;

    panelists.forEach((p, idx) => {
      const cardX = 120 + idx * (cardW + 36);

      ctx.fillStyle = '#111827';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Silhouette avatar circle
      const avatarX = cardX + cardW / 2;
      const avatarY = cardY + 110;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 65, 0, Math.PI * 2);
      ctx.fill();

      // Stylized head/shoulders icon inside avatar
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(avatarX, avatarY - 14, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(avatarX, avatarY + 44, 40, 24, 0, Math.PI, 0);
      ctx.fill();

      // Mic badge
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.mic, avatarX, avatarY + 105);

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(p.name, avatarX, cardY + 270);

      // Role
      ctx.fillStyle = '#06b6d4';
      ctx.font = '600 24px sans-serif';
      ctx.fillText(p.role, avatarX, cardY + 315);

      // Org
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.fillText(p.org, avatarX, cardY + 360);
    });

    // Audience interactive Q&A submission banner at bottom
    const qaBannerY = 860;
    const qaBannerW = W - 240;
    const qaBannerH = 120;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(120, qaBannerY, qaBannerW, qaBannerH);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, qaBannerY, qaBannerW, qaBannerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SUBMIT AUDIENCE QUESTIONS LIVE FROM YOUR PHONE', 160, qaBannerY + 54);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px monospace';
    ctx.fillText('Go to slido.com/STAGESIGHT or scan stage QR code &bull; Upvote top executive questions in real-time', 160, qaBannerY + 92);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('#STAGESIGHT-Q3', W - 160, qaBannerY + 70);

    return canvas;
  })();

  return [slide1, slide2, slide3, slide4, slide5];
}
