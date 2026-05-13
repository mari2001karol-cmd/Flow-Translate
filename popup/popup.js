/**
 * Flow Translate - Popup Script
 * 
 * Responsável por toda a lógica de interação do popup:
 * - Tradução de texto via mensagem ao background.js (Service Worker)
 * - Seleção e troca de idiomas (persistida via chrome.storage)
 * - Salvar traduções no sistema de baralhos (flashcards)
 * - Copiar resultado para a área de transferência
 * - Gerenciamento de estado da UI (loading, erros, toasts)
 */

// ============================================
// REFERÊNCIAS AOS ELEMENTOS DO DOM
// ============================================
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapLangsBtn = document.getElementById('swap-langs-btn');
const sourceTextarea = document.getElementById('source-text');
const charCount = document.getElementById('char-count');
const clearBtn = document.getElementById('clear-btn');
const translateBtn = document.getElementById('translate-btn');
const translationOutput = document.getElementById('translation-output');
const copyBtn = document.getElementById('copy-btn');
const saveToDeckBtn = document.getElementById('save-to-deck-btn');
const manageDecksBtn = document.getElementById('manage-decks-btn');
const deckCountBadge = document.getElementById('deck-count');
const toastContainer = document.getElementById('toast-container');

// ============================================
// ESTADO INTERNO DO POPUP
// ============================================
let currentTranslation = {
  sourceText: '',
  translatedText: '',
  sourceLang: 'en',
  targetLang: 'pt'
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', init);

/**
 * Inicializa o popup:
 * 1. Carrega preferências de idioma salvas
 * 2. Atualiza contagem de cards nos baralhos
 * 3. Registra event listeners
 */
async function init() {
  await loadSavedPreferences();
  await updateDeckCount();
  registerEventListeners();
}

/**
 * Carrega as preferências de idioma salvas no chrome.storage.local.
 * Isso garante que o usuário não precise reselecionar idiomas
 * toda vez que abrir o popup.
 */
async function loadSavedPreferences() {
  try {
    const data = await chrome.storage.local.get(['sourceLang', 'targetLang']);

    if (data.sourceLang) {
      sourceLangSelect.value = data.sourceLang;
    }
    if (data.targetLang) {
      targetLangSelect.value = data.targetLang;
    }
  } catch (error) {
    console.warn('[FlowTranslate] Erro ao carregar preferências:', error);
  }
}

/**
 * Consulta o chrome.storage.local para contar quantos cards
 * existem em todos os baralhos e atualiza o badge no footer.
 */
async function updateDeckCount() {
  try {
    const data = await chrome.storage.local.get(['decks']);
    const decks = data.decks || [];
    const totalCards = decks.reduce((sum, deck) => sum + (deck.cards ? deck.cards.length : 0), 0);
    deckCountBadge.textContent = totalCards;
  } catch (error) {
    console.warn('[FlowTranslate] Erro ao contar cards:', error);
    deckCountBadge.textContent = '0';
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function registerEventListeners() {
  // --- Textarea: atualiza contador de caracteres ---
  sourceTextarea.addEventListener('input', handleTextInput);

  // --- Limpar texto ---
  clearBtn.addEventListener('click', handleClear);

  // --- Trocar idiomas ---
  swapLangsBtn.addEventListener('click', handleSwapLanguages);

  // --- Salvar preferência ao mudar idioma ---
  sourceLangSelect.addEventListener('change', handleLangChange);
  targetLangSelect.addEventListener('change', handleLangChange);

  // --- Traduzir ---
  translateBtn.addEventListener('click', handleTranslate);

  // --- Copiar tradução ---
  copyBtn.addEventListener('click', handleCopy);

  // --- Salvar no baralho ---
  saveToDeckBtn.addEventListener('click', handleSaveToDeck);

  // --- Gerenciar baralhos ---
  manageDecksBtn.addEventListener('click', handleManageDecks);

  // --- Traduzir com Ctrl+Enter ---
  sourceTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTranslate();
    }
  });
}

