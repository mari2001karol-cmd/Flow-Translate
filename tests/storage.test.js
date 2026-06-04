import { describe, test, expect, beforeEach, vi } from "vitest";

import {
  getDecks,
  saveDecks,
  getSettings,
  saveSettings,
  getAllCards,
} from "../utils/storage.js";

describe("Storage Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getDecks deve retornar os baralhos salvos", async () => {
    chrome.storage.local.get.mockResolvedValue({
      decks: [{ id: 1, name: "Inglês" }],
    });

    const decks = await getDecks();

    expect(decks).toEqual([{ id: 1, name: "Inglês" }]);
  });

  test("getDecks deve retornar array vazio quando não houver baralhos", async () => {
    chrome.storage.local.get.mockResolvedValue({});

    const decks = await getDecks();

    expect(decks).toEqual([]);
  });

  test("saveDecks deve salvar os baralhos", async () => {
    chrome.storage.local.set.mockResolvedValue();

    const decks = [{ id: 1, name: "Inglês" }];

    const result = await saveDecks(decks);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      decks,
    });

    expect(result).toBe(true);
  });

  test("getSettings deve retornar configurações salvas", async () => {
    const settings = {
      highlightEnabled: false,
      highlightColor: "#000000",
      tooltipEnabled: false,
    };

    chrome.storage.local.get.mockResolvedValue({
      settings,
    });

    const result = await getSettings();

    expect(result).toEqual(settings);
  });

  test("saveSettings deve salvar configurações", async () => {
    const settings = {
      highlightEnabled: true,
      highlightColor: "#3b82f6",
      tooltipEnabled: true,
    };

    chrome.storage.local.set.mockResolvedValue();

    const result = await saveSettings(settings);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings,
    });

    expect(result).toBe(true);
  });

  test("getAllCards deve retornar todos os cards de todos os baralhos", async () => {
    chrome.storage.local.get.mockResolvedValue({
      decks: [
        {
          name: "Inglês",
          cards: [
            { front: "hello", back: "olá" },
            { front: "world", back: "mundo" },
          ],
        },
        {
          name: "Espanhol",
          cards: [{ front: "hola", back: "olá" }],
        },
      ],
    });

    const cards = await getAllCards();

    expect(cards).toEqual([
      { front: "hello", back: "olá" },
      { front: "world", back: "mundo" },
      { front: "hola", back: "olá" },
    ]);
  });
});
