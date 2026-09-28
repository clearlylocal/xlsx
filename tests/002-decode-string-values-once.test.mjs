import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "../xlsx.mjs";

const cases = [
  { input: "&amp;amp;", expected: "&amp;" },
  { input: "&amp;lt;mrk&amp;gt;text&amp;lt;/mrk&amp;gt;", expected: "&lt;mrk&gt;text&lt;/mrk&gt;" },
  { input: "&lt;mrk&gt;text&lt;/mrk&gt;", expected: "<mrk>text</mrk>" },
  { input: "&#x6f22;&#233; &#x1f600; &#128512;", expected: "漢é 😀 😀" },
  { input: "漢字 😀 é العربية", expected: "漢字 😀 é العربية" },
  { input: "&#x10FFFF;", expected: "\u{10FFFF}" },
  { input: "&#x110000; &#1114112;", expected: "&#x110000; &#1114112;" },
  { input: "&#abc;", expected: "&#abc;" },
  { input: "_x005F_x0041_", expected: "_x0041_" },
  { input: "_x0041_", expected: "A" },
  { input: "<![CDATA[&amp; <b>text</b>]]>", expected: "&amp; <b>text</b>" },
  { input: "<![CDATA[]]>", expected: "" },
  { input: "before\r\nafter", expected: "before\nafter" },
  {
    input: "Before <![CDATA[first &amp;]]><![CDATA[second]]> after",
    expected: "Before first &amp;second after",
  },
];

for (const storage of ["direct", "shared", "inline"]) {
  test(`decodes ${storage} string values once`, () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(cases.map(() => ["placeholder"])),
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

    const rows = cases
      .map(({ input }, index) => {
        const row = index + 1;
        let cell;

        if (storage === "direct") {
          cell = `<c r="A${row}" t="str"><f>"cached text"</f><v>${input}</v></c>`;
        } else if (storage === "inline") {
          cell = `<c r="A${row}" t="inlineStr"><is><t xml:space="preserve">${input}</t></is></c>`;
        } else {
          cell = `<c r="A${row}" t="s"><v>${index}</v></c>`;
        }

        return `<row r="${row}">${cell}</row>`;
      })
      .join("");

    xml = xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rows}</sheetData>`);
    XLSX.CFB.utils.cfb_add(archive, "/xl/worksheets/sheet1.xml", Buffer.from(xml));

    if (storage === "shared") {
      const strings = cases
        .map(({ input }) => `<si><t xml:space="preserve">${input}</t></si>`)
        .join("");

      const xml = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings}</sst>`;
      XLSX.CFB.utils.cfb_add(archive, "/xl/sharedStrings.xml", Buffer.from(xml));
    }

    const file = XLSX.CFB.write(archive, { type: "buffer", fileType: "zip" });
    const parsed = XLSX.read(file);

    for (const [index, { input, expected }] of cases.entries()) {
      assert.equal(parsed.Sheets.Text[`A${index + 1}`].v, expected, input);
    }
  });
}
