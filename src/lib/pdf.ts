function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textToPdf(title: string, lines: string[]) {
  const wrapped = [title, "", ...lines].flatMap((line) => {
    const chunks: string[] = [];
    const text = line || " ";
    for (let i = 0; i < text.length; i += 90) chunks.push(text.slice(i, i + 90));
    return chunks.length ? chunks : [" "];
  });
  const content = wrapped
    .map((line, idx) => `BT /F1 11 Tf 48 ${760 - idx * 14} Td (${escapePdf(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = offsets.length - 1;
  const startxref = Buffer.byteLength(body);
  body += `xref\n0 ${xref + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= xref; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${xref + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body);
}
