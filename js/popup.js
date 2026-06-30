// Logique du popup : charger la base, chercher, afficher.

const GITHUB_BASE = "https://raw.githubusercontent.com/Lavalloir/ErrorExplainer/main/errors";

const FILES = [
  "php", "symfony", "laravel", "react", "javascript", "typescript",
  "nodejs", "mysql", "doctrine", "csharp", "axios", "docker",
  "git", "composerphp", "vite", "npm", "http", "css"
];

const BADGE_CLASS = {
  "Symfony": "badge-symfony", "Laravel": "badge-laravel",
  "React": "badge-react", "JavaScript": "badge-js",
  "PHP": "badge-php", "Node.js": "badge-node",
  "MySQL": "badge-mysql", "TypeScript": "badge-typescript",
  "HTTP": "badge-http", "Doctrine": "badge-doctrine",
  "Git": "badge-git", "Composer": "badge-composer",
  "Vite": "badge-vite", "CSS": "badge-css", "npm": "badge-npm",
  "C#": "badge-csharp", "Axios": "badge-axios", "Docker": "badge-docker"
};

const techSelect = document.getElementById("techSelect");
const errorInput = document.getElementById("errorInput");
const btnAnalyze  = document.getElementById("btnAnalyze");
const btnClear    = document.getElementById("btnClear");
const resultArea  = document.getElementById("resultArea");

// ---------- Chargement des erreurs ----------

async function fetchFile(name) {
  try {
    const res = await fetch(`${GITHUB_BASE}/${name}.json`);
    return await res.json();
  } catch {
    const res = await fetch(chrome.runtime.getURL(`errors/${name}.json`));
    return await res.json();
  }
}

async function loadDB() {
  const techFile = techSelect.value;
  if (techFile) return await fetchFile(techFile);

  const all = await Promise.all(FILES.map(fetchFile));
  return all.flat();
}

// ---------- Recherche ----------

function findMatches(text, db) {
  const cleaned = text
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return db.filter(entry => {
    try {
      return new RegExp(entry.pattern, "is").test(cleaned);
    } catch {
      return cleaned.toLowerCase().includes(entry.pattern.toLowerCase());
    }
  });
}

// ---------- Affichage ----------

function renderResults(matches) {
  if (matches.length === 0) {
    resultArea.innerHTML = `
      <div class="no-match">
        <strong>❌ Aucune correspondance trouvée</strong>
        Cette erreur n'est pas encore dans la base.<br>
        Essaie sans filtre de tech, ou ajoute-la dans le JSON correspondant.
      </div>`;
    return;
  }

  const countLabel = matches.length > 1
    ? `<div class="matches-count">${matches.length} correspondances trouvées</div>`
    : "";

  const cards = matches.map(entry => {
    const badge = BADGE_CLASS[entry.tech] || "badge-default";
    const explication = entry.explication.replace(/`([^`]+)`/g, "<code>$1</code>");
    const conseil = entry.conseil.replace(/`([^`]+)`/g, "<code>$1</code>");
    return `
      <div class="result-card">
        <span class="badge ${badge}">${entry.tech}</span>
        <div class="result-explication">${explication}</div>
        <div class="conseil-block">
          <div class="conseil-label">💡 CONSEIL</div>
          <div class="conseil-text">${conseil}</div>
        </div>
      </div>`;
  }).join("");

  resultArea.innerHTML = `${countLabel}<div class="multiple-results">${cards}</div>`;
}

// ---------- Analyse ----------

async function analyze() {
  const text = errorInput.value.trim();
  if (!text) return;

  btnAnalyze.disabled = true;
  btnAnalyze.innerHTML = '<span class="spinner"></span>Analyse…';

  const db = await loadDB();
  renderResults(findMatches(text, db));

  btnAnalyze.disabled = false;
  btnAnalyze.textContent = "Analyser";
}

// ---------- Événements ----------

btnAnalyze.addEventListener("click", analyze);

btnClear.addEventListener("click", () => {
  errorInput.value = "";
  techSelect.value = "";
  resultArea.innerHTML = `
    <div class="result-empty">
      <span>🛠️</span>
      Colle une erreur et clique sur Analyser
    </div>`;
});

errorInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
});

// ---------- Démarrage ----------

async function init() {
  // Texte envoyé via clic droit
  const session = await chrome.storage.session.get("pendingError");
  if (session.pendingError) {
    chrome.storage.session.remove("pendingError");
    errorInput.value = session.pendingError;
    await analyze();
  }
}

init();
