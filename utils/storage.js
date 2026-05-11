/**
 * Flow Translate - Módulo de Storage Utilities
 * 
 * Utilitários para interagir com a API chrome.storage.local
 * de forma centralizada e com tratamento de erros.
 * 
 * Este módulo pode ser importado por outros scripts
 * para operações CRUD nos baralhos e configurações.
 * 
 * NOTA: No Manifest V3, módulos ES6 são suportados
 * no background.js (type: "module") mas NÃO em content scripts.
 * Para content scripts, as funções são duplicadas inline.
 */

/**
 * Obtém todos os baralhos do storage.
 * @returns {Promise<Array>} Lista de baralhos
 */
export async function getDecks() {
  try {
    const data = await chrome.storage.local.get(['decks']);
    return data.decks || [];
  } catch (error) {
    console.error('[FlowTranslate Storage] Erro ao obter baralhos:', error);
    return [];
  }
}

/**
 * Salva a lista completa de baralhos no storage.
 * @param {Array} decks - Lista de baralhos a salvar
 * @returns {Promise<boolean>} true se salvou com sucesso
 */
export async function saveDecks(decks) {
  try {
    await chrome.storage.local.set({ decks });
    return true;
  } catch (error) {
    console.error('[FlowTranslate Storage] Erro ao salvar baralhos:', error);
    return false;
  }
}

/**
 * Obtém as configurações da extensão.
 * @returns {Promise<object>} Objeto de configurações
 */
export async function getSettings() {
  try {
    const data = await chrome.storage.local.get(['settings']);
    return data.settings || {
      highlightEnabled: true,
      highlightColor: '#3b82f6',
      tooltipEnabled: true
    };
  } catch (error) {
    console.error('[FlowTranslate Storage] Erro ao obter configurações:', error);
    return {
      highlightEnabled: true,
      highlightColor: '#3b82f6',
      tooltipEnabled: true
    };
  }
}

/**
 * Salva as configurações da extensão.
 * @param {object} settings - Objeto de configurações
 * @returns {Promise<boolean>} true se salvou com sucesso
 */
export async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ settings });
    return true;
  } catch (error) {
    console.error('[FlowTranslate Storage] Erro ao salvar configurações:', error);
    return false;
  }
}

/**
 * Obtém todas as palavras (cards) de todos os baralhos.
 * Útil para o highlighter e para buscas globais.
 * @returns {Promise<Array>} Lista flat de todos os cards
 */
export async function getAllCards() {
  const decks = await getDecks();
  return decks.flatMap(deck => deck.cards || []);
}
