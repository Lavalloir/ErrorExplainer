/* ============================================================
   Error Explainer — background.js (Service Worker)
   Gère :
   - La création du menu contextuel (clic droit)
   - Le stockage du texte sélectionné pour le popup
   ============================================================ */

// Crée l'entrée dans le menu clic droit à l'installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explainError",
    title: "🔍 Expliquer cette erreur",
    contexts: ["selection"] // uniquement quand du texte est sélectionné
  });
});

// Au clic sur l'entrée du menu contextuel
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainError" && info.selectionText) {
    // Stocke le texte sélectionné en session pour le récupérer dans popup.js
    chrome.storage.session.set({ pendingError: info.selectionText.trim() });
    // Ouvre le popup automatiquement
    chrome.action.openPopup();
  }
});
