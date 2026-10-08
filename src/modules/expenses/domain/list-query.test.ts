import { describe, expect, it } from "vitest";
import { parseExpenseListQuery } from "./list-query";

describe("expense list query", () => {
  it("defaults to an unfiltered first page", () => {
    expect(parseExpenseListQuery(new URLSearchParams())).toEqual({ month: null, category: null, page: 1 });
  });

  it("accepts a real month, category and page", () => {
    expect(parseExpenseListQuery(new URLSearchParams("month=2028-02&category=FOOD&page=2")))
      .toEqual({ month: "2028-02", category: "FOOD", page: 2 });
  });

  it.each([
    "month=2028-13", "month=2028-2", "month=0000-01", "category=UNKNOWN", "page=0",
    "page=1.5", "page=10001", "page=abc", "month=2028-02&month=2028-03", "unexpected=1",
  ])("rejects %s", (query) => {
    expect(parseExpenseListQuery(new URLSearchParams(query))).toHaveProperty("errors");
  });
});
