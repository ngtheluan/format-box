const D = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(n: number, isLead: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (h > 0 || !isLead) {
    parts.push(`${D[h]} trăm`);
  }
  if (t === 0) {
    if (u > 0) {
      if (h > 0 || !isLead) parts.push("lẻ");
      parts.push(D[u]);
    }
  } else if (t === 1) {
    parts.push("mười");
    if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(D[u]);
  } else {
    parts.push(`${D[t]} mươi`);
    if (u === 1) parts.push("mốt");
    else if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(D[u]);
  }
  return parts.join(" ").trim();
}

const scales = ["", "nghìn", "triệu", "tỷ"];

export function vndInWords(amount: number): string {
  if (!isFinite(amount)) return "";
  const n = Math.max(0, Math.floor(Math.abs(amount)));
  if (n === 0) return "không đồng";

  const triples: number[] = [];
  let rest = n;
  while (rest > 0) {
    triples.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const out: string[] = [];
  for (let i = triples.length - 1; i >= 0; i--) {
    const t = triples[i];
    if (t === 0) continue;
    const isLead = i === triples.length - 1;
    const seg = readTriple(t, isLead);
    out.push(seg + (scales[i] ? " " + scales[i] : ""));
  }
  const s = out.join(" ").trim() + " đồng";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
