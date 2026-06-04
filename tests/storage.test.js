import { describe, test, expect } from "vitest";

describe("Chrome Storage Mock", () => {
  test("deve possuir storage.local.get", () => {
    expect(chrome.storage.local.get).toBeDefined();
  });

  test("deve possuir storage.local.set", () => {
    expect(chrome.storage.local.set).toBeDefined();
  });
});
