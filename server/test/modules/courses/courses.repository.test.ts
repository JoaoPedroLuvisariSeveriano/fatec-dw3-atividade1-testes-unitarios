import type { Database } from "../../../src/database/connection";
import { PgCourseRepository, type Course } from "../../../src/modules/courses/courses.repository";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("PgCourseRepository", () => {
  let query: jest.Mock;
  let repository: PgCourseRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgCourseRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("create: insere name em courses, retorna a linha e envia [name] como parâmetros", async () => {
    const row: Course = { id: 7, name: "Qualidade" };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create({ name: "Qualidade" });

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe("INSERT INTO courses (name) VALUES ($1) RETURNING id, name");
    expect(params).toEqual(["Qualidade"]);
  });

  test("findAll: retorna as linhas, seleciona id, name com ORDER BY id e sem parâmetros", async () => {
    const rows: Course[] = [
      { id: 1, name: "Qualidade" },
      { id: 2, name: "Redes" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]).toHaveLength(1);
    expect(normalize(query.mock.calls[0][0])).toBe("SELECT id, name FROM courses ORDER BY id");
  });

  test("findAll: retorna [] quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne: retorna a primeira linha, filtra por id = $1 e envia [7]", async () => {
    const rows: Course[] = [
      { id: 7, name: "Qualidade" },
      { id: 8, name: "Outra" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findOne(7);

    expect(result).toEqual(rows[0]);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe("SELECT id, name FROM courses WHERE id = $1");
    expect(params).toEqual([7]);
  });

  test("findOne: retorna undefined quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(7)).resolves.toBeUndefined();
  });

  test("create: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.create({ name: "Qualidade" })).rejects.toBe(failure);
  });

  test("findAll: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(7)).rejects.toBe(failure);
  });
});
