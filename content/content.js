/**
 * Flow Translate - Content Script
 * 
 * Responsável por interagir com o DOM das páginas web:
 * - Detectar seleção de texto pelo usuário (highlight)
 * - Exibir tooltip flutuante com tradução ao selecionar texto
 * - Destacar automaticamente palavras salvas nos baralhos
 * - Exibir tradução ao clicar em palavras destacadas
 * 
 * Este script é injetado em todas as páginas (<all_urls>)
 * conforme definido no manifest.json > content_scripts.
 * 
 * NOTA: Content scripts rodam em um "isolated world" - 
 * não compartilham variáveis com scripts da página,
 * mas acessam o mesmo DOM.
 */

// ============================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================

/** Prefixo para IDs de elementos criados pela extensão (evitar conflitos) */
const PREFIX = 'ft-';

/** Tempo de debounce para seleção de texto (ms) */
const SELECTION_DEBOUNCE = 300;

/** Classe CSS para palavras destacadas no DOM */
const HIGHLIGHT_CLASS = `${PREFIX}highlight`;

// ============================================
// ESTADO DO CONTENT SCRIPT
// ============================================

let tooltipElement = null;
let debounceTimer = null;
let savedWords = []; // Cache local das palavras dos baralhos

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa o content script:
 * 1. Carrega as palavras salvas dos baralhos
 * 2. Aplica highlight automático nas palavras encontradas
 * 3. Registra listener de seleção de texto
 */
async function initContentScript() {
  await loadSavedWords();
  highlightSavedWords();
  registerSelectionListener();

  // Escuta mudanças no storage para atualizar highlights em tempo real
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.decks) {
      loadSavedWords().then(() => {
        removeHighlights();
        highlightSavedWords();
      });
    }
  });
}

// ============================================
// CARREGAMENTO DE PALAVRAS SALVAS
// ============================================

/**
 * Carrega todas as palavras (cards) de todos os baralhos
 * e armazena em cache local (savedWords) para uso rápido.
 */
async function loadSavedWords() {
  try {
    const data = await chrome.storage.local.get(['decks']);
    const decks = data.decks || [];

    savedWords = [];
    decks.forEach(deck => {
      if (deck.cards) {
        deck.cards.forEach(card => {
          savedWords.push({
            word: card.front,
            translation: card.back,
            sourceLang: card.sourceLang,
            targetLang: card.targetLang
          });
        });
      }
    });
  } catch (error) {
    console.warn('[FlowTranslate CS] Erro ao carregar palavras:', error);
    savedWords = [];
  }
}

// ============================================
// HIGHLIGHT AUTOMÁTICO
// ============================================

/**
 * Percorre o texto visível da página e destaca palavras
 * que coincidem com as palavras salvas nos baralhos.
 * 
 * Usa um TreeWalker para percorrer apenas nós de texto,
 * evitando modificar elementos como <script>, <style>, etc.
 */
function highlightSavedWords() {
  if (savedWords.length === 0) return;

  // Cria um regex com todas as palavras salvas (case-insensitive)
  const wordsPattern = savedWords
    .map(w => escapeRegex(w.word))
    .join('|');

  if (!wordsPattern) return;

  const regex = new RegExp(`\\b(${wordsPattern})\\b`, 'gi');

  // TreeWalker: percorre nós de texto no DOM de forma eficiente
  // NodeFilter.SHOW_TEXT = mostra apenas nós de texto (#text)
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Ignora scripts, estilos e elementos da própria extensão
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest(`.${HIGHLIGHT_CLASS}`) || parent.id?.startsWith(PREFIX)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  // Processa cada nó de texto buscando matches
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    if (!regex.test(text)) return;

    // Reset do lastIndex do regex (stateful em modo global)
    regex.lastIndex = 0;

    // Cria um fragmento de documento para substituir o nó
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Texto antes do match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // Cria o span de highlight
      const span = document.createElement('span');
      span.className = HIGHLIGHT_CLASS;
      span.textContent = match[0];
      span.dataset.ftWord = match[0].toLowerCase();

      // Adiciona evento de clique para mostrar tradução
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSavedWordTooltip(span);
      });

      fragment.appendChild(span);
      lastIndex = regex.lastIndex;
    }

    // Texto restante após o último match
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    // Substitui o nó de texto original pelo fragmento
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

