// Minimal RFC 4180 CSV: comma-separated, fields with comma, quote or newline are quoted.
import fs from 'node:fs';

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// -> { header: [...], records: [{col: value}] }
export function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const records = rows.filter((r) => r.some((v) => v !== '')).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  return { header, records };
}

const quote = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function writeCsv(file, header, records) {
  const lines = [header.join(','), ...records.map((r) => header.map((h) => quote(r[h])).join(','))];
  fs.writeFileSync(file, lines.join('\n') + '\n');
}
