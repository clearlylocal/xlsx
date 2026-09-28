import assert from "node:assert/strict";
import test from "node:test";
import { STRING_STORAGES, xlsx } from "./utils/xlsx.mjs";
import * as XLSX from "../xlsx.mjs";

const brokenCdataCases = [
  "<![CDATA[Unclosed source",
  "<![CDATA[Unclosed target",
  "Before <![CDATA[unclosed source after",
  "Before <![CDATA[unclosed target after",
  "<![CDATA[",
  "unfinished]]>",
  "Before & <![CDATA[unclosed <b>text</b>",
  "<![CDATA[<b>text</b>]]>",
  "Before <![CDATA[text]]> after",
  "<![CDATA[ something <![CDATA[another]]>",
  "<![CDATA[first]]><![CDATA[second]]>",
  "Before <![CDATA[]]> after",
  "]]> before <![CDATA[text]]>",
  "<![CDATA[first]]> <![CDATA[unfinished",
].map((value) => {
  return [value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"), value];
});

const cases = [
  ...brokenCdataCases,
  ["&amp;amp;", "&amp;"],
  ["&amp;lt;mrk&amp;gt;text&amp;lt;/mrk&amp;gt;", "&lt;mrk&gt;text&lt;/mrk&gt;"],
  ["&lt;mrk&gt;text&lt;/mrk&gt;", "<mrk>text</mrk>"],
  ["_x005F_x0041_", "_x0041_"],
  ["_x0041_", "A"],
  ["<![CDATA[&amp; <b>text</b>]]>", "&amp; <b>text</b>"],
  ["<![CDATA[]]>", ""],
  ["before\r\nafter", "before\nafter"],
  ["Before <![CDATA[first &amp;]]><![CDATA[second]]> after", "Before first &amp;second after"],
];

for (const storage of STRING_STORAGES) {
  test(`decodes ${storage} string values once`, () => {
    const parsed = XLSX.read(xlsx({ storage, rows: cases.map(([input]) => ({ value: input })) }));

    for (const [index, [input, expected]] of cases.entries()) {
      assert.equal(parsed.Sheets.Text[`A${index + 1}`].v, expected, input);
    }
  });
}
