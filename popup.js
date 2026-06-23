let errorsDB = [];

const ERROR_FILES = [
  "php", "symfony", "laravel", "react", "javascript", "typescript",
  "nodejs", "mysql", "doctrine", "csharp", "axios", "docker",
  "git", "composer", "vite", "npm", "http", "css"
];

const TECH_TO_FILE = {
  "Symfony": "symfony", "Laravel": "laravel", "PHP": "php",
  "React": "react", "JavaScript": "javascript", "TypeScript": "typescript",
  "Node.js": "nodejs", "MySQL": "mysql", "Doctrine": "doctrine",
  "C#": "csharp", "Axios": "axios", "Docker": "docker",
  "Git": "git", "Composer": "composer", "Vite": "vite",
  "npm": "npm", "HTTP": "http", "CSS": "css"
};

async function loadAllDB() {
  if (errorsDB.length > 0) return;
  const all = await Promise.all(
    ERROR_FILES.map(name =>
      fetch(chrome.runtime.getURL(`errors/${name}.json`)).then(r => r.json())
    )
  );
  errorsDB = all.flat();
}

async function loadTechDB(tech) {
  const file = TECH_TO_FILE[tech];
  if (!file) return await loadAllDB();
  const res = await fetch(chrome.runtime.getURL(`errors/${file}.json`));
  errorsDB = await res.json();
}

function techToBadgeClass(tech) {
  const map = {
    "Symfony": "badge-symfony", "Laravel": "badge-laravel",
    "React": "badge-react", "JavaScript": "badge-js",
    "PHP": "badge-php", "Node.js": "badge-node",
    "MySQL": "badge-mysql", "TypeScript": "badge-typescript",
    "HTTP": "badge-http", "Doctrine": "badge-doctrine",
    "Git": "badge-git", "Composer": "badge-composer",
    "Vite": "badge-vite", "CSS": "badge-css", "npm": "badge-npm",
    "C#": "badge-csharp", "Axios": "badge-axios", "Docker": "badge-docker"
  };
  return map[tech] || "badge-default";
}

function renderCodeInText(text) {
  return text.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function normalizeInput(input) {
  return input
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatches(input) {
  const cleaned = normalizeInput(input);
  const normalized = cleaned.toLowerCase();
  return errorsDB.filter(entry => {
    try {
      return new RegExp(entry.pattern, "is").test(cleaned);
    } catch {
      return normalized.includes(entry.pattern.toLowerCase());
    }
  });
}

function renderResults(matches) {
  const area = document.getElementById("resultArea");

  if (matches.length === 0) {
    area.innerHTML = `
      <div class="no-match">
        <strong>❌ Aucune correspondance trouvée</strong>
        Cette erreur n'est pas encore dans la base.<br>
        Copie le message clé (sans les chemins de fichiers) et réessaie,
        ou ajoute-la dans le fichier JSON de la tech concernée.
      </div>`;
    return;
  }

  const countLabel = matches.length > 1
    ? `<div class="matches-count">${matches.length} correspondances trouvées</div>`
    : "";

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

async function analyze() {
  const input = document.getElementById("errorInput").value.trim();
  if (!input) return;

  const btn = document.getElementById("btnAnalyze");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Analyse…';

  if (errorsDB.length === 0) await loadAllDB();

  renderResults(findMatches(input));

  btn.disabled = false;
  btn.textContent = "Analyser";
}

document.getElementById("btnAnalyze").addEventListener("click", analyze);

document.getElementById("btnClear").addEventListener("click", () => {
  document.getElementById("errorInput").value = "";
  document.getElementById("resultArea").innerHTML = `
    <div class="result-empty">
      <span>🛠️</span>
      Colle une erreur et clique sur Analyser
    </div>`;
  errorsDB = [];
});

document.getElementById("errorInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const session = await chrome.storage.session.get("pendingError");

  // Priorité 1 : clic droit sur sélection
  if (session.pendingError) {
    document.getElementById("errorInput").value = session.pendingError;
    chrome.storage.session.remove("pendingError");
    await loadAllDB();
    renderResults(findMatches(session.pendingError));
    return;
  }

  if (!tab?.id) return;

  // Priorité 2 : scan de la page au clic sur l'extension
  chrome.tabs.sendMessage(tab.id, { action: "scanPage" }, async (res) => {
    if (chrome.runtime.lastError || !res) {
      // Priorité 3 : texte sélectionné
      chrome.tabs.sendMessage(tab.id, { action: "getSelection" }, async (sel) => {
        if (chrome.runtime.lastError || !sel?.text) return;
        document.getElementById("errorInput").value = sel.text;
        await loadAllDB();
        renderResults(findMatches(sel.text));
      });
      return;
    }

    // Page d'erreur détectée
    document.getElementById("errorInput").value = res.message;
    await loadTechDB(res.tech);
    renderResults(findMatches(res.message));
  });
}

init();
