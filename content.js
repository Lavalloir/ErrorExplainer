function detectSymfony() {
  const h1 = document.querySelector('h1.exception-message');
  if (h1) return { tech: "Symfony", message: h1.textContent.trim().slice(0, 500) };

  const wrapper = document.querySelector('.exception-message-wrapper');
  if (wrapper) return { tech: "Symfony", message: wrapper.textContent.trim().slice(0, 500) };

  return null;
}

function detectLaravel() {
  // Page Ignition (Laravel 8+)
  const ignition = document.querySelector('.exception-title, [data-testid="exception-title"]');
  if (ignition) return { tech: "Laravel", message: ignition.textContent.trim().slice(0, 500) };

  // Page d'erreur Laravel classique
  const title = document.querySelector('.title');
  const body = document.body?.innerText || "";
  if (title && (body.includes("Laravel") || body.includes("Illuminate"))) {
    return { tech: "Laravel", message: title.textContent.trim().slice(0, 500) };
  }

  return null;
}

function detectWAMP() {
  const body = document.body?.innerText || "";
  const hasWampError = /Fatal error|Warning:|Notice:|Parse error|Uncaught Error/i.test(body);
  if (!hasWampError) return null;

  // Cherche la première ligne d'erreur PHP
  const match = body.match(/(Fatal error|Warning|Notice|Parse error|Uncaught Error)[^\n]{0,400}/i);
  if (match) return { tech: "PHP", message: match[0].trim() };

  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSelection") {
    const selection = window.getSelection()?.toString().trim();
    sendResponse({ text: selection || "" });
  }

  if (message.action === "scanPage") {
    const result = detectSymfony() || detectLaravel() || detectWAMP();
    sendResponse(result || null);
  }

  return true;
});
