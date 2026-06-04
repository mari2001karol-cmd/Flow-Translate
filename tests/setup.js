global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },

  runtime: {
    sendMessage: vi.fn(),

    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },

    onInstalled: {
      addListener: vi.fn(),
    },

    getManifest: vi.fn(() => ({
      version: "1.0.0",
    })),
  },
};
