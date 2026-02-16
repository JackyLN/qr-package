function stripVietnameseDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function stripNonAscii(input: string): string {
  return input.replace(/[^\x20-\x7E]/g, "");
}

export function normalizeTransferNote(input: string, fallback = "LIXI"): string {
  const cleaned = stripNonAscii(stripVietnameseDiacritics(input))
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 25);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return stripNonAscii(stripVietnameseDiacritics(fallback))
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 25);
}
