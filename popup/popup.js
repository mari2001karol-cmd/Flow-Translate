// Seleção dos elementos do HTML
const manageDecksBtn = document.getElementById("manage-decks-btn");
const settingsBtn = document.getElementById("settings-btn");
const translateBtn = document.getElementById("translate-btn");
const sourceText = document.getElementById("source-text");
const translationOutput = document.getElementById("translation-output");
const charCount = document.getElementById("char-count");
const clearBtn = document.getElementById("clear-btn");

// Executa assim que a extensão abre
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await updateDeckCount();
  setupEventListeners();
}

// ============================================
// CONTADOR DE BARALHOS
// ============================================
async function updateDeckCount() {
  const data = await chrome.storage.local.get(["decks"]);
  const decks = data.decks || [];
  const deckCount = document.getElementById("deck-count");
  if (deckCount) {
    deckCount.textContent = decks.length;
  }
}

// ============================================
// CONFIGURAÇÃO DOS EVENTOS (CLIQUES E DIGITAÇÃO)
// ============================================
function setupEventListeners() {
  // Abre a tela de Gerenciar Baralhos
  manageDecksBtn.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup/decks.html"),
    });
  });

  // Abre as configurações em uma nova aba
  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup/settings.html"),
    });
  });

  // Atualiza a contagem de caracteres digitados
  sourceText.addEventListener("input", () => {
    const currentLength = sourceText.value.length;
    charCount.textContent = `${currentLength} / 5000`;
  });

  // Limpa o campo de texto
  clearBtn.addEventListener("click", () => {
    sourceText.value = "";
    charCount.textContent = "0 / 5000";
    translationOutput.innerHTML = `<p class="translator__output-placeholder">A tradução aparecerá aqui...</p>`;
  });

  // Envia o pedido de tradução para o background.js
  translateBtn.addEventListener("click", async () => {
    const text = sourceText.value.trim();
    const sourceLang = document.getElementById("source-lang").value;
    const targetLang = document.getElementById("target-lang").value;

    if (!text) return;

    translateBtn.classList.add("translator__translate-btn--loading");
    translateBtn.disabled = true;

    // Envia mensagem para o background.js resolver a tradução
    chrome.runtime.sendMessage(
      { action: "translate", text, sourceLang, targetLang },
      (response) => {
        translateBtn.classList.remove("translator__translate-btn--loading");
        translateBtn.disabled = false;

        if (response && response.success) {
          translationOutput.textContent = response.translatedText;
          document.getElementById("copy-btn").disabled = false;
          document.getElementById("save-to-deck-btn").disabled = false;
        } else {
          translationOutput.textContent = "Erro ao traduzir. Tente novamente.";
        }
      },
    );
  });
}
