/* ============================================================
   Error Explainer — popup.js
   Logique principale du popup :
   - Chargement de la base d'erreurs (GitHub + fallback local)
   - Filtre par technologie
   - Matching des patterns
   - Affichage des résultats
   - Auto-détection des pages d'erreur via content.js
   ============================================================ */

/* ---------- Configuration ---------- */

// URL de base des fichiers JSON sur GitHub raw
const GITHUB_BASE = "https://raw.githubusercontent.com/Lavalloir/ErrorExplainer/main/errors";

// Liste de tous les fichiers JSON de la base
const ERROR_FILES = [
  "php", "symfony", "laravel", "react", "javascript", "typescript",
  "nodejs", "mysql", "doctrine", "csharp", "axios", "docker",
  "git", "composer", "vite", "npm", "http", "css"
];

// Correspondance nom de tech → nom de fichier JSON
const TECH_TO_FILE = {
  "Symfony":    "symfony",
  "Laravel":    "laravel",
  "PHP":        "php",
  "React":      "react",
  "JavaScript": "javascript",
  "TypeScript": "typescript",
  "Node.js":    "nodejs",
  "MySQL":      "mysql",
  "Doctrine":   "doctrine",
  "C#":         "csharp",
  "Axios":      "axios",
  "Docker":     "docker",
  "Git":        "git",
  "Composer":   "composer",
  "Vite":       "vite",
  "npm":        "npm",
  "HTTP":       "http",
  "CSS":        "css"
};

// Base d'erreurs chargée en mémoire
let errorsDB = [];

/* ---------- Chargement de la base ---------- */

/**
 * Fetch un JSON depuis GitHub, avec fallback sur le fichier local embarqué.
 * @param {string} name - nom du fichier sans extension (ex: "symfony")
 */
async function fetchJSON(name) {
  try {
    const res = await fetch(`${GITHUB_BASE}/${name}.json`);
    return await res.json();
  } catch {
    // GitHub inaccessible → on utilise le fichier local
    const res = await fetch(chrome.runtime.getURL(`errors/${name}.json`));
    return await res.json();
  }
}

/**
 * Charge toutes les techs en parallèle.
 * Ne recharge pas si la base est déjà en mémoire.
 */
async function loadAllDB() {
  if (errorsDB.length > 0) return;
  const all = await Promise.all(ERROR_FILES.map(name => fetchJSON(name)));
  errorsDB = all.flat();
}

/**
 * Charge uniquement le fichier JSON d'une tech spécifique.
 * @param {string} file - nom du fichier (ex: "symfony")
 */
async function loadTechDB(file) {
  errorsDB = await fetchJSON(file);
}

/* ---------- Sélecteur de tech ---------- */

/**
 * Retourne la valeur du sélecteur de tech (ex: "symfony" ou "" si vide).
 */
function getSelectedTech() {
  return document.getElementById("techSelect").value;
}

/**
 * Pré-sélectionne la tech dans le menu déroulant.
 * @param {string} techName - nom de la tech (ex: "Symfony")
 */
function setSelectedTech(techName) {
  const file = TECH_TO_FILE[techName];
  if (file) document.getElementById("techSelect").value = file;
}

/* ---------- Badges ---------- */

/**
 * Retourne la classe CSS du badge selon la technologie.
 * @param {string} tech
 */
function techToBadgeClass(tech) {
  const map = {
    "Symfony":    "badge-symfony",
    "Laravel":    "badge-laravel",
    "React":      "badge-react",
    "JavaScript": "badge-js",
    "PHP":        "badge-php",
    "Node.js":    "badge-node",
    "MySQL":      "badge-mysql",
    "TypeScript": "badge-typescript",
    "HTTP":       "badge-http",
    "Doctrine":   "badge-doctrine",
    "Git":        "badge-git",
    "Composer":   "badge-composer",
    "Vite":       "badge-vite",
    "CSS":        "badge-css",
    "npm":        "badge-npm",
    "C#":         "badge-csharp",
    "Axios":      "badge-axios",
    "Docker":     "badge-docker"
  };
  return map[tech] || "badge-default";
}

/* ---------- Normalisation du texte ---------- */

/**
 * Remplace les backticks par des balises <code> pour l'affichage.
 * @param {string} text
 */
