// Menu clic droit "Expliquer cette erreur"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explainError",
    title: "🔍 Expliquer cette erreur",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainError" && info.selectionText) {
    chrome.storage.session.set({ pendingError: info.selectionText.trim() });
    chrome.action.openPopup();
  }
});
