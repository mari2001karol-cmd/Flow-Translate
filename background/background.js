/**
 * Flow Translate - Background Service Worker
 *
 * Responsável por:
 * - Receber mensagens do popup.js e content.js
 * - Executar chamadas à API de tradução (MyMemory API - gratuita)
 * - Gerenciar o estado global da extensão
 * - Centralizar lógica que precisa rodar fora do contexto das páginas
 *
 * No Manifest V3, o background script é um Service Worker:
 * - Não tem acesso ao DOM
 * - Pode ser "desligado" pelo Chrome quando ocioso (event-driven)
 * - Deve usar chrome.runtime.onMessage para comunicação
 */

// ============================================
// LISTENER PRINCIPAL DE MENSAGENS
// ============================================

/**
 * Escuta mensagens vindas de popup.js ou content.js.
 *
 * chrome.runtime.onMessage.addListener recebe 3 parâmetros:
 * @param {object} message - Objeto com a ação e dados enviados
 * @param {object} sender - Info sobre quem enviou (tab, extensão, etc.)
 * @param {function} sendResponse - Callback para responder ao remetente
 *
 * IMPORTANTE: Retornar `true` no listener indica ao Chrome que a
 * resposta será enviada de forma assíncrona (necessário para await/fetch).
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Roteamento baseado na ação recebida
  switch (message.action) {
    case "translate":
      handleTranslateRequest(message, sendResponse);
      return true; // Indica resposta assíncrona

    case "translateSelection":
      handleTranslateRequest(message, sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: "Ação desconhecida" });
      return false;
  }
});

// ============================================
// HANDLER DE TRADUÇÃO
// ============================================

/**
 * Processa uma requisição de tradução.
 *
 * Usa a MyMemory Translation API (gratuita, sem necessidade de API key).
 * Endpoint: https://api.mymemory.translated.net/get
 *
 * Parâmetros da API:
 * - q: texto a traduzir (max ~500 chars por request no tier gratuito)
 * - langpair: par de idiomas no formato "en|pt"
 *
 * Passo a passo para identificação da solução:
 * 1. Escolhemos MyMemory por ser gratuita e não exigir autenticação
 * 2. A API aceita GET requests com query params simples
 * 3. O retorno é um JSON com responseData.translatedText
 * 4. Tratamos erros de rede e de resposta separadamente
 *
 * @param {object} message - { text, sourceLang, targetLang }
 * @param {function} sendResponse - Callback para enviar resposta
 */
export async function handleTranslateRequest(message, sendResponse) {
  const { text, sourceLang, targetLang } = message;

  // Validação
  if (!text || !targetLang) {
    sendResponse({
      success: false,
      error: "Texto ou idioma ausente",
    });

    return;
  }

  try {
    // Detecta automático se necessário
    const from = sourceLang === "auto" ? "auto" : sourceLang;

    // NOVA API MAIS ESTÁVEL
    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Google retorna array gigante
    const translatedText = data[0].map((item) => item[0]).join("");

    sendResponse({
      success: true,
      translatedText,
    });
  } catch (error) {
    console.error("[FlowTranslate BG] Erro na tradução:", error);

    sendResponse({
      success: false,
      error: "Erro de conexão",
    });
  }
}

// ============================================
// LIFECYCLE DO SERVICE WORKER
// ============================================

/**
 * chrome.runtime.onInstalled é disparado quando:
 * 1. A extensão é instalada pela primeira vez
 * 2. A extensão é atualizada para uma nova versão
 * 3. O Chrome é atualizado
 *
 * Usamos para inicializar o storage com valores padrão.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Inicializa o storage com configurações padrão
    chrome.storage.local.set({
      sourceLang: "en",
      targetLang: "pt",
      decks: [],
      settings: {
        highlightEnabled: true,
        highlightColor: "#3b82f6",
        tooltipEnabled: true,
      },
    });

    console.log("[FlowTranslate] Extensão instalada com sucesso!");
  }

  if (details.reason === "update") {
    console.log(
      `[FlowTranslate] Atualizada para versão ${chrome.runtime.getManifest().version}`,
    );
  }
});
