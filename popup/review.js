const wordElement = document.getElementById('word');
const translationElement = document.getElementById('translation');
const showAnswerBtn = document.getElementById('show-answer-btn');
const reviewActions = document.getElementById('review-actions');

const hardBtn = document.getElementById('hard-btn');
const mediumBtn = document.getElementById('medium-btn');
const easyBtn = document.getElementById('easy-btn');

const reviewProgress = document.getElementById('review-progress');

const flashcard = document.getElementById('flashcard');

let currentCard = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadRandomCard();
}

async function loadRandomCard() {

  const data = await chrome.storage.local.get(['decks']);

  const decks = data.decks || [];

  const allCards = [];

  const now = new Date();

  // Percorre todos os decks
  decks.forEach(deck => {

    // Percorre todos os cards do deck
    (deck.cards || []).forEach(card => {

      // Se nunca foi revisado
      if (!card.nextReview) {
        allCards.push(card);
        return;
      }

      // Verifica se já chegou a hora da revisão
      const reviewDate = new Date(card.nextReview);

      if (reviewDate <= now) {
        allCards.push(card);
      }

    });

  });

  // Atualiza contador
  reviewProgress.textContent =
    `${allCards.length} cards disponíveis para revisão`;

  // Nenhum card disponível
  if (allCards.length === 0) {

    wordElement.textContent =
      'Nenhum card disponível para revisão';

    translationElement.textContent = '';

    reviewActions.style.display = 'none';

    showAnswerBtn.disabled = true;

    return;
  }

  // Escolhe card aleatório
  const randomIndex =
    Math.floor(Math.random() * allCards.length);

  currentCard = allCards[randomIndex];

  console.log('[Review] Card carregado:', currentCard);

  // Volta card para frente
  flashcard.classList.remove('flipped');

  // Atualiza conteúdo
  wordElement.textContent = currentCard.front;

  translationElement.textContent = currentCard.back;

  // Reset UI
  reviewActions.style.display = 'none';

  showAnswerBtn.disabled = false;
}

// Mostrar resposta
showAnswerBtn.addEventListener('click', () => {

  flashcard.classList.add('flipped');

  reviewActions.style.display = 'block';

  showAnswerBtn.disabled = true;
});

// Botões de dificuldade
hardBtn.addEventListener('click', () => {
  handleReview('hard');
});

mediumBtn.addEventListener('click', () => {
  handleReview('medium');
});

easyBtn.addEventListener('click', () => {
  handleReview('easy');
});

async function handleReview(difficulty) {

  if (!currentCard) return;

  const data = await chrome.storage.local.get(['decks']);

  const decks = data.decks || [];

  // Intervalo base
  let intervalDays = 1;

  const reviewCount = currentCard.reviewCount || 0;

  if (difficulty === 'hard') {
    intervalDays = 1;
  }

  if (difficulty === 'medium') {
    intervalDays = 2 + reviewCount;
  }

  if (difficulty === 'easy') {
    intervalDays = 4 + (reviewCount * 2);
  }

  // Próxima revisão
  const nextReview = new Date();

  nextReview.setDate(
    nextReview.getDate() + intervalDays
  );

  // Atualiza card
  decks.forEach(deck => {

    (deck.cards || []).forEach(card => {

      if (card.id === currentCard.id) {

        card.reviewCount =
          (card.reviewCount || 0) + 1;

        card.lastReview =
          new Date().toISOString();

        card.nextReview =
          nextReview.toISOString();
      }

    });

  });

  // Salva alterações
  await chrome.storage.local.set({ decks });

  alert(`Próxima revisão em ${intervalDays} dia(s)`);

  // Carrega próximo card
  await loadRandomCard();
}