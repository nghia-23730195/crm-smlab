/**
 * Smart Title Case formatter for Project and Customer names in Vietnamese
 * Converts harsh ALL-CAPS strings into clean, elegant Title Case while preserving acronyms (AI, IoT, BOM, THPT, TPHCM, etc.)
 */
export function formatProjectTitle(str: string | null | undefined): string {
  if (!str) return "";

  const trimmed = str.trim();
  const upperCount = trimmed.replace(
    /[^A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g,
    "",
  ).length;
  const alphaCount = trimmed.replace(/[^a-zA-ZÀ-ỹ]/g, "").length;

  // If mostly uppercase (> 75%), normalize to Title Case
  if (alphaCount > 4 && upperCount / alphaCount > 0.75) {
    const acronyms = new Set([
      "AI",
      "IOT",
      "BOM",
      "CRM",
      "THPT",
      "THCS",
      "TPHCM",
      "HS",
      "SM-LAB",
      "SMLAB",
      "CNC",
      "PLC",
      "VND",
      "VNĐ",
      "KHKT",
      "STEM",
    ]);

    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) => {
        if (!word) return "";
        const cleanWord = word.replace(/[^a-zA-Z0-9À-ỹ]/g, "").toUpperCase();
        if (acronyms.has(cleanWord)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  return trimmed;
}

export function formatCurrency(value: unknown): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "Chưa thiết lập";
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return "Chưa thiết lập";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(d);
}
