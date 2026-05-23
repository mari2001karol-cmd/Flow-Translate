/* global document, window, NodeFilter */
/**
 * Flow Translate - Content Script
 *
 * Responsável por interagir com o DOM das páginas web:
 * - Detectar seleção de texto pelo usuário (highlight)
 * - Exibir tooltip flutuante com tradução ao selecionar texto
 * - Destacar automaticamente palavras salvas nos baralhos
 * - Exibir tradução ao clicar em palavras destacadas
 */

const PREFIX = "ft-";
const SELECTION_DEBOUNCE = 300;
const HIGHLIGHT_CLASS = `${PREFIX}highlight`;

// Comentado temporariamente para o ESLint não reclamar de variável não usada
// let tooltipElement = null;

let debounceTimer = null;
let savedWords = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initContentScript() {
  await loadSavedWords();

  const data = await chrome.storage.local.get(["settings"]);
  const settings = data.settings || {
    highlightEnabled: true,
    tooltipEnabled: true,
    highlightColor: "#3b82f6",
  };

  if (settings.highlightEnabled) {
    highlightSavedWords();
  }

  if (settings.tooltipEnabled) {
    registerSelectionListener();
  }

  applyHighlightColor(settings.highlightColor);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (changes.settings) {
        const newSettings = changes.settings.newValue;

        removeHighlights();

        if (newSettings.highlightEnabled) {
          highlightSavedWords();
        }

        applyHighlightColor(newSettings.highlightColor);
      }

      if (changes.decks) {
        loadSavedWords().then(() => {
          removeHighlights();

          if (settings.highlightEnabled) {
            highlightSavedWords();
          }
        });
      }
    }
  });
}

// ============================================
// CARREGAMENTO
// ============================================

async function loadSavedWords() {
  try {
    const data = await chrome.storage.local.get(["decks"]);
    const decks = data.decks || [];

    savedWords = [];

    decks.forEach((deck) => {
      if (deck.cards) {
        deck.cards.forEach((card) => {
          savedWords.push({
            word: card.front,
            translation: card.back,
            sourceLang: card.sourceLang,
            targetLang: card.targetLang,
          });
        });
      }
    });
  } catch (error) {
    console.warn("[FlowTranslate CS] Erro:", error);
    savedWords = [];
  }
}

// ============================================
// HIGHLIGHT
// ============================================

function highlightSavedWords() {
  if (savedWords.length === 0) return;

  const wordsPattern = savedWords.map((w) => escapeRegex(w.word)).join("|");

  if (!wordsPattern) return;

  const regex = new RegExp(`\\b(${wordsPattern})\\b`, "gi");

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;

        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName.toLowerCase();

        if (
          ["script", "style", "noscript", "textarea", "input"].includes(tag)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest(`.${HIGHLIGHT_CLASS}`)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent;

    if (!regex.test(text)) return;

    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      const span = document.createElement("span");
      span.className = HIGHLIGHT_CLASS;
      span.textContent = match[0];

      span.addEventListener("click", () => {
        const saved = savedWords.find(
          (w) => w.word.toLowerCase() === match[0].toLowerCase(),
        );

        if (!saved) return;

        alert(`${saved.word} = ${saved.translation}`);
      });

      fragment.appendChild(span);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

function removeHighlights() {
  const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);

  highlights.forEach((span) => {
    const textNode = document.createTextNode(span.textContent);

    span.parentNode.replaceChild(textNode, span);
  });
}

// ============================================
// TOOLTIP
// ============================================

function registerSelectionListener() {
  document.addEventListener("mouseup", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => handleTextSelection(), SELECTION_DEBOUNCE);
  });
}

async function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText || selectedText.length > 500) {
    return;
  }

  try {
    const data = await chrome.storage.local.get(["sourceLang", "targetLang"]);

    const response = await chrome.runtime.sendMessage({
      action: "translateSelection",
      text: selectedText,
      sourceLang: data.sourceLang || "en",
      targetLang: data.targetLang || "pt",
    });

    if (response && response.success) {
      alert(`${selectedText} = ${response.translatedText}`);
    }
  } catch (error) {
    console.error(error);
  }
}

// ============================================
// CONFIGURAÇÃO VISUAL
// ============================================

function applyHighlightColor(color) {
  let style = document.getElementById(`${PREFIX}dynamic-style`);

  if (!style) {
    style = document.createElement("style");
    style.id = `${PREFIX}dynamic-style`;
    document.head.appendChild(style);
  }

  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: ${color};
      color: white;
      padding: 2px 4px;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
}

// ============================================
// UTILITÁRIOS
// ============================================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

initContentScript();
