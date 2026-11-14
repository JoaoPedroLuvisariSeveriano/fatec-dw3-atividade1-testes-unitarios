import { HttpError } from "../../../src/errors";
import { StudentsService } from "../../../src/modules/students/students.service";
import type { Student, StudentRepository } from "../../../src/modules/students/students.repository";

function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<StudentRepository["create"]>, Parameters<StudentRepository["create"]>>(),
    findAll: jest.fn<ReturnType<StudentRepository["findAll"]>, Parameters<StudentRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<StudentRepository["findOne"]>, Parameters<StudentRepository["findOne"]>>(),
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

describe("StudentsService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: StudentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new StudentsService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("cria aluno válido, retorna o registro e encaminha os dados ao repositório", async () => {
    const created: Student = { ra: 123, name: "Ana" };
    repository.create.mockResolvedValue(created);

    const result = await service.create({ ra: 123, name: "Ana" });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({ ra: 123, name: "Ana" });
  });

  test("rejeita RA inválido com erro 400 sem chamar repository.create", async () => {
    const error = await captureError(service.create({ ra: 0, name: "Ana" }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("traduz RA duplicado (23505) em erro 409", async () => {
    repository.create.mockRejectedValue({ code: "23505" });

    const error = await captureError(service.create({ ra: 123, name: "Ana" }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(409);
  });

  test("lança erro 404 quando o aluno com RA 123 não existe", async () => {
    repository.findOne.mockResolvedValue(undefined);

    const error = await captureError(service.findOne(123));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(404);
  });

  test("propaga a mesma instância de Error inesperado na criação", async () => {
    const failure = new Error("falha inesperada");
    repository.create.mockRejectedValue(failure);

    await expect(service.create({ ra: 123, name: "Ana" })).rejects.toBe(failure);
  });

  test("lista alunos e chama repository.findAll uma vez sem argumentos", async () => {
    const list: Student[] = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    repository.findAll.mockResolvedValue(list);

    const result = await service.findAll();

    expect(result).toEqual(list);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith();
  });

  test("retorna aluno existente e chama repository.findOne uma vez com o RA 123", async () => {
    const record: Student = { ra: 123, name: "Ana" };
    repository.findOne.mockResolvedValue(record);

    const result = await service.findOne(123);

    expect(result).toEqual(record);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123);
  });
});
