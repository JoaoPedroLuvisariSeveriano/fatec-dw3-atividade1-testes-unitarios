import type { Database } from "../../../src/database/connection";
import { PgStudentRepository, type Student } from "../../../src/modules/students/students.repository";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("PgStudentRepository", () => {
  let query: jest.Mock;
  let repository: PgStudentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgStudentRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("create: insere ra, name em students, retorna a linha e envia [ra, name] como parâmetros", async () => {
    const row: Student = { ra: 123, name: "Ana" };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create({ ra: 123, name: "Ana" });

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe("INSERT INTO students (ra, name) VALUES ($1, $2) RETURNING ra, name");
    expect(params).toEqual([123, "Ana"]);
  });

  test("findAll: retorna as linhas, seleciona ra, name com ORDER BY name e sem parâmetros", async () => {
    const rows: Student[] = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]).toHaveLength(1);
    expect(normalize(query.mock.calls[0][0])).toBe("SELECT ra, name FROM students ORDER BY name");
  });

  test("findAll: retorna [] quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne: retorna a primeira linha, filtra por ra = $1 e envia [123]", async () => {
    const rows: Student[] = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findOne(123);

    expect(result).toEqual(rows[0]);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe("SELECT ra, name FROM students WHERE ra = $1");
    expect(params).toEqual([123]);
  });

  test("findOne: retorna undefined quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(123)).resolves.toBeUndefined();
  });

  test("create: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(failure);
  });

  test("findAll: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(123)).rejects.toBe(failure);
  });
});