// ============================================
// HANDLERS
// ============================================

/**
 * Atualiza o contador de caracteres conforme o usuário digita.
 */
function handleTextInput() {
  const length = sourceTextarea.value.length;
  charCount.textContent = `${length} / 5000`;
}

/**
 * Limpa o textarea, o output e desabilita os botões de ação.
 */
function handleClear() {
  sourceTextarea.value = '';
  charCount.textContent = '0 / 5000';
  setOutputPlaceholder();
  disableActionButtons();
  sourceTextarea.focus();
}

/**
 * Troca os idiomas de origem e destino.
 * Se o idioma de origem for "auto" (detectar), não permite troca.
 */
function handleSwapLanguages() {
  if (sourceLangSelect.value === 'auto') {
    showToast('Não é possível trocar quando o idioma de origem é "Detectar"', 'error');
    return;
  }

  const tempLang = sourceLangSelect.value;
  sourceLangSelect.value = targetLangSelect.value;
  targetLangSelect.value = tempLang;

  // Troca também o texto, se houver tradução
  if (currentTranslation.translatedText) {
    sourceTextarea.value = currentTranslation.translatedText;
    handleTextInput();
  }

  saveLangPreferences();
}

/**
 * Persiste a preferência de idiomas ao trocar qualquer um dos selects.
 */
function handleLangChange() {
  saveLangPreferences();
}

/**
 * Salva os idiomas selecionados no chrome.storage.local.
 */
function saveLangPreferences() {
  chrome.storage.local.set({
    sourceLang: sourceLangSelect.value,
    targetLang: targetLangSelect.value
  });
}

/**
 * Handler principal de tradução.
 * 
 * Passo a passo técnico:
 * 1. Valida se há texto para traduzir
 * 2. Ativa estado de loading no botão
 * 3. Envia mensagem ao background.js (Service Worker) via chrome.runtime.sendMessage
 * 4. O background.js faz a chamada à API de tradução
 * 5. Recebe a resposta e atualiza a UI
 */
async function handleTranslate() {
  const text = sourceTextarea.value.trim();

  if (!text) {
    showToast('Digite um texto para traduzir', 'error');
    sourceTextarea.focus();
    return;
  }

  // Ativa estado de loading
  setTranslateLoading(true);

  try {
    // Envia mensagem ao Service Worker (background.js)
    // A comunicação é assíncrona via chrome.runtime.sendMessage
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value
    });

    if (response && response.success) {
      // Atualiza o estado interno
      currentTranslation = {
        sourceText: text,
        translatedText: response.translatedText,
        sourceLang: sourceLangSelect.value,
        targetLang: targetLangSelect.value
      };

      // Exibe o resultado
      setOutputText(response.translatedText);
      enableActionButtons();
    } else {
      const errorMsg = response?.error || 'Erro desconhecido na tradução';
      showToast(errorMsg, 'error');
      setOutputPlaceholder('Erro na tradução. Tente novamente.');
    }
  } catch (error) {
    console.error('[FlowTranslate] Erro na tradução:', error);
    showToast('Falha de comunicação com o serviço', 'error');
    setOutputPlaceholder('Falha na comunicação. Verifique a conexão.');
  } finally {
    setTranslateLoading(false);
  }
}

/**
 * Copia o texto traduzido para a área de transferência.
 * Usa a Clipboard API (navigator.clipboard.writeText).
 */
async function handleCopy() {
  if (!currentTranslation.translatedText) return;

  try {
    await navigator.clipboard.writeText(currentTranslation.translatedText);
    showToast('Tradução copiada!', 'success');
  } catch (error) {
    console.error('[FlowTranslate] Erro ao copiar:', error);
    showToast('Erro ao copiar texto', 'error');
  }
}