/**
 * Remove todos os highlights da página.
 * Restaura o texto original substituindo os spans pelos seus conteúdos.
 */
function removeHighlights() {
  const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlights.forEach(span => {
    const textNode = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(textNode, span);
  });
}

// ============================================
// TOOLTIP DE SELEÇÃO (TRADUÇÃO INLINE)
// ============================================

/**
 * Registra listener de mouseup para detectar seleção de texto.
 * Usa debounce para evitar chamadas excessivas.
 */
function registerSelectionListener() {
  document.addEventListener('mouseup', (e) => {
    // Ignora cliques em elementos da extensão
    if (e.target.closest(`[id^="${PREFIX}"]`) || e.target.closest(`.${HIGHLIGHT_CLASS}`)) {
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleTextSelection(e), SELECTION_DEBOUNCE);
  });

  // Fecha tooltip ao clicar fora
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest(`#${PREFIX}tooltip`)) {
      removeTooltip();
    }
  });
}

/**
 * Processa a seleção de texto do usuário.
 * Se há texto selecionado, solicita tradução ao background.js
 * e exibe um tooltip flutuante próximo à seleção.
 */
async function handleTextSelection(event) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // Só traduz se houver entre 1 e 500 caracteres selecionados
  if (!selectedText || selectedText.length > 500) {
    return;
  }

  // Remove tooltip anterior
  removeTooltip();

  // Obtém posição da seleção para posicionar o tooltip
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Cria tooltip com estado de loading
  createTooltip(rect, selectedText, 'Traduzindo...');

  try {
    // Busca os idiomas configurados
    const data = await chrome.storage.local.get(['sourceLang', 'targetLang']);
    const sourceLang = data.sourceLang || 'en';
    const targetLang = data.targetLang || 'pt';

    // Envia requisição de tradução ao Service Worker
    const response = await chrome.runtime.sendMessage({
      action: 'translateSelection',
      text: selectedText,
      sourceLang: sourceLang,
      targetLang: targetLang
    });

    if (response && response.success) {
      updateTooltipContent(selectedText, response.translatedText, sourceLang, targetLang);
    } else {
      updateTooltipError('Erro na tradução');
    }
  } catch (error) {
    console.error('[FlowTranslate CS] Erro:', error);
    updateTooltipError('Falha na comunicação');
  }
}

// ============================================
// TOOLTIP: CRIAÇÃO E GERENCIAMENTO
// ============================================

/**
 * Cria o elemento tooltip flutuante próximo à seleção.
 * 
 * @param {DOMRect} rect - Retângulo da seleção (posição na tela)
 * @param {string} word - Palavra selecionada
 * @param {string} content - Conteúdo inicial (ex: "Traduzindo...")
 */
function createTooltip(rect, word, content) {
  removeTooltip();

  tooltipElement = document.createElement('div');
  tooltipElement.id = `${PREFIX}tooltip`;
  tooltipElement.innerHTML = `
    <div class="${PREFIX}tooltip-header">
      <span class="${PREFIX}tooltip-word">${escapeHtml(word)}</span>
      <button class="${PREFIX}tooltip-close" title="Fechar">✕</button>
    </div>
    <div class="${PREFIX}tooltip-body">
      <p class="${PREFIX}tooltip-translation">${escapeHtml(content)}</p>
    </div>
  `;

  document.body.appendChild(tooltipElement);

  // Posiciona o tooltip acima da seleção
  const tooltipRect = tooltipElement.getBoundingClientRect();
  let top = rect.top + window.scrollY - tooltipRect.height - 8;
  let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);

  // Ajusta se ultrapassar os limites da viewport
  if (top < window.scrollY) top = rect.bottom + window.scrollY + 8;
  if (left < 8) left = 8;
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }

  tooltipElement.style.top = `${top}px`;
  tooltipElement.style.left = `${left}px`;

  // Botão de fechar
  tooltipElement.querySelector(`.${PREFIX}tooltip-close`).addEventListener('click', removeTooltip);
}

