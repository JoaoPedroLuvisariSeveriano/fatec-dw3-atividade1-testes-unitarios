import type { Database } from "../../../src/database/connection";
import {
  PgEnrollmentRepository,
  type Enrollment,
} from "../../../src/modules/enrollments/enrollments.repository";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

const COLUMNS = 'student_ra AS "studentRa", course_id AS "courseId", enrolled_at AS "enrolledAt"';
const enrolledAt = new Date("2024-01-15T10:00:00.000Z");

describe("PgEnrollmentRepository", () => {
  let query: jest.Mock;
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgEnrollmentRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("create: insere em enrollments, retorna a linha em camelCase e envia [123, 7] como parâmetros", async () => {
    const row: Enrollment = { studentRa: 123, courseId: 7, enrolledAt };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create(123, 7);

    expect(result).toEqual(row);
    expect(result.enrolledAt).toBe(enrolledAt);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe(
      `INSERT INTO enrollments (student_ra, course_id) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    );
    expect(params).toEqual([123, 7]);
  });

  test("findAll: retorna as linhas, usa os aliases com ORDER BY student_ra, course_id e sem parâmetros", async () => {
    const rows: Enrollment[] = [
      { studentRa: 123, courseId: 1, enrolledAt },
      { studentRa: 123, courseId: 7, enrolledAt },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]).toHaveLength(1);
    expect(normalize(query.mock.calls[0][0])).toBe(
      `SELECT ${COLUMNS} FROM enrollments ORDER BY student_ra, course_id`,
    );
  });

  test("findAll: retorna [] quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne: retorna a primeira linha, filtra por student_ra = $1 AND course_id = $2 e envia [123, 7]", async () => {
    const rows: Enrollment[] = [
      { studentRa: 123, courseId: 7, enrolledAt },
      { studentRa: 999, courseId: 9, enrolledAt },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findOne(123, 7);

    expect(result).toEqual(rows[0]);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalize(sql)).toBe(
      `SELECT ${COLUMNS} FROM enrollments WHERE student_ra = $1 AND course_id = $2`,
    );
    expect(params).toEqual([123, 7]);
  });

  test("findOne: retorna undefined quando não há linhas", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(123, 7)).resolves.toBeUndefined();
  });

  test("create: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.create(123, 7)).rejects.toBe(failure);
  });

  test("findAll: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne: propaga a mesma instância de Error do banco", async () => {
    const failure = new Error("falha no banco");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(123, 7)).rejects.toBe(failure);
  });
});
