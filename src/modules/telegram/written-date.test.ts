import { describe, expect, it } from "vitest";
import { formatWrittenDate, parseWrittenDate } from "./written-date";

describe("Written dates as DD/MM/AAAA", () => {
  it.each([
    ["08/10/2026", "2026-10-08"],
    ["01/01/2000", "2000-01-01"],
    ["29/02/2024", "2024-02-29"],
    ["31/12/9999", "9999-12-31"],
    [" 08/10/2026 ", "2026-10-08"],
  ])("accepts %s as a real civil date", (text, expected) => {
    expect(parseWrittenDate(text)).toBe(expected);
  });

  it.each([
    "29/02/2023",
    "29/02/2100",
    "31/04/2026",
    "32/01/2026",
    "00/01/2026",
    "01/13/2026",
    "8/10/2026",
    "08/10/26",
    "2026-10-08",
    "08-10-2026",
    "08/10/2026 extra",
    "ayer",
    "",
  ])("rejects %s", (text) => {
    expect(parseWrittenDate(text)).toBeNull();
  });

  it("renders a civil date as DD/MM/AAAA", () => {
    expect(formatWrittenDate("2026-10-08")).toBe("08/10/2026");
  });

  it("round-trips both formats", () => {
    expect(formatWrittenDate(parseWrittenDate("05/03/2026")!)).toBe("05/03/2026");
  });
});
