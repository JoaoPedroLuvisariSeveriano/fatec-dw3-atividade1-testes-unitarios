import { HttpError } from "../../../src/errors";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";

const enrolledAt = new Date("2024-01-15T10:00:00.000Z");

function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<EnrollmentRepository["create"]>, Parameters<EnrollmentRepository["create"]>>(),
    findAll: jest.fn<ReturnType<EnrollmentRepository["findAll"]>, Parameters<EnrollmentRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<EnrollmentRepository["findOne"]>, Parameters<EnrollmentRepository["findOne"]>>(),
  };
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Era esperado que a promessa fosse rejeitada.");
}

describe("EnrollmentsService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: EnrollmentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new EnrollmentsService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("cria matrícula válida e chama repository.create com 123 e 1, nessa ordem", async () => {
    const created: Enrollment = { studentRa: 123, courseId: 1, enrolledAt };
    repository.create.mockResolvedValue(created);

    const result = await service.create({ studentRa: 123, courseId: 1 });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(123, 1);
  });

  test.each<[string, unknown]>([
    ["studentRa 0", { studentRa: 0, courseId: 1 }],
    ["courseId 0", { studentRa: 123, courseId: 0 }],
  ])("rejeita chave inválida (%s) com erro 400 sem chamar repository.create", async (_label, input) => {
    const error = await captureError(service.create(input));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("traduz violação de chave estrangeira (23503) em erro 404", async () => {
    repository.create.mockRejectedValue({ code: "23503" });

    const error = await captureError(service.create({ studentRa: 123, courseId: 1 }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(404);
  });

  test("traduz matrícula duplicada (23505) em erro 409", async () => {
    repository.create.mockRejectedValue({ code: "23505" });

    const error = await captureError(service.create({ studentRa: 123, courseId: 1 }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(409);
  });

  test("lança erro 404 na busca inexistente e encaminha os dois identificadores em ordem", async () => {
    repository.findOne.mockResolvedValue(undefined);

    const error = await captureError(service.findOne(123, 1));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(404);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123, 1);
  });

  test("propaga a mesma instância de Error inesperado na criação", async () => {
    const failure = new Error("falha inesperada");
    repository.create.mockRejectedValue(failure);

    await expect(service.create({ studentRa: 123, courseId: 1 })).rejects.toBe(failure);
  });

  test("lista matrículas e chama repository.findAll uma vez sem argumentos", async () => {
    const list: Enrollment[] = [
      { studentRa: 123, courseId: 1, enrolledAt },
      { studentRa: 123, courseId: 2, enrolledAt },
    ];
    repository.findAll.mockResolvedValue(list);

    const result = await service.findAll();

    expect(result).toEqual(list);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith();
  });

  test("retorna matrícula existente e chama repository.findOne uma vez com 123 e 1", async () => {
    const record: Enrollment = { studentRa: 123, courseId: 1, enrolledAt };
    repository.findOne.mockResolvedValue(record);

    const result = await service.findOne(123, 1);

    expect(result).toEqual(record);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123, 1);
  });
});
