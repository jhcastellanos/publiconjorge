const PDFDocument = require("pdfkit");
const { getTerms } = require("./terms");

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function buildTermsPdf({ planName = "", acceptedAt = "", email = "" } = {}) {
  const terms = getTerms(planName);
  const doc = new PDFDocument({
    size: "A4",
    margin: 56,
    info: {
      Title: `${terms.title} — ${terms.brand}`,
      Author: terms.brand,
      Subject: `Versión ${terms.version}`,
    },
  });
  const done = collect(doc);

  doc.fillColor("#1c1612");
  doc.fontSize(11).text(terms.brand.toUpperCase(), { characterSpacing: 1.4 });
  doc.moveDown(0.4);
  doc.fontSize(22).text(terms.title);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#6b5e52").text(`Versión ${terms.version}`);
  if (planName) doc.text(`Plan: ${planName}`);
  if (email) doc.text(`Email: ${email}`);
  if (acceptedAt) doc.text(`Aceptación: ${acceptedAt}`);
  doc.moveDown();
  doc.strokeColor("#c4a35a").lineWidth(1.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown();

  doc.fillColor("#1c1612").fontSize(11).text(terms.intro, { lineGap: 3 });
  doc.moveDown();

  doc.fillColor("#c81e1e").fontSize(12).text(terms.cancellationNotice.title.toUpperCase());
  doc.moveDown(0.4);
  doc.fillColor("#1c1612").fontSize(10);
  for (const paragraph of terms.cancellationNotice.paragraphs) {
    doc.text(paragraph, { lineGap: 2 });
    doc.moveDown(0.45);
  }

  for (const section of terms.sections) {
    doc.moveDown(0.3);
    doc.fillColor("#1c1612").fontSize(13).text(`${section.number}. ${section.title.toUpperCase()}`);
    doc.moveDown(0.35);
    doc.fontSize(10);
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph, { lineGap: 2 });
      doc.moveDown(0.4);
    }
  }

  doc.moveDown();
  doc.fontSize(9).fillColor("#6b5e52").text(`Publi con Jorge · Términos y Condiciones · Versión ${terms.version}`);

  doc.end();
  return done;
}

module.exports = { buildTermsPdf };
