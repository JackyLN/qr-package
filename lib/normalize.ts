const ASCII_ALNUM_MAX_LENGTH = 25;
const TRANSFER_NOTE_MAX_LENGTH = 50;

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

function normalizeAsciiAlnumCore(input: string): string {
  const cleaned = stripNonAscii(stripVietnameseDiacritics(input))
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, ASCII_ALNUM_MAX_LENGTH);

  return cleaned;
}

function normalizeTransferNoteCore(input: string): string {
  const cleaned = stripNonAscii(stripVietnameseDiacritics(input))
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TRANSFER_NOTE_MAX_LENGTH);

  return cleaned;
}

export function normalizeAsciiAlnum(input: string, fallback = ""): string {
  const cleaned = normalizeAsciiAlnumCore(input);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return normalizeAsciiAlnumCore(fallback);
}

export function normalizeTransferNote(input: string, fallback = "LIXI"): string {
  const cleaned = normalizeTransferNoteCore(input);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return normalizeTransferNoteCore(fallback);
}
