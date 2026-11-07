import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PAGE_SIZES, normalizeLayout } from "./layout";

const hexToRgb = (hex = "#000000") => {
  const value = parseInt(hex.replace("#", ""), 16) || 0;
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

const getValue = (path, data) => path.split(".").reduce((acc, key) => acc?.[key], data);

const resolveText = (element, data, values) => {
  switch (element.type) {
    case "texte":
      return element.text ?? "";
    case "variable":
    case "signature":
      return String(getValue(element.source ?? "", data) ?? "");
    case "saisie":
      return String(values[element.key] ?? "");
    default:
      return "";
  }
};

const wrapLines = (text, font, size, maxWidth) => {
  const lines = [];

  text.split("\n").forEach((paragraph) => {
    let line = "";
    paragraph.split(" ").forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    lines.push(line);
  });

  return lines;
};

const drawTextBlock = (page, element, text, fonts, pageHeight) => {
  const font = element.bold ? fonts.bold : fonts.regular;
  const color = hexToRgb(element.color);
  const lineHeight = element.fontSize * 1.25;
  const lines = wrapLines(text, font, element.fontSize, element.width);

  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, element.fontSize);
    let offset = 0;
    if (element.align === "center") offset = (element.width - lineWidth) / 2;
    if (element.align === "right") offset = element.width - lineWidth;

    page.drawText(line, {
      x: element.x + offset,
      y: pageHeight - element.y - element.fontSize - index * lineHeight,
      size: element.fontSize,
      font,
      color,
    });
  });
};

const drawTable = (page, element, rows, fonts, pageHeight) => {
  const columns = element.columns ?? [];
  if (columns.length === 0) return;

  const color = hexToRgb(element.color);
  const columnWidth = element.width / columns.length;
  const rowHeight = element.fontSize * 1.8;
  const padding = 4;
  const baselineOffset = element.fontSize + (rowHeight - element.fontSize) / 2 - element.fontSize * 0.2;

  const drawRow = (cells, font, top) => {
    cells.forEach((cell, index) => {
      page.drawText(String(cell ?? ""), {
        x: element.x + index * columnWidth + padding,
        y: pageHeight - top - baselineOffset,
        size: element.fontSize,
        font,
        color,
      });
    });
    page.drawLine({
      start: { x: element.x, y: pageHeight - top - rowHeight },
      end: { x: element.x + element.width, y: pageHeight - top - rowHeight },
      thickness: 0.4,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  let top = element.y;
  drawRow(columns.map((column) => column.label), fonts.bold, top);
  top += rowHeight;

  rows.forEach((row) => {
    drawRow(columns.map((column) => row?.[column.key]), fonts.regular, top);
    top += rowHeight;
  });
};

const drawImage = async (pdf, page, element, images, embeddedCache, pageHeight) => {
  if (!element.pdf_image_id) {
    throw new Error("Un élément logo n'a pas de logo sélectionné.");
  }

  const source = images[element.pdf_image_id];
  if (!source) {
    throw new Error(`Logo introuvable (identifiant ${element.pdf_image_id}).`);
  }

  let embedded = embeddedCache.get(element.pdf_image_id);
  if (!embedded) {
    embedded = source.mime === "image/png"
      ? await pdf.embedPng(source.bytes)
      : await pdf.embedJpg(source.bytes);
    embeddedCache.set(element.pdf_image_id, embedded);
  }

  const scale = Math.min(element.width / embedded.width, element.height / embedded.height);
  const width = embedded.width * scale;
  const height = embedded.height * scale;

  page.drawImage(embedded, {
    x: element.x + (element.width - width) / 2,
    y: pageHeight - element.y - element.height + (element.height - height) / 2,
    width,
    height,
  });
};

/**
 * Génère un PDF à partir d'un layout de modèle.
 * @param {object} options
 * @param {{format?: string, elements: object[]}} options.layout
 * @param {object} options.data données automatiques (patient, médecin, rendez-vous)
 * @param {object} options.values saisies (clé => valeur, tableaux => tableau de lignes)
 * @param {object} options.images id logo => { bytes: ArrayBuffer, mime: string }
 * @returns {Promise<Uint8Array>}
 */
export async function generatePdf({ layout, data = {}, values = {}, images = {} }) {
  const pdf = await PDFDocument.create();
  const size = PAGE_SIZES[layout.format] ?? PAGE_SIZES.A4;
  const page = pdf.addPage([size.width, size.height]);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const signatureFonts = {
    regular: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
  };
  const embeddedCache = new Map();

  for (const element of normalizeLayout(layout).elements) {
    if (element.type === "image") {
      await drawImage(pdf, page, element, images, embeddedCache, size.height);
    } else if (element.type === "tableau") {
      drawTable(page, element, values[element.key] ?? [], fonts, size.height);
    } else {
      const text = resolveText(element, data, values);
      drawTextBlock(page, element, text, element.type === "signature" ? signatureFonts : fonts, size.height);
    }
  }

  return pdf.save();
}
