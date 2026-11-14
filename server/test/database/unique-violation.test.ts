import { isUniqueViolation } from "../../src/database/unique-violation";

describe("isUniqueViolation", () => {
  test("retorna true para erro com code 23505 (unicidade)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ['string "23505"', "23505"],
    ["número 23503", 23503],
    ["objeto vazio", {}],
    ['{ code: "outro" }', { code: "outro" }],
  ])("retorna false para %s", (_label, value) => {
    expect(isUniqueViolation(value)).toBe(false);
  });
});
