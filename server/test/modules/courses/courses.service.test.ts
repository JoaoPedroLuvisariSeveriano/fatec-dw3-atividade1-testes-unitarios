import { HttpError } from "../../../src/errors";
import { CoursesService } from "../../../src/modules/courses/courses.service";
import type { Course, CourseRepository } from "../../../src/modules/courses/courses.repository";

function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<CourseRepository["create"]>, Parameters<CourseRepository["create"]>>(),
    findAll: jest.fn<ReturnType<CourseRepository["findAll"]>, Parameters<CourseRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<CourseRepository["findOne"]>, Parameters<CourseRepository["findOne"]>>(),
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

describe("CoursesService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: CoursesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CoursesService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("cria disciplina válida, retorna o registro e chama repository.create uma vez com os dados", async () => {
      const created: Course = { id: 1, name: "Qualidade" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ name: "Qualidade" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test.each<[string, unknown]>([
      ["null", null],
      ["objeto vazio", {}],
      ['nome curto { name: "A" }', { name: "A" }],
    ])("rejeita entrada inválida (%s) com erro 400 sem chamar repository.create", async (_label, input) => {
      const error = await captureError(service.create(input));

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
      expect(repository.create).not.toHaveBeenCalled();
    });

    test("traduz violação de unicidade (23505) em erro 409", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      const error = await captureError(service.create({ name: "Qualidade" }));

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(409);
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ name: "Qualidade" })).rejects.toBe(failure);
    });

    test("encaminha ao repositório somente o campo name, ignorando campos extras", async () => {
      repository.create.mockResolvedValue({ id: 2, name: "Qualidade" });

      await service.create({ name: "Qualidade", extra: true });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });
  });

  describe("findAll", () => {
    test("retorna a lista do stub com uma única chamada ao repositório", async () => {
      const list: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Redes" },
      ];
      repository.findAll.mockResolvedValue(list);

      const result = await service.findAll();

      expect(result).toEqual(list);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha ao listar");
      repository.findAll.mockRejectedValue(failure);

      await expect(service.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna o registro existente e encaminha o id ao repositório", async () => {
      const record: Course = { id: 123, name: "Qualidade" };
      repository.findOne.mockResolvedValue(record);

      const result = await service.findOne(123);

      expect(result).toEqual(record);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o repositório retorna undefined", async () => {
      repository.findOne.mockResolvedValue(undefined);

      const error = await captureError(service.findOne(123));

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(404);
    });

    test("lança erro 400 para id inválido sem consultar o repositório", async () => {
      const error = await captureError(service.findOne(0));

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha ao buscar");
      repository.findOne.mockRejectedValue(failure);

      await expect(service.findOne(123)).rejects.toBe(failure);
    });

    test("spy: observa findOne de um stub existente e recebe o identificador 1", async () => {
      const record: Course = { id: 1, name: "Qualidade" };
      const stub: CourseRepository = {
        create: async () => record,
        findAll: async () => [record],
        findOne: async () => record,
      };
      const spy = jest.spyOn(stub, "findOne");
      const spiedService = new CoursesService(stub);

      const result = await spiedService.findOne(1);

      expect(result).toEqual(record);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });
});
