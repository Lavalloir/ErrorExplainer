# Error Explainer 🔍

Extension Chrome qui explique les messages d'erreur en langage simple — sans donner la solution toute faite. L'objectif : apprendre à déboguer soi-même plutôt que copier-coller une réponse.

## Technologies couvertes

PHP · Symfony · Laravel · React · JavaScript · TypeScript · Node.js · MySQL · Doctrine · C# · Axios · Docker · Git · Composer · Vite · npm · HTTP · CSS

Plus de 400 patterns d'erreurs au total.

## Installation

1. Télécharge ou clone ce repo
2. Ouvre Chrome → `chrome://extensions/`
3. Active le **mode développeur** (en haut à droite)
4. Clique **"Charger l'extension non empaquetée"**
5. Sélectionne le dossier du repo

## Utilisation

- **Manuellement** : colle ton erreur dans le popup → Analyser
- **Filtre par tech** : sélectionne une technologie pour une recherche plus rapide
- **Clic droit** : sélectionne du texte sur n'importe quelle page → "Expliquer cette erreur"

## Contribuer

La base d'erreurs est dans le dossier `errors/`, un fichier JSON par technologie.

Pour ajouter une erreur, ouvre le fichier de la tech concernée et ajoute une entrée :

```json
{
  "id": "SYM-71",
  "tech": "Symfony",
  "pattern": "mot clé distinctif de l'erreur",
  "explication": "Ce que ça veut dire en clair.",
  "conseil": "Une piste pour résoudre, pas la solution complète."
}
```

Le `pattern` supporte les regex. Gardez-le court et distinctif, sans chemins de fichiers ni valeurs spécifiques.

Les mises à jour de la base sont récupérées automatiquement depuis GitHub — pas besoin de réinstaller l'extension.

## Philosophie

Error Explainer ne donne jamais le code corrigé. Il explique le mécanisme de l'erreur et donne une piste de réflexion, pour que le débogage reste un exercice formateur.