function renderCodeInText(text) {
  return text.replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * Normalise le texte de l'erreur avant matching :
 * - Guillemets typographiques → guillemets droits
 * - Sauts de ligne → espaces
 * @param {string} input
 */
function normalizeInput(input) {
  return input
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"') // guillemets typographiques
    .replace(/[\u2018\u2019]/g, "'")              // apostrophes typographiques
    .replace(/\s+/g, " ")                         // sauts de ligne → espace
    .trim();
}

/* ---------- Recherche ---------- */

/**
 * Cherche les entrées dont le pattern matche le message d'erreur.
 * Supporte les regex (flag i + s) et le fallback en includes().
 * @param {string} input - message d'erreur brut
 */
function findMatches(input) {
  const cleaned    = normalizeInput(input);
  const normalized = cleaned.toLowerCase();

  return errorsDB.filter(entry => {
    try {
      // "i" = insensible à la casse, "s" = . matche les sauts de ligne
      return new RegExp(entry.pattern, "is").test(cleaned);
    } catch {
      // Pattern invalide en regex → fallback simple includes
      return normalized.includes(entry.pattern.toLowerCase());
    }
  });
}

/* ---------- Affichage des résultats ---------- */

/**
 * Affiche les cartes de résultats dans la zone de résultat.
 * @param {Array} matches - entrées matchées
 */
function renderResults(matches) {
  const area = document.getElementById("resultArea");

  // Aucun résultat trouvé
  if (matches.length === 0) {
    area.innerHTML = `
      <div class="no-match">
        <strong>❌ Aucune correspondance trouvée</strong>
        Cette erreur n'est pas encore dans la base.<br>
        Essaie sans filtre de tech, ou ajoute-la dans le JSON correspondant.
      </div>`;
    return;
  }

  // Compteur si plusieurs résultats
  const countLabel = matches.length > 1
    ? `<div class="matches-count">${matches.length} correspondances trouvées</div>`
    : "";

  // Génération des cartes
  const cards = matches.map(m => `
    <div class="result-card">
      <span class="badge ${techToBadgeClass(m.tech)}">${m.tech}</span>
      <div class="result-explication">${renderCodeInText(m.explication)}</div>
      <div class="conseil-block">
        <div class="conseil-label">💡 CONSEIL</div>
        <div class="conseil-text">${renderCodeInText(m.conseil)}</div>
      </div>
    </div>
  `).join("");

  area.innerHTML = `${countLabel}<div class="multiple-results">${cards}</div>`;
}

/* ---------- Bannière auto-détection ---------- */

/**
 * Affiche la bannière verte indiquant qu'une page d'erreur a été détectée.
 * @param {string} tech - nom de la tech détectée (ex: "Symfony")
 */
function showAutoDetectedBanner(tech) {
  const banner = document.getElementById("autoDetectedBanner");
  document.getElementById("autoDetectedLabel").textContent =
    `⚡ Page ${tech} détectée automatiquement`;
  banner.classList.add("visible");
}

/* ---------- Analyse ---------- */

/**
 * Lance l'analyse du message d'erreur saisi.
 * Charge uniquement le JSON de la tech sélectionnée si un filtre est actif,
 * sinon charge toute la base.
 */
async function analyze() {
  const input = document.getElementById("errorInput").value.trim();
  if (!input) return;

  const btn = document.getElementById("btnAnalyze");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Analyse…';

  const selectedFile = getSelectedTech();

  if (selectedFile) {
    // Tech sélectionnée → charge uniquement ce fichier (plus rapide)
    await loadTechDB(selectedFile);
  } else {
    // Pas de filtre → charge toute la base
    await loadAllDB();
  }

  renderResults(findMatches(input));

  btn.disabled = false;
  btn.textContent = "Analyser";
}

/* ---------- Événements ---------- */

// Réinitialise la DB en mémoire quand on change de tech
// pour forcer le rechargement du bon fichier
document.getElementById("techSelect").addEventListener("change", () => {
  errorsDB = [];
});

// Bouton Analyser
document.getElementById("btnAnalyze").addEventListener("click", analyze);

// Bouton Effacer
document.getElementById("btnClear").addEventListener("click", () => {
  document.getElementById("errorInput").value = "";
  document.getElementById("techSelect").value = "";
  document.getElementById("autoDetectedBanner").classList.remove("visible");
  document.getElementById("resultArea").innerHTML = `
    <div class="result-empty">
      <span>🛠️</span>
      Colle une erreur et clique sur Analyser
    </div>`;
  errorsDB = [];
});

// Ctrl+Entrée pour lancer l'analyse sans la souris
document.getElementById("errorInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
});

/* ---------- Initialisation ---------- */

/**
 * Au démarrage du popup :
 * 1. Clic droit sur sélection → priorité maximale
 * 2. Scan automatique de la page (Symfony, Laravel, WAMP)
 * 3. Texte sélectionné sur la page
 * 4. Rien → popup vide, saisie manuelle
 */
async function init() {
  const [tab]   = await chrome.tabs.query({ active: true, currentWindow: true });
  const session = await chrome.storage.session.get("pendingError");

  // Priorité 1 : texte envoyé via clic droit
  if (session.pendingError) {
    document.getElementById("errorInput").value = session.pendingError;
    chrome.storage.session.remove("pendingError");
    await loadAllDB();
    renderResults(findMatches(session.pendingError));
    return;
  }

  if (!tab?.id) return;

  // Priorité 2 : scan automatique de la page via content.js
  chrome.tabs.sendMessage(tab.id, { action: "scanPage" }, async (res) => {
    if (chrome.runtime.lastError || !res) {

      // Priorité 3 : texte sélectionné sur la page
      chrome.tabs.sendMessage(tab.id, { action: "getSelection" }, async (sel) => {
        if (chrome.runtime.lastError || !sel?.text) return;
        document.getElementById("errorInput").value = sel.text;
        await loadAllDB();
        renderResults(findMatches(sel.text));
      });
      return;
    }

    // Page d'erreur détectée → pré-sélectionne la tech + affiche la bannière
    document.getElementById("errorInput").value = res.message;
    setSelectedTech(res.tech);
    showAutoDetectedBanner(res.tech);
    await loadTechDB(TECH_TO_FILE[res.tech]);
    renderResults(findMatches(res.message));
  });
}

init();
