/**
 * Generates an ultra-high resolution (4096px wide) alignment test pattern
 * dynamically scaled to match the exact physical aspect ratio of the stage screen.
 */
export function generateTestPatternCanvas(screenWidth: number, screenHeight: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const targetWidth = 4096;
  const aspect = Math.max(0.5, screenWidth / Math.max(0.1, screenHeight));
  const targetHeight = Math.round(targetWidth / aspect);

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const W = targetWidth;
  const H = targetHeight;

  // Background - deep technical dark slate
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, W, H);

  // Subtle 64px background grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  const gridSize = 64;
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Major 256px grid lines with cyan tint
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Diagonal corner-to-corner X lines
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, H);
  ctx.moveTo(W, 0);
  ctx.lineTo(0, H);
  ctx.stroke();

  // 16:9 Center-Cut Pillar Lines (if ultra-wide)
  const standard16_9Aspect = 16 / 9;
  if (aspect > standard16_9Aspect) {
    const centerCutWidth = H * standard16_9Aspect;
    const centerCutLeft = (W - centerCutWidth) / 2;
    const centerCutRight = (W + centerCutWidth) / 2;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(centerCutLeft, 0);
    ctx.lineTo(centerCutLeft, H);
    ctx.moveTo(centerCutRight, 0);
    ctx.lineTo(centerCutRight, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 16:9 label tags
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('16:9 CENTER-CUT LEFT', centerCutLeft + 16, 48);
    ctx.fillText('16:9 CENTER-CUT RIGHT', centerCutRight - 320, 48);
  }

  // 5% Action Safe and 10% Title Safe borders
  const safe5X = W * 0.05;
  const safe5Y = H * 0.05;
  const safe10X = W * 0.10;
  const safe10Y = H * 0.10;

  // 5% Action Safe (Cyan)
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 3;
  ctx.strokeRect(safe5X, safe5Y, W - safe5X * 2, H - safe5Y * 2);
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('95% ACTION SAFE BOUNDARY', safe5X + 16, safe5Y + 32);

  // 10% Title Safe (Amber dashed)
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(safe10X, safe10Y, W - safe10X * 2, H - safe10Y * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('90% TITLE SAFE BOUNDARY', safe10X + 16, safe10Y + 32);

  // Center Crosshair and Geometry Circle Check
  const cx = W / 2;
  const cy = H / 2;
  const circleRadius = Math.min(H * 0.35, 450);

  // Perfect circle to inspect pixel aspect distortion
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary inner circle
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, circleRadius * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - circleRadius - 80, cy);
  ctx.lineTo(cx + circleRadius + 80, cy);
  ctx.moveTo(cx, cy - circleRadius - 80);
  ctx.lineTo(cx, cy + circleRadius + 80);
  ctx.stroke();

  // Header banner info
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(W * 0.25, 60, W * 0.5, 90);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.25, 60, W * 0.5, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  const ratioLabel = `${(Math.round(aspect * 100) / 100)}:1 Aspect Ratio`;
  ctx.fillText(`STAGESIGHT 3D — ULTRA-WIDE CALIBRATION PATTERN`, cx, 105);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '24px monospace';
  ctx.fillText(`${screenWidth.toFixed(1)}m × ${screenHeight.toFixed(1)}m Physical LED | ${W} × ${H} Native Buffer | ${ratioLabel}`, cx, 138);

  // Legibility Ladder on Left Side
  const ladderX = safe10X + 30;
  let ladderY = safe10Y + 80;

  ctx.textAlign = 'left';

  // 72pt
  ctx.font = 'bold 72px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DISCAS 72pt: Keynote Headline Typography', ladderX, ladderY);
  ladderY += 78;

  // 48pt
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('DISCAS 48pt: Section Subtitle & Metric Callout', ladderX, ladderY);
  ladderY += 56;

  // 36pt
  ctx.font = '600 36px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('DISCAS 36pt: Primary Presentation Body Text & Bullet Points', ladderX, ladderY);
  ladderY += 46;

  // 24pt
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('DISCAS 24pt: Secondary Footnote & Data Axis Label Legibility', ladderX, ladderY);
  ladderY += 36;

  // 18pt
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('DISCAS 18pt: Minimum Threshold Table Data (Requires High Acuity D/H < 4.0)', ladderX, ladderY);

  // SMPTE Color Bars along bottom
  const barY = H - safe10Y - 110;
  const barH = 50;
  const barColors = [
    '#ffffff', // White
    '#ffff00', // Yellow
    '#00ffff', // Cyan
    '#00ff00', // Green
    '#ff00ff', // Magenta
    '#ff0000', // Red
    '#0000ff', // Blue
    '#000000', // Black
  ];
  const barW = (W - safe10X * 2) / barColors.length;
  for (let i = 0; i < barColors.length; i++) {
    ctx.fillStyle = barColors[i];
    ctx.fillRect(safe10X + i * barW, barY, barW, barH);
  }

  // 10-Step Grayscale Ramp below Color Bars
  const grayY = barY + barH;
  const grayH = 30;
  for (let i = 0; i < 10; i++) {
    const val = Math.round((i / 9) * 255);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(safe10X + i * ((W - safe10X * 2) / 10), grayY, (W - safe10X * 2) / 10, grayH);
  }

  // Pixel Ruler Ticks along top and left
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';

  // Top ruler ticks every 200px
  for (let x = 0; x <= W; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, x % 1000 === 0 ? 24 : 12);
    ctx.stroke();
    if (x % 400 === 0 && x > 0 && x < W) {
      ctx.fillText(`${x}px`, x, 38);
    }
  }

  // Left ruler ticks every 100px
  ctx.textAlign = 'left';
  for (let y = 0; y <= H; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(y % 500 === 0 ? 24 : 12, y);
    ctx.stroke();
    if (y % 200 === 0 && y > 0 && y < H) {
      ctx.fillText(`${y}px`, 30, y + 5);
    }
  }

  return canvas;
}
