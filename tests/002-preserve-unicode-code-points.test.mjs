import assert from "node:assert/strict";
import test from "node:test";
import { STRING_STORAGES, xlsx } from "./utils/xlsx.mjs";
import * as XLSX from "../xlsx.mjs";

const cases = [
  ["&#x6f22;&#233; &#x1f600; &#128512;", "漢é 😀 😀"],
  ["漢字 😀 é العربية", "漢字 😀 é العربية"],
  ["&#x10FFFF;", "\u{10FFFF}"],
  ["&#x110000; &#1114112;", "&#x110000; &#1114112;"],
  ["&#abc;", "&#abc;"],
];

for (const storage of STRING_STORAGES) {
  test(`preserves Unicode code points in ${storage} strings`, () => {
    const parsed = XLSX.read(xlsx({ storage, rows: cases.map(([input]) => ({ value: input })) }));

    for (const [index, [input, expected]] of cases.entries()) {
      assert.equal(parsed.Sheets.Text[`A${index + 1}`].v, expected, input);
    }
  });
}
