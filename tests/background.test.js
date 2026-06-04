import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleTranslateRequest } from "../background/background.js";

describe("Background Translation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deve traduzir texto com sucesso", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[["Olá", "Hello", null, null]]],
    });

    const sendResponse = vi.fn();

    await handleTranslateRequest(
      {
        text: "Hello",
        sourceLang: "en",
        targetLang: "pt",
      },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      translatedText: "Olá",
    });
  });

  test("deve retornar erro quando texto estiver ausente", async () => {
    const sendResponse = vi.fn();

    await handleTranslateRequest(
      {
        text: "",
        sourceLang: "en",
        targetLang: "pt",
      },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Texto ou idioma ausente",
    });
  });

  test("deve retornar erro quando a API falhar", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Falha de rede"));

    const sendResponse = vi.fn();

    await handleTranslateRequest(
      {
        text: "Hello",
        sourceLang: "en",
        targetLang: "pt",
      },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Erro de conexão",
    });
  });

  test("deve retornar erro para resposta HTTP inválida", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const sendResponse = vi.fn();

    await handleTranslateRequest(
      {
        text: "Hello",
        sourceLang: "en",
        targetLang: "pt",
      },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Erro de conexão",
    });
  });
});
