import * as XLSX from "../../xlsx.mjs";

/** @type {readonly ["direct", "shared", "inline"]} */
export const STRING_STORAGES = ["direct", "shared", "inline"];

/**
 * Utility function for creating XLSX file with different string storages.
 *
 * @param {{ storage: typeof STRING_STORAGES[number], rows: { value: string }[] }} opts
 * @returns {Buffer} XLSX file
 */
export function xlsx({ storage, rows }) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows.map(() => ["placeholder"])),
    "Text",
  );

  const bytes = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    bookSST: storage === "shared",
  });

  const archive = XLSX.CFB.read(bytes, { type: "buffer" });
  const sheet = XLSX.CFB.find(archive, "/xl/worksheets/sheet1.xml");
  let xml = Buffer.from(sheet.content).toString("utf8");

  const xmlRows = rows
    .map(({ value }, index) => {
      const row = index + 1;
      let cell;

      if (storage === "direct") {
        cell = `<c r="A${row}" t="str"><f>"cached text"</f><v>${value}</v></c>`;
      } else if (storage === "inline") {
        cell = `<c r="A${row}" t="inlineStr"><is><t xml:space="preserve">${value}</t></is></c>`;
      } else {
        cell = `<c r="A${row}" t="s"><v>${index}</v></c>`;
      }

      return `<row r="${row}">${cell}</row>`;
    })
    .join("");

  xml = xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${xmlRows}</sheetData>`);
  XLSX.CFB.utils.cfb_add(archive, "/xl/worksheets/sheet1.xml", Buffer.from(xml));

  if (storage === "shared") {
    const strings = rows
      .map(({ value }) => `<si><t xml:space="preserve">${value}</t></si>`)
      .join("");

    const xml = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings}</sst>`;
    XLSX.CFB.utils.cfb_add(archive, "/xl/sharedStrings.xml", Buffer.from(xml));
  }

  return XLSX.CFB.write(archive, { type: "buffer", fileType: "zip" });
}
