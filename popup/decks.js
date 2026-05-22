const decksContainer = document.getElementById("decks-container");

const createDeckBtn = document.getElementById("create-deck-btn");

const startReviewBtn = document.getElementById("start-review-btn");

const exportBtn = document.getElementById("export-btn");

const importBtn = document.getElementById("import-btn");

const importFile = document.getElementById("import-file");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await renderDecks();
}

async function renderDecks() {
  const data = await chrome.storage.local.get(["decks"]);

  const decks = data.decks || [];

  decksContainer.innerHTML = "";

  if (decks.length === 0) {
    decksContainer.innerHTML = `<p>Nenhum baralho criado ainda.</p>`;

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
    renameBtn.addEventListener("click", async () => {
      const newName = prompt("Novo nome do baralho:", deck.name);

      if (!newName || !newName.trim()) {
        return;
      }

      deck.name = newName.trim();

      await chrome.storage.local.set({
        decks: decks,
      });

      renderDecks();
    });

    // REDEFINIR
    resetBtn.addEventListener("click", async () => {
      const confirmReset = confirm(
        `Apagar todos os cards do baralho "${deck.name}"?`,
      );

      if (!confirmReset) return;

      deck.cards = [];

      await chrome.storage.local.set({
        decks: decks,
      });

      renderDecks();
    });

    // EXCLUIR
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = confirm(`Excluir o baralho "${deck.name}"?`);

      if (!confirmDelete) return;

      const updatedDecks = decks.filter((d) => d.id !== deck.id);

      await chrome.storage.local.set({
        decks: updatedDecks,
      });

      renderDecks();
    });

    decksContainer.appendChild(deckElement);
  });
}

// CRIAR BARALHO
createDeckBtn.addEventListener("click", async () => {
  const deckName = prompt("Nome do novo baralho");

  if (!deckName) return;

  const data = await chrome.storage.local.get(["decks"]);

  const decks = data.decks || [];

  decks.push({
    id: generateId(),
    name: deckName,
    createdAt: new Date().toISOString(),
    cards: [],
  });

  await chrome.storage.local.set({ decks });

  renderDecks();
});

// INICIAR REVISÃO
startReviewBtn.addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("popup/review.html"),
  });
});

// EXPORTAR JSON
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

// IMPORTAR JSON
importBtn.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const text = await file.text();

    const importedDecks = JSON.parse(text);

    // VALIDAÇÃO
    if (!Array.isArray(importedDecks)) {
      alert("Arquivo inválido");
      return;
    }

    importedDecks.forEach((deck) => {
      if (!deck.name || !Array.isArray(deck.cards)) {
        throw new Error("Estrutura inválida");
      }

      // NOVO ID PARA O DECK
      deck.id = generateId();

      deck.cards.forEach((card) => {
        if (!card.front || !card.back) {
          throw new Error("Card inválido");
        }

        // NOVO ID PARA CADA CARD
        card.id = generateId();
      });
    });

    const data = await chrome.storage.local.get(["decks"]);

    const currentDecks = data.decks || [];

    const updatedDecks = [...currentDecks, ...importedDecks];

    await chrome.storage.local.set({
      decks: updatedDecks,
    });

    alert("Baralhos importados com sucesso!");

    renderDecks();
  } catch (error) {
    console.error(error);

    alert("Erro ao importar arquivo JSON");
  }
});

// GERAR ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