/**
 * Atualiza o conteúdo do tooltip com a tradução recebida.
 * Adiciona botão para salvar no baralho.
 */
function updateTooltipContent(word, translation, sourceLang, targetLang) {
  if (!tooltipElement) return;

  const body = tooltipElement.querySelector(`.${PREFIX}tooltip-body`);
  if (!body) return;

  body.innerHTML = `
    <p class="${PREFIX}tooltip-translation">${escapeHtml(translation)}</p>
    <button class="${PREFIX}tooltip-save" title="Salvar no Baralho">
      📚 Salvar
    </button>
  `;

  // Handler do botão salvar
  body.querySelector(`.${PREFIX}tooltip-save`).addEventListener('click', async () => {
    await saveWordFromTooltip(word, translation, sourceLang, targetLang);
  });
}

/**
 * Atualiza o tooltip com mensagem de erro.
 */
function updateTooltipError(message) {
  if (!tooltipElement) return;

  const body = tooltipElement.querySelector(`.${PREFIX}tooltip-body`);
  if (!body) return;

  body.innerHTML = `<p class="${PREFIX}tooltip-error">${escapeHtml(message)}</p>`;
}

/**
 * Remove o tooltip do DOM.
 */
function removeTooltip() {
  if (tooltipElement && tooltipElement.parentNode) {
    tooltipElement.parentNode.removeChild(tooltipElement);
  }
  tooltipElement = null;
}

/**
 * Exibe tooltip para uma palavra destacada (já salva no baralho).
 * @param {HTMLElement} span - Elemento span da palavra destacada
 */
function showSavedWordTooltip(span) {
  const word = span.dataset.ftWord;
  const saved = savedWords.find(w => w.word.toLowerCase() === word);

  if (!saved) return;

  const rect = span.getBoundingClientRect();
  createTooltip(rect, saved.word, saved.translation);
}

// ============================================
// SALVAR PALAVRA DO TOOLTIP
// ============================================

/**
 * Salva uma palavra traduzida no baralho padrão via tooltip.
 * Lógica similar ao popup, mas executada no contexto do content script.
 */
async function saveWordFromTooltip(word, translation, sourceLang, targetLang) {
  try {
    const data = await chrome.storage.local.get(['decks']);
    let decks = data.decks || [];

    if (decks.length === 0) {
      decks.push({
        id: generateId(),
        name: 'Meu Baralho',
        createdAt: new Date().toISOString(),
        cards: []
      });
    }

    const defaultDeck = decks[0];
    const alreadyExists = defaultDeck.cards.some(
      card => card.front.toLowerCase() === word.toLowerCase()
        && card.sourceLang === sourceLang
        && card.targetLang === targetLang
    );

    if (alreadyExists) {
      updateTooltipError('Já está no baralho!');
      return;
    }

    defaultDeck.cards.push({
      id: generateId(),
      front: word,
      back: translation,
      sourceLang,
      targetLang,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lastReview: null
    });

    await chrome.storage.local.set({ decks });

    // Feedback visual
    const saveBtn = tooltipElement?.querySelector(`.${PREFIX}tooltip-save`);
    if (saveBtn) {
      saveBtn.textContent = '✓ Salvo!';
      saveBtn.disabled = true;
      saveBtn.style.background = 'rgba(16, 185, 129, 0.2)';
      saveBtn.style.borderColor = '#10b981';
      saveBtn.style.color = '#10b981';
    }
  } catch (error) {
    console.error('[FlowTranslate CS] Erro ao salvar:', error);
    updateTooltipError('Erro ao salvar');
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Escapa caracteres especiais de regex para uso em RegExp.
 * @param {string} str - String a escapar
 * @returns {string} String com metacaracteres escapados
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapa HTML para prevenir XSS ao inserir texto no DOM.
 * @param {string} str - String a escapar
 * @returns {string} String com entidades HTML escapadas
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Gera um ID único.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ============================================
// BOOT
// ============================================
initContentScript();
