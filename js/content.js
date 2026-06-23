/* ============================================================
   Error Explainer — content.js
   Injecté sur toutes les pages web.
   Répond aux messages envoyés par popup.js :
   - "scanPage"     → détecte automatiquement une page d'erreur
   - "getSelection" → retourne le texte sélectionné par l'utilisateur

   Techs détectées automatiquement :
   - Symfony  (h1.exception-message)
   - Laravel  (Ignition : .exception-title)
   - WAMP/PHP (regex sur le texte de la page)
   ============================================================ */

/**
 * Détecte une page d'erreur Symfony.
 * Cible le h1 de la page d'exception Symfony (mode dev).
 * @returns {{ tech: string, message: string }|null}
 */
function detectSymfony() {
  const h1 = document.querySelector('h1.exception-message');
  if (h1) return { tech: "Symfony", message: h1.textContent.trim().slice(0, 500) };

  // Fallback : bloc wrapper complet
  const wrapper = document.querySelector('.exception-message-wrapper');
  if (wrapper) return { tech: "Symfony", message: wrapper.textContent.trim().slice(0, 500) };

  return null;
}

/**
 * Détecte une page d'erreur Laravel (Ignition ou page classique).
 * @returns {{ tech: string, message: string }|null}
 */
function detectLaravel() {
  // Laravel 8+ avec Ignition
  const ignition = document.querySelector('.exception-title, [data-testid="exception-title"]');
  if (ignition) return { tech: "Laravel", message: ignition.textContent.trim().slice(0, 500) };

  // Page d'erreur Laravel classique
  const title = document.querySelector('.title');
  const body  = document.body?.innerText || "";
  if (title && (body.includes("Laravel") || body.includes("Illuminate"))) {
    return { tech: "Laravel", message: title.textContent.trim().slice(0, 500) };
  }

  return null;
}

/**
 * Détecte une page d'erreur PHP/WAMP via regex sur le texte de la page.
 * @returns {{ tech: string, message: string }|null}
 */
function detectWAMP() {
  const body = document.body?.innerText || "";

  // Vérifie la présence d'un mot-clé d'erreur PHP
  const hasError = /Fatal error|Warning:|Notice:|Parse error|Uncaught Error/i.test(body);
  if (!hasError) return null;

  // Extrait la première ligne d'erreur trouvée
  const match = body.match(/(Fatal error|Warning|Notice|Parse error|Uncaught Error)[^\n]{0,400}/i);
  if (match) return { tech: "PHP", message: match[0].trim() };

  return null;
}

/* ---------- Écoute des messages depuis popup.js ---------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Retourne le texte sélectionné par l'utilisateur sur la page
  if (message.action === "getSelection") {
    const selection = window.getSelection()?.toString().trim();
    sendResponse({ text: selection || "" });
  }

  // Scanne la page pour détecter automatiquement une erreur
  if (message.action === "scanPage") {
    const result = detectSymfony() || detectLaravel() || detectWAMP();
    sendResponse(result || null); // null = aucune erreur détectée
  }

  // Retourne true pour garder le canal de réponse ouvert (async)
  return true;
});
