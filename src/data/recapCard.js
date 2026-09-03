// Renders a finished game's recap as a single shareable PNG — the "Ledger"
// look (navy cover, brass rule, cream ink) drawn straight onto a <canvas>
// so it works as a plain image outside the app (a group chat, a photo
// album) rather than a screenshot of the UI. Canvas text/positioning is
// unforgiving compared to CSS, so this file leans on a couple of small
// helpers (wrapText, loadImage) rather than trying to be a general layout
// engine — it only ever draws this one card shape.

const SIZE = 1080;
const GOLD = "#c9ab68";
const GOLD_DEEP = "#ab8a3f";
const CREAM = "#eef1f6";
const MUTED = "#90a0b2";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Breaks `text` into lines no wider than maxWidth and draws them centered
// on x, starting at y. Returns the y position just after the last line.
function drawWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

async function drawAvatar(ctx, { photo, color, avatar }, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  if (photo) {
    try {
      const img = await loadImage(photo);
      ctx.clip();
      // Cover-fit into the circle (crop the longer side).
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 8;
      ctx.strokeStyle = GOLD_DEEP;
      ctx.stroke();
      return;
    } catch {
      // Fall through to the color/emoji fallback below.
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
    }
  }
  ctx.fillStyle = color || "#2c3e52";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = GOLD_DEEP;
  ctx.stroke();
  ctx.restore();
  if (avatar) {
    ctx.save();
    ctx.font = `${Math.round(r * 1.1)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(avatar, cx, cy + r * 0.05);
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = `${Math.round(r * 0.9)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏆", cx, cy + r * 0.05);
    ctx.restore();
  }
}

// standings: [{ id, name, score, isWinner, color, avatar, photo }],
// pre-sorted best-first by the caller. winner: the first standings entry
// (or the merged label for co-winners) — kept separate so the spotlight
// can show "Riley & Doug" while the list below still shows everyone.
export async function generateRecapCardBlob({
  gameName,
  icon,
  dateLabel,
  winnerLabel,
  winnerAvatarSource,
  standings,
  standoutStat,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Make sure the Ledger fonts are actually loaded before any fillText —
  // canvas silently falls back to a system font otherwise, with no error.
  try {
    await Promise.all([
      document.fonts.load('800 64px "Bitter"'),
      document.fonts.load('700 40px "Bitter"'),
      document.fonts.load('400 34px "Bitter"'),
      document.fonts.load('700 30px "Courier Prime"'),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts API unsupported or a face failed to load — canvas just uses
    // its fallback stack instead, still perfectly readable.
  }

  // --- Background ------------------------------------------------------
  const bgGrad = ctx.createRadialGradient(SIZE / 2, SIZE * 0.32, 80, SIZE / 2, SIZE * 0.32, SIZE * 0.9);
  bgGrad.addColorStop(0, "#223247");
  bgGrad.addColorStop(1, "#10161f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // --- Header -----------------------------------------------------------
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = '700 26px "Courier Prime", monospace';
  ctx.fillText("S C O R E C A R D", SIZE / 2, 84);
  ctx.strokeStyle = "rgba(201,171,104,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2 - 140, 108);
  ctx.lineTo(SIZE / 2 + 140, 108);
  ctx.stroke();

  // --- Winner spotlight ---------------------------------------------------
  const circleY = 300;
  const circleR = 120;
  await drawAvatar(ctx, winnerAvatarSource, SIZE / 2, circleY, circleR);

  ctx.fillStyle = CREAM;
  let nameSize = 68;
  ctx.font = `800 ${nameSize}px "Bitter", Georgia, serif`;
  while (ctx.measureText(winnerLabel).width > SIZE - 120 && nameSize > 36) {
    nameSize -= 4;
    ctx.font = `800 ${nameSize}px "Bitter", Georgia, serif`;
  }
  ctx.fillText(winnerLabel, SIZE / 2, circleY + circleR + 92);

  ctx.fillStyle = GOLD;
  ctx.font = '700 30px "Courier Prime", monospace';
  ctx.fillText(standings.length > 1 && winnerLabel.includes("&") ? "W I N !" : "W I N S !", SIZE / 2, circleY + circleR + 134);

  ctx.fillStyle = MUTED;
  ctx.font = '400 34px "Bitter", Georgia, serif';
  ctx.fillText(`${icon || "🃏"}  ${gameName}`, SIZE / 2, circleY + circleR + 182);

  // --- Ledger scoreboard panel ------------------------------------------
  const panelX = 90;
  const panelY = 700;
  const panelW = SIZE - panelX * 2;
  const rowH = 56;
  const visibleRows = Math.min(standings.length, 6);
  const panelH = 40 + visibleRows * rowH + 24;

  ctx.fillStyle = "rgba(238,241,246,0.06)";
  ctx.strokeStyle = "rgba(201,171,104,0.35)";
  ctx.lineWidth = 2;
  const radius = 20;
  ctx.beginPath();
  ctx.moveTo(panelX + radius, panelY);
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, radius);
  ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, radius);
  ctx.arcTo(panelX, panelY + panelH, panelX, panelY, radius);
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, radius);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  standings.slice(0, visibleRows).forEach((p, i) => {
    const rowY = panelY + 40 + i * rowH + rowH / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = p.isWinner ? GOLD : CREAM;
    // Small dot.
    ctx.beginPath();
    ctx.arc(panelX + 34, rowY, 10, 0, Math.PI * 2);
    ctx.fillStyle = p.color || "rgba(238,241,246,0.25)";
    ctx.fill();

    ctx.fillStyle = p.isWinner ? GOLD : CREAM;
    ctx.font = `${p.isWinner ? "700" : "400"} 34px "Bitter", Georgia, serif`;
    ctx.fillText(p.name, panelX + 64, rowY + 12);

    ctx.textAlign = "right";
    ctx.font = `700 36px "Courier Prime", monospace`;
    ctx.fillText(String(p.score), panelX + panelW - 30, rowY + 12);
    ctx.textAlign = "left";
  });
  if (standings.length > visibleRows) {
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = '400 26px "Bitter", Georgia, serif';
    ctx.fillText(`+ ${standings.length - visibleRows} more`, SIZE / 2, panelY + panelH - 10);
  }

  // --- Standout stat -------------------------------------------------------
  if (standoutStat) {
    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    ctx.font = '400 32px "Bitter", Georgia, serif';
    drawWrapped(ctx, standoutStat, SIZE / 2, panelY + panelH + 70, SIZE - 160, 40);
  }

  // --- Footer -------------------------------------------------------------
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = '400 26px "Bitter", Georgia, serif';
  ctx.fillText(dateLabel, SIZE / 2, SIZE - 56);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Shares the given image blob via the native share sheet where supported
// (mobile — drops straight into Messages/a group chat), otherwise falls
// back to triggering a browser download (desktop, or any browser without
// the Web Share API's file support).
export async function shareOrDownloadImage(blob, filename) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      // Any other share failure (e.g. no share target chosen) — fall
      // through to a plain download so the person still gets the image.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
