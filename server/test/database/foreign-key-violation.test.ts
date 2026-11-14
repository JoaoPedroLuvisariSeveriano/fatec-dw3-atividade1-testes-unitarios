import { isForeignKeyViolation } from "../../src/database/foreign-key-violation";

describe("isForeignKeyViolation", () => {
  test("retorna true para erro com code 23503 (chave estrangeira)", () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ['string "23505"', "23505"],
    ["número 23503", 23503],
    ["objeto vazio", {}],
    ['{ code: "outro" }', { code: "outro" }],
  ])("retorna false para %s", (_label, value) => {
    expect(isForeignKeyViolation(value)).toBe(false);
  });
});
