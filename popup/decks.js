const decksContainer = document.getElementById("decks-container");

const createDeckBtn = document.getElementById("create-deck-btn");

const startReviewBtn = document.getElementById("start-review-btn");

const exportBtn = document.getElementById("export-btn");

const importBtn = document.getElementById("import-btn");

const importFile = document.getElementById("import-file");

// MODAL

const modalOverlay = document.getElementById("modal-overlay");

const modalTitle = document.getElementById("modal-title");

const modalMessage = document.getElementById("modal-message");

const modalInput = document.getElementById("modal-input");

const modalCancelBtn = document.getElementById("modal-cancel-btn");

const modalConfirmBtn = document.getElementById("modal-confirm-btn");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await renderDecks();
}

function openModal({
  title,
  message = "",
  input = false,
  inputValue = "",
  confirmText = "Confirmar",
  danger = false,
  onConfirm,
}) {
  modalTitle.textContent = title;

  modalMessage.textContent = message;

  modalInput.style.display = input ? "block" : "none";

  modalInput.value = inputValue;

  modalConfirmBtn.textContent = confirmText;

  modalConfirmBtn.className = danger ? "danger-btn" : "confirm-btn";

  modalOverlay.style.display = "flex";

  modalCancelBtn.onclick = () => {
    modalOverlay.style.display = "none";
  };

  modalConfirmBtn.onclick = async () => {
    await onConfirm(modalInput.value);

    modalOverlay.style.display = "none";
  };
}

async function renderDecks() {
  const data = await chrome.storage.local.get(["decks"]);

  const decks = data.decks || [];

  decksContainer.innerHTML = "";

  if (decks.length === 0) {
    decksContainer.innerHTML = "<p>Nenhum baralho criado ainda.</p>";

    return;
  }

  decks.forEach((deck) => {
    const deckElement = document.createElement("div");

    deckElement.className = "deck";

    deckElement.innerHTML = `
      <div class="deck-name">
        ${deck.name}
      </div>

      <div class="deck-count">
        ${deck.cards.length} cards
      </div>

      <div class="deck-actions">

        <button class="rename-deck-btn">
          ✏️ Renomear
        </button>

        <button class="reset-deck-btn">
          ♻️ Redefinir
        </button>

        <button class="delete-deck-btn">
          🗑️ Excluir
        </button>

      </div>
    `;

    const renameBtn = deckElement.querySelector(".rename-deck-btn");

    const resetBtn = deckElement.querySelector(".reset-deck-btn");

    const deleteBtn = deckElement.querySelector(".delete-deck-btn");

    // RENOMEAR

    renameBtn.addEventListener("click", () => {
      openModal({
        title: "Renomear Baralho",
        input: true,
        inputValue: deck.name,

        onConfirm: async (value) => {
          if (!value.trim()) return;

          deck.name = value.trim();

          await chrome.storage.local.set({
            decks,
          });

          renderDecks();
        },
      });
    });

    // REDEFINIR

    resetBtn.addEventListener("click", () => {
      openModal({
        title: "Redefinir Baralho",

        message: "Todos os cards serão apagados.",

        confirmText: "Redefinir",

        danger: true,

        onConfirm: async () => {
          deck.cards = [];

          await chrome.storage.local.set({
            decks,
          });

          renderDecks();
        },
      });
    });

    // EXCLUIR

    deleteBtn.addEventListener("click", () => {
      openModal({
        title: "Excluir Baralho",

        message: "Essa ação não poderá ser desfeita.",

        confirmText: "Excluir",

        danger: true,

        onConfirm: async () => {
          const updatedDecks = decks.filter((d) => d.id !== deck.id);

          await chrome.storage.local.set({
            decks: updatedDecks,
          });

          renderDecks();
        },
      });
    });

    decksContainer.appendChild(deckElement);
  });
}

// CRIAR BARALHO

createDeckBtn.addEventListener("click", () => {
  openModal({
    title: "Novo Baralho",

    input: true,

    onConfirm: async (value) => {
      if (!value.trim()) return;

      const data = await chrome.storage.local.get(["decks"]);

      const decks = data.decks || [];

      decks.push({
        id: generateId(),

        name: value.trim(),

        createdAt: new Date().toISOString(),

        cards: [],
      });

      await chrome.storage.local.set({
        decks,
      });

      renderDecks();
    },
  });
});

// REVISÃO

startReviewBtn.addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("popup/review.html"),
  });
});

// EXPORTAR

exportBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["decks"]);

  const decks = data.decks || [];

  const json = JSON.stringify(decks, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = "flow-translate-decks.json";

  a.click();

  URL.revokeObjectURL(url);
});

// IMPORTAR

importBtn.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const text = await file.text();

    const importedDecks = JSON.parse(text);

    if (!Array.isArray(importedDecks)) {
      throw new Error();
    }

    importedDecks.forEach((deck) => {
      if (!deck.name || !Array.isArray(deck.cards)) {
        throw new Error();
      }

      deck.id = generateId();

      deck.cards.forEach((card) => {
        card.id = generateId();
      });
    });

    const data = await chrome.storage.local.get(["decks"]);

    const currentDecks = data.decks || [];

    const updatedDecks = [...currentDecks, ...importedDecks];

    await chrome.storage.local.set({
      decks: updatedDecks,
    });

    renderDecks();
  } catch {
    openModal({
      title: "Erro",

      message: "Arquivo JSON inválido.",

      confirmText: "OK",

      onConfirm: async () => {},
    });
  }
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
