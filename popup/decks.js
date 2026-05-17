const decksContainer = document.getElementById('decks-container');
const createDeckBtn = document.getElementById('create-deck-btn');
const startReviewBtn = document.getElementById('start-review-btn');
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await renderDecks();
}

async function renderDecks() {
  const data = await chrome.storage.local.get(['decks']);
  const decks = data.decks || [];

  decksContainer.innerHTML = '';

  if (decks.length === 0) {
    decksContainer.innerHTML = `
      <p>Nenhum baralho criado ainda.</p>
    `;
    return;
  }

  decks.forEach(deck => {
    const deckElement = document.createElement('div');

    deckElement.className = 'deck';

     deckElement.innerHTML = `
   <div class="deck-name">${deck.name}</div>

   <div class="deck-count">
     ${deck.cards.length} cards
   </div>

   <button class="delete-deck-btn">
     🗑️ Excluir
   </button>
 `;

  const deleteBtn = deckElement.querySelector('.delete-deck-btn');

 deleteBtn.addEventListener('click', async () => {
   const confirmDelete = confirm(`Excluir o baralho "${deck.name}"?`);

   if (!confirmDelete) return;

   const updatedDecks = decks.filter(d => d.id !== deck.id);

   await chrome.storage.local.set({
     decks: updatedDecks
   });

   renderDecks();
 });
    decksContainer.appendChild(deckElement);
  });
}

createDeckBtn.addEventListener('click', async () => {
  const deckName = prompt('Nome do novo baralho');

  if (!deckName) return;

  const data = await chrome.storage.local.get(['decks']);
  const decks = data.decks || [];

  decks.push({
    id: generateId(),
    name: deckName,
    createdAt: new Date().toISOString(),
    cards: []
  });

  await chrome.storage.local.set({ decks });

  renderDecks();
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
startReviewBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup/review.html')
  });
});