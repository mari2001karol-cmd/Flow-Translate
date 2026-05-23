/* global document, chrome */

// Seleção dos elementos da tela de configurações
const highlightEnabledInput = document.getElementById("highlight-enabled");
const highlightColorInput = document.getElementById("highlight-color");
const tooltipEnabledInput = document.getElementById("tooltip-enabled");
const saveMessage = document.getElementById("save-message");

// Executa assim que a página é carregada
document.addEventListener("DOMContentLoaded", loadSettings);

// CARREGAR CONFIGURAÇÕES
async function loadSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  const settings = data.settings || {
    highlightEnabled: true,
    highlightColor: "#3b82f6",
    tooltipEnabled: true,
  };

  if (highlightEnabledInput)
    highlightEnabledInput.checked = settings.highlightEnabled;
  if (highlightColorInput) highlightColorInput.value = settings.highlightColor;
  if (tooltipEnabledInput)
    tooltipEnabledInput.checked = settings.tooltipEnabled;
}

// SALVAR CONFIGURAÇÕES
async function saveSettings() {
  const settings = {
    highlightEnabled: highlightEnabledInput
      ? highlightEnabledInput.checked
      : true,
    highlightColor: highlightColorInput ? highlightColorInput.value : "#3b82f6",
    tooltipEnabled: tooltipEnabledInput ? tooltipEnabledInput.checked : true,
  };

  await chrome.storage.local.set({ settings });

  if (saveMessage) {
    saveMessage.textContent = "Configurações salvas!";
    setTimeout(() => {
      saveMessage.textContent = "";
    }, 2000);
  }
}

// EVENTOS (Salva automaticamente quando o usuário muda qualquer opção)
if (highlightEnabledInput)
  highlightEnabledInput.addEventListener("change", saveSettings);
if (highlightColorInput)
  highlightColorInput.addEventListener("input", saveSettings);
if (tooltipEnabledInput)
  tooltipEnabledInput.addEventListener("change", saveSettings);
