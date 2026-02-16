import { normalizeTransferNote } from "@/lib/normalize";

type VietQrInput = {
  bankBin: string;
  bankAccountNo: string;
  amountVnd: number;
  transferNote: string;
};

type Tlv = {
  id: string;
  value: string;
};

function isAscii(value: string): boolean {
  return /^[\x00-\x7F]*$/.test(value);
}

function toAsciiAlnum(input: string): string {
  return normalizeTransferNote(input, "");
}

function encodeTlv(id: string, value: string): string {
  const length = Buffer.byteLength(value, "utf8").toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

function encodeTlvList(fields: Tlv[]): string {
  return fields.map((field) => encodeTlv(field.id, field.value)).join("");
}

export function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildVietQrPayload(input: VietQrInput): string {
  const bankBin = input.bankBin.replace(/\D/g, "");
  const bankAccountNo = toAsciiAlnum(input.bankAccountNo);
  const amount = Math.trunc(input.amountVnd);
  const transferNote = normalizeTransferNote(input.transferNote, "LIXI");

  if (!bankBin || !bankAccountNo) {
    throw new Error("bankBin and bankAccountNo are required");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amountVnd must be a positive integer");
  }

  const receiverInfo = encodeTlvList([
    { id: "00", value: bankBin },
    { id: "01", value: bankAccountNo },
  ]);

  const merchantAccountInfo = encodeTlvList([
    { id: "00", value: "A000000727" },
    { id: "01", value: receiverInfo },
    { id: "02", value: "QRIBFTTA" },
  ]);

  const additionalData = encodeTlvList([{ id: "08", value: transferNote }]);

  const payloadNoCrc =
    encodeTlvList([
      { id: "00", value: "01" },
      { id: "01", value: "12" },
      { id: "38", value: merchantAccountInfo },
      { id: "53", value: "704" },
      { id: "54", value: amount.toString() },
      { id: "58", value: "VN" },
      { id: "62", value: additionalData },
    ]) + "6304";

  const crc = crc16CcittFalse(payloadNoCrc);
  const payload = `${payloadNoCrc}${crc}`;

  if (!isAscii(payload)) {
    throw new Error("VietQR payload must stay ASCII");
  }

  return payload;
}
