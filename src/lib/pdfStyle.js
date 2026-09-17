export const PAGE = Object.freeze({
  size: "A4",
  margins: { top: 96, bottom: 90, left: 72, right: 72 }
});

export const COLORS = Object.freeze({
  ink: "#131313",
  inkSoft: "#3b3b3a",
  inkMute: "#6b6a66",
  rule: "#d8d3c6",
  ruleStrong: "#b8b1a0",
  gold: "#b08a3c",
  goldDeep: "#8a6b2c",
  paper: "#faf8f4",
  gain: "#3b5b3c",
  loss: "#8a3d3d"
});

export const TYPE = Object.freeze({
  serif: "Times-Roman",
  serifBold: "Times-Bold",
  serifItalic: "Times-Italic",
  sans: "Helvetica",
  sansBold: "Helvetica-Bold",
  mono: "Courier"
});

export const SIZES = Object.freeze({
  title: 26,
  h2: 16,
  h3: 12.5,
  body: 10.5,
  small: 8.5,
  micro: 7.5
});

export function drawLetterhead(doc, { firmName, docTitle }) {
  const { left, top, right } = PAGE.margins;
  const pageWidth = doc.page.width;

  doc
    .font(TYPE.serif)
    .fontSize(SIZES.h2)
    .fillColor(COLORS.ink)
    .text(firmName, left, top - 60, { align: "left" });

  doc
    .font(TYPE.sans)
    .fontSize(SIZES.micro)
    .fillColor(COLORS.inkMute)
    .text("BVI INCUBATOR FUND", left, top - 60 + 20, {
      align: "left",
      characterSpacing: 1.4
    });

  if (docTitle) {
    doc
      .font(TYPE.sans)
      .fontSize(SIZES.micro)
      .fillColor(COLORS.inkMute)
      .text(docTitle.toUpperCase(), left, top - 60, {
        align: "right",
        characterSpacing: 1.4,
        width: pageWidth - left - right
      });
  }

  doc
    .strokeColor(COLORS.gold)
    .lineWidth(0.75)
    .moveTo(left, top - 26)
    .lineTo(pageWidth - right, top - 26)
    .stroke();
}

export function drawFooter(doc, { firmName, page, total, disclosureLine }) {
  const { left, right, bottom } = PAGE.margins;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const y = pageHeight - bottom + 30;

  doc
    .strokeColor(COLORS.rule)
    .lineWidth(0.5)
    .moveTo(left, y - 10)
    .lineTo(pageWidth - right, y - 10)
    .stroke();

  if (disclosureLine) {
    doc
      .font(TYPE.serif)
      .fontSize(SIZES.micro)
      .fillColor(COLORS.inkMute)
      .text(disclosureLine, left, y, {
        width: pageWidth - left - right - 80,
        align: "left"
      });
  }

  doc
    .font(TYPE.sans)
    .fontSize(SIZES.micro)
    .fillColor(COLORS.inkMute)
    .text(
      `${firmName} · ${page}${total ? ` of ${total}` : ""}`,
      pageWidth - right - 120,
      y,
      { width: 120, align: "right", characterSpacing: 0.4 }
    );
}

export function h1(doc, text) {
  doc
    .moveDown(0.5)
    .font(TYPE.serif)
    .fontSize(SIZES.title)
    .fillColor(COLORS.ink)
    .text(text);
}

export function h2(doc, text) {
  doc
    .moveDown(1.1)
    .font(TYPE.serif)
    .fontSize(SIZES.h2)
    .fillColor(COLORS.ink)
    .text(text);
  doc.moveDown(0.4);
}

export function smallCaps(doc, text) {
  doc
    .font(TYPE.sans)
    .fontSize(SIZES.micro)
    .fillColor(COLORS.inkMute)
    .text(text.toUpperCase(), { characterSpacing: 1.4 });
}

export function body(doc, text) {
  doc
    .font(TYPE.serif)
    .fontSize(SIZES.body)
    .fillColor(COLORS.inkSoft)
    .text(text, { align: "left", lineGap: 3 });
}

export const DISCLOSURE_LINE =
  "The KJC FX Growth Fund is a British Virgin Islands Incubator Fund. Capital is at risk. Past performance is not a guide to future returns. Not available to United States persons.";
