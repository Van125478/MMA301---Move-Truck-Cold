export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

/** pickupDate/deliveryDate from the server are plain "YYYY-MM-DD" strings, not ISO datetimes. */
export function formatCalendarDate(value: string | null): string {
  if (!value) return "Chưa có ngày";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function formatDateRange(date: string | null, from: string | null, to: string | null): string {
  const day = formatCalendarDate(date);
  if (!from && !to) return day;
  if (from && to) return `${day}, ${from}–${to}`;
  return `${day}, ${from ?? to}`;
}
