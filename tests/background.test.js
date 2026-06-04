import { describe, test, expect } from "vitest";

describe("Chrome Runtime Mock", () => {
  test("deve possuir runtime.sendMessage", () => {
    expect(chrome.runtime.sendMessage).toBeDefined();
  });

  test("deve possuir runtime.onMessage.addListener", () => {
    expect(chrome.runtime.onMessage.addListener).toBeDefined();
  });
});
