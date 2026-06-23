let errorsDB = [];

const GITHUB_BASE = "https://raw.githubusercontent.com/Lavalloir/ErrorExplainer/main/errors";

const ERROR_FILES = [
  "php", "symfony", "laravel", "react", "javascript", "typescript",
  "nodejs", "mysql", "doctrine", "csharp", "axios", "docker",
  "git", "composerphp", "vite", "npm", "http", "css"
];

const TECH_TO_FILE = {
  "Symfony": "symfony", "Laravel": "laravel", "PHP": "php",
  "React": "react", "JavaScript": "javascript", "TypeScript": "typescript",
  "Node.js": "nodejs", "MySQL": "mysql", "Doctrine": "doctrine",
  "C#": "csharp", "Axios": "axios", "Docker": "docker",
  "Git": "git", "Composer": "composerphp", "Vite": "vite",
  "npm": "npm", "HTTP": "http", "CSS": "css"
};

async function fetchJSON(url, fallbackUrl) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch {
    const res = await fetch(fallbackUrl);
    return await res.json();
  }
}

async function loadAllDB() {
  if (errorsDB.length > 0) return;
  const all = await Promise.all(
    ERROR_FILES.map(name => fetchJSON(
      `${GITHUB_BASE}/${name}.json`,
      chrome.runtime.getURL(`errors/${name}.json`)
    ))
  );
  errorsDB = all.flat();
}

async function loadTechDB(file) {
  errorsDB = await fetchJSON(
    `${GITHUB_BASE}/${file}.json`,
    chrome.runtime.getURL(`errors/${file}.json`)
  );
}

function getSelectedTech() {
  return document.getElementById("techSelect").value;
}

function setSelectedTech(techName) {
  const file = TECH_TO_FILE[techName];
  if (file) document.getElementById("techSelect").value = file;
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
        Essaie sans filtre de tech, ou ajoute-la dans le JSON correspondant.
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

  const selectedFile = getSelectedTech();

  // Charge uniquement la tech sélectionnée ou tout si vide
  if (selectedFile) {
    await loadTechDB(selectedFile);
  } else {
    await loadAllDB();
  }

  renderResults(findMatches(input));

  btn.disabled = false;
  btn.textContent = "Analyser";
}

// Reset errorsDB quand on change de tech pour forcer le rechargement
document.getElementById("techSelect").addEventListener("change", () => {
  errorsDB = [];
});

document.getElementById("btnAnalyze").addEventListener("click", analyze);

document.getElementById("btnClear").addEventListener("click", () => {
  document.getElementById("errorInput").value = "";
  document.getElementById("resultArea").innerHTML = `
    <div class="result-empty">
      <span>🛠️</span>
      Colle une erreur et clique sur Analyser
    </div>`;
  document.getElementById("techSelect").value = "";
  document.getElementById("autoDetectedBanner").classList.remove("visible");
  errorsDB = [];
});

document.getElementById("errorInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
});

function showAutoDetectedBanner(tech) {
  const banner = document.getElementById("autoDetectedBanner");
  document.getElementById("autoDetectedLabel").textContent = `⚡ Page ${tech} détectée automatiquement`;
  banner.classList.add("visible");
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const session = await chrome.storage.session.get("pendingError");

  // Priorité 1 : clic droit
  if (session.pendingError) {
    document.getElementById("errorInput").value = session.pendingError;
    chrome.storage.session.remove("pendingError");
    await loadAllDB();
    renderResults(findMatches(session.pendingError));
    return;
  }

  if (!tab?.id) return;

  // Priorité 2 : scan automatique de la page
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

    // Page d'erreur détectée → pré-sélectionne la tech + banner
    document.getElementById("errorInput").value = res.message;
    setSelectedTech(res.tech);
    showAutoDetectedBanner(res.tech);
    await loadTechDB(TECH_TO_FILE[res.tech]);
    renderResults(findMatches(res.message));
  });
}

init();
