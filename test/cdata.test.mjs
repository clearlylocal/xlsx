import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "../xlsx.mjs";

const cases = [
  {
    name: "preserves an unclosed source wrapper",
    input: "<![CDATA[Unclosed source",
    expected: "<![CDATA[Unclosed source",
  },
  {
    name: "preserves an unclosed target wrapper",
    input: "<![CDATA[Unclosed target",
    expected: "<![CDATA[Unclosed target",
  },
  {
    name: "preserves an embedded unclosed source wrapper",
    input: "Before <![CDATA[unclosed source after",
    expected: "Before <![CDATA[unclosed source after",
  },
  {
    name: "preserves an embedded unclosed target wrapper",
    input: "Before <![CDATA[unclosed target after",
    expected: "Before <![CDATA[unclosed target after",
  },
  { name: "preserves an opening delimiter alone", input: "<![CDATA[", expected: "<![CDATA[" },
  {
    name: "preserves a closing delimiter alone",
    input: "unfinished]]>",
    expected: "unfinished]]>",
  },
  {
    name: "decodes ordinary entities in text with an unclosed wrapper",
    input: "Before & <![CDATA[unclosed <b>text</b>",
    expected: "Before & <![CDATA[unclosed <b>text</b>",
  },
  {
    name: "keeps complete wrapper handling",
    input: "<![CDATA[<b>text</b>]]>",
    expected: "<b>text</b>",
  },
  {
    name: "keeps embedded wrapper spacing",
    input: "Before <![CDATA[text]]> after",
    expected: "Before text after",
  },
  {
    name: "treats an opening delimiter inside a complete wrapper as literal text",
    input: "<![CDATA[ something <![CDATA[another]]>",
    expected: " something <![CDATA[another",
  },
  {
    name: "keeps adjacent wrapper handling",
    input: "<![CDATA[first]]><![CDATA[second]]>",
    expected: "firstsecond",
  },
  {
    name: "keeps empty wrapper handling",
    input: "Before <![CDATA[]]> after",
    expected: "Before  after",
  },
  {
    name: "ignores closing delimiters before the opening delimiter",
    input: "]]> before <![CDATA[text]]>",
    expected: "]]> before text",
  },
  {
    name: "preserves an unclosed wrapper after a complete wrapper",
    input: "<![CDATA[first]]> <![CDATA[unfinished",
    expected: "first <![CDATA[unfinished",
  },
];

for (const { name, input, expected } of cases) {
  test(name, () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[input]]), "Text");

    const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", bookSST: false });
    const parsed = XLSX.read(bytes);

    assert.equal(parsed.Sheets.Text.A1.v, expected);
  });
}
