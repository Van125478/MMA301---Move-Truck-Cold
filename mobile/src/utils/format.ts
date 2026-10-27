export function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

export function formatDate(value: string | null): string {
  if (!value) return "Chưa có ngày";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatWindow(date: string | null, from: string | null, to: string | null): string {
  const day = formatDate(date);
  if (from && to) return `${day} · ${from}–${to}`;
  return day;
}

/** One-line pickup window for list/landing cards; null when no pickup date. */
export function formatPickupCard(date: string | null, from: string | null, to: string | null): string | null {
  if (!date?.trim()) return null;
  return `Bốc hàng: ${formatWindow(date, from, to)}`;
}

/** Giờ bốc trên card sàn (vd. 30/10 · 06:00–09:00, không năm để vừa một dòng). */
export function formatPickupShort(date: string | null, from: string | null, to: string | null): string | null {
  if (!date?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const day = match ? `${match[3]}/${match[2]}` : formatDate(date);
  if (from && to) return `${day} · ${from}–${to}`;
  if (from) return `${day} · ${from}`;
  return day;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
