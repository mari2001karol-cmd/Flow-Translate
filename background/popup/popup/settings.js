const highlightEnabledInput = document.getElementById("highlight-enabled");

const highlightColorInput = document.getElementById("highlight-color");

const tooltipEnabledInput = document.getElementById("tooltip-enabled");

const saveMessage = document.getElementById("save-message");

document.addEventListener("DOMContentLoaded", loadSettings);

// CARREGAR CONFIGURAÇÕES

async function loadSettings() {
  const data = await chrome.storage.local.get(["settings"]);

  const settings = data.settings || {
    highlightEnabled: true,
    highlightColor: "#3b82f6",
    tooltipEnabled: true,
  };

  highlightEnabledInput.checked = settings.highlightEnabled;

  highlightColorInput.value = settings.highlightColor;

  tooltipEnabledInput.checked = settings.tooltipEnabled;
}

// SALVAR CONFIGURAÇÕES

async function saveSettings() {
  const settings = {
    highlightEnabled: highlightEnabledInput.checked,

    highlightColor: highlightColorInput.value,

    tooltipEnabled: tooltipEnabledInput.checked,
  };

  await chrome.storage.local.set({
    settings,
  });

  saveMessage.textContent = "Configurações salvas!";

  setTimeout(() => {
    saveMessage.textContent = "";
  }, 2000);
}

// EVENTOS

highlightEnabledInput.addEventListener("change", saveSettings);

highlightColorInput.addEventListener("input", saveSettings);

tooltipEnabledInput.addEventListener("change", saveSettings);
