import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function stripMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/^#+\s*/, "")
    .replace(/^-{3,}$/, "")
    .trim();
}

type PdfLine = { size: number; text: string; gap: number };

function markdownToLines(markdown: string): PdfLine[] {
  const out: PdfLine[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      out.push({ size: 10, text: " ", gap: 6 });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push({ size: 10, text: " ".repeat(70), gap: 8 });
      continue;
    }
    if (line.startsWith("# ")) {
      wrap(stripMd(line), 42).forEach((t, i) => out.push({ size: 18, text: t, gap: i === 0 ? 18 : 4 }));
      continue;
    }
    if (line.startsWith("## ")) {
      wrap(stripMd(line), 52).forEach((t, i) => out.push({ size: 14, text: t, gap: i === 0 ? 16 : 3 }));
      continue;
    }
    if (line.startsWith("### ")) {
      wrap(stripMd(line), 58).forEach((t, i) => out.push({ size: 12, text: t, gap: i === 0 ? 12 : 3 }));
      continue;
    }
    if (/^\|.+\|$/.test(line.trim())) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      wrap(cells.join("  ·  "), 92).forEach((t) => out.push({ size: 9, text: t, gap: 11 }));
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      wrap(`• ${stripMd(bullet[1])}`, 90).forEach((t, i) => out.push({ size: 10, text: i ? `  ${t}` : t, gap: 12 }));
      continue;
    }
    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      wrap(`${numbered[1]}. ${stripMd(numbered[2])}`, 90).forEach((t, i) =>
        out.push({ size: 10, text: i ? `   ${t}` : t, gap: 12 }),
      );
      continue;
    }
    wrap(stripMd(line), 92).forEach((t) => out.push({ size: 10, text: t, gap: 12 }));
  }
  return out;
}

function paginate(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let y = 720;
  for (const line of lines) {
    const nextY = y - line.gap;
    if (nextY < 56) {
      pages.push(page);
      page = [];
      y = 720;
    }
    page.push(line);
    y -= line.gap;
  }
  if (page.length) pages.push(page);
  return pages;
}

function pageContent(lines: PdfLine[], pageIndex: number, pageCount: number) {
  const ops: string[] = [];
  let y = 736;
  for (const line of lines) {
    ops.push(`BT /F1 ${line.size} Tf 48 ${y} Td (${escapePdf(line.text)}) Tj ET`);
    y -= line.gap;
  }
  ops.push(`BT /F1 8 Tf 48 36 Td (${escapePdf(`Project Tracker User Manual  ·  ${pageIndex + 1} / ${pageCount}`)}) Tj ET`);
  return ops.join("\n");
}

function buildPdf(pages: PdfLine[][]) {
  const contentStreams = pages.map((p, i) => pageContent(p, i, pages.length));
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pages.map((_, i) => `${3 + i * 2} 0 R`);
  objects.push(`<< /Type /Pages /Kids [${pageIds.join(" ")}] /Count ${pages.length} >>`);
  contentStreams.forEach((stream, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefCount = offsets.length - 1;
  const startxref = Buffer.byteLength(body);
  body += `xref\n0 ${xrefCount + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= xrefCount; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${xrefCount + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body);
}

function main() {
  const source = resolve(process.cwd(), "docs/USER-MANUAL.md");
  const dest = resolve(process.cwd(), "docs/user-manual.pdf");
  const markdown = readFileSync(source, "utf8");
  const pdf = buildPdf(paginate(markdownToLines(markdown)));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, pdf);
  console.log(`Wrote ${dest} (${pdf.length} bytes)`);
}

main();
