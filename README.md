# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


| Objectif                                               | Commande                    | Ce que ça fait                                           |
| ------------------------------------------------------ | --------------------------- | -------------------------------------------------------- |
| Voir sur quelle branche tu es + état des fichiers      | `git status`                | Te dit si tu es sur `main` ou `work`, et ce qui a changé |
| Voir les branches                                      | `git branch`                | Liste toutes les branches, `*` = branche actuelle        |
| Passer sur la branche work (chantier)                  | `git checkout work`         | Bascule sur `work`                                       |
| Passer sur la branche main (stable)                    | `git checkout main`         | Bascule sur `main`                                       |
| Récupérer les changements du GitHub (branche actuelle) | `git pull`                  | Met à jour ton Codespace depuis GitHub                   |
| Voir l’historique des commits (court)                  | `git log --oneline -n 10`   | Affiche les 10 derniers commits                          |
| Voir les différences avant de commit                   | `git diff`                  | Montre ce que tu as modifié                              |
| Ajouter tous les fichiers au commit                    | `git add .`                 | Prépare tout pour le commit                              |
| Commit (sauvegarde)                                    | `git commit -m "message"`   | Enregistre une étape dans l’historique                   |
| Envoyer sur GitHub                                     | `git push`                  | Publie tes commits sur GitHub                            |
| Créer une nouvelle branche chantier                    | `git checkout -b work2`     | Crée et va sur `work2`                                   |
| Mettre de côté temporairement (stash)                  | `git stash`                 | Range tes modifs sans les perdre                         |
| Récupérer ce que tu as stash                           | `git stash pop`             | Remet tes modifs stashées                                |
| Annuler tes modifs locales (dangereux)                 | `git restore .`             | Reviens à la dernière version commit                     |
| Revenir à un état précédent (secours)                  | `git reflog`                | Te montre tout l’historique des actions                  |
| Revenir exactement à un point reflog (secours)         | `git reset --hard HEAD@{1}` | Revient en arrière (⚠️ efface modifs non commit)         |
| Créer un “point version” (tag)                         | `git tag v6.0`              | Met une étiquette sur le commit actuel                   |
| Envoyer les tags sur GitHub                            | `git push --tags`           | Publie tes tags                                          |

| Objectif                 | Commande                         | Ce que ça fait                                |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| Lancer l’app             | `npm install` puis `npm run dev` | Démarre le serveur Vite                       |
| Trouver le lien d’aperçu | (Ports)                          | Onglet **Ports** → `5173` → “Open in Browser” |


## 🔁 Routine de travail (la méthode tranquille)

### 1️⃣ Je travaille
- Je suis sur la branche `work`
```bash
git checkout work


Je modifie le code

Je teste dans Codespaces (npm run dev)

2️⃣ Je sauvegarde mon travail (souvent)
git status
git add .
git commit -m "WIP: amélioration en cours"
git push

3️⃣ Tout fonctionne ? (moment important)

Je décide que c’est “bon”

Je crée une version officielle

git checkout main
git merge work
git tag v6.0
git push
git push --tags

4️⃣ Je repars travailler serein
git checkout work


👉 Résumé :

work = chantier

main = version propre

tag (v6.0, v6.1…) = photo officielle

a chaque demarrage de cospace faire ceci git pull origin main

---

### 🧠 Astuce mentale (la plus importante)
- **Si tu n’as pas fait `git commit`, ce n’est PAS sauvegardé**
- **Si tu as fait `git commit`, tu peux toujours revenir en arrière**

Tu t’en sors très bien, même avec des moments de panique — c’est exactement comme ça qu’on apprend 👌  
Quand tu veux, on fera :
- soit un **schéma visuel simple** (work → main → version)
- soit un **mode “sécurité maximale”** (impossible de tout casser)

test mise a jours