/**
 * Salva a tradução atual no baralho padrão.
 * 
 * Estrutura do baralho no storage:
 * {
 *   decks: [
 *     {
 *       id: string,
 *       name: string,
 *       createdAt: string (ISO),
 *       cards: [
 *         {
 *           id: string,
 *           front: string (texto original),
 *           back: string (tradução),
 *           sourceLang: string,
 *           targetLang: string,
 *           createdAt: string (ISO),
 *           reviewCount: number,
 *           lastReview: string | null
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
async function handleSaveToDeck() {
  if (!currentTranslation.translatedText) return;

  try {
    const data = await chrome.storage.local.get(['decks']);
    let decks = data.decks || [];

    // Cria um baralho padrão se não existir nenhum
    if (decks.length === 0) {
      decks.push({
        id: generateId(),
        name: 'Meu Baralho',
        createdAt: new Date().toISOString(),
        cards: []
      });
    }

    // Verifica se o card já existe no baralho padrão (evita duplicatas)
    const defaultDeck = decks[0];
    const alreadyExists = defaultDeck.cards.some(
      card => card.front.toLowerCase() === currentTranslation.sourceText.toLowerCase()
        && card.sourceLang === currentTranslation.sourceLang
        && card.targetLang === currentTranslation.targetLang
    );

    if (alreadyExists) {
      showToast('Esta palavra já está no baralho!', 'error');
      return;
    }

    // Cria o novo card
    const newCard = {
      id: generateId(),
      front: currentTranslation.sourceText,
      back: currentTranslation.translatedText,
      sourceLang: currentTranslation.sourceLang,
      targetLang: currentTranslation.targetLang,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lastReview: null
    };

    defaultDeck.cards.push(newCard);

    // Persiste no chrome.storage.local
    await chrome.storage.local.set({ decks });

    // Atualiza a badge e mostra feedback
    await updateDeckCount();
    showToast('Card salvo no baralho! 🎉', 'success');
  } catch (error) {
    console.error('[FlowTranslate] Erro ao salvar card:', error);
    showToast('Erro ao salvar no baralho', 'error');
  }
}

/**
 * Abre a página de gerenciamento de baralhos.
 * (Será implementada em fase posterior - por enquanto mostra toast)
 */
function handleManageDecks() {
 chrome.tabs.create({
  url: chrome.runtime.getURL('popup/decks.html')
});
}

// ============================================
// HELPERS DE UI
// ============================================

/**
 * Alterna o estado de loading do botão de traduzir.
 * @param {boolean} isLoading - Se true, mostra spinner e desabilita interação
 */
function setTranslateLoading(isLoading) {
  if (isLoading) {
    translateBtn.classList.add('translator__translate-btn--loading');
    translateBtn.disabled = true;
  } else {
    translateBtn.classList.remove('translator__translate-btn--loading');
    translateBtn.disabled = false;
  }
}

/**
 * Exibe o texto traduzido no output.
 * @param {string} text - Texto traduzido
 */
function setOutputText(text) {
  translationOutput.innerHTML = '';
  translationOutput.textContent = text;
  translationOutput.classList.add('translator__output--has-text');
}

/**
 * Exibe a mensagem de placeholder no output.
 * @param {string} [message] - Mensagem customizada (default: "A tradução aparecerá aqui...")
 */
function setOutputPlaceholder(message = 'A tradução aparecerá aqui...') {
  translationOutput.innerHTML = `<p class="translator__output-placeholder">${message}</p>`;
  translationOutput.classList.remove('translator__output--has-text');
}

/** Habilita os botões de copiar e salvar */
function enableActionButtons() {
  copyBtn.disabled = false;
  saveToDeckBtn.disabled = false;
}

/** Desabilita os botões de copiar e salvar */
function disableActionButtons() {
  copyBtn.disabled = true;
  saveToDeckBtn.disabled = true;
}

/**
 * Exibe um toast de notificação temporário.
 * 
 * @param {string} message - Mensagem a exibir
 * @param {'success' | 'error'} type - Tipo visual do toast
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Remove o toast do DOM após a animação de saída (3s total)
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

/**
 * Gera um ID único para cards e baralhos.
 * Usa crypto.randomUUID() se disponível, senão fallback com Math.random.
 * @returns {string} ID único
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
