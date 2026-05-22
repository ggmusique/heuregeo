# Mobile Lab

# Status
✅ Active

## Objectif

Le Mobile Lab est un environnement DEV only pour tester l'UX mobile de heuregeo sans remplacer Playwright, Vitest ou la QA E2E existante.

Il sert a valider rapidement :

- navbar mobile
- futur drawer hamburger
- banque d'heures
- modals bottom sheet
- safe-area iPhone et Android
- gestures tactiles
- thumb reach
- animations et glass blur

## Route

Le lab est disponible uniquement en developpement :

```txt
/mobile-lab
/mobile-lab/navbar
/mobile-lab/drawer
/mobile-lab/modals
/mobile-lab/banque-heures
```

La route est gardee par `import.meta.env.DEV`. En build production, elle ne devient pas une route publique et ne remplace pas l'application reelle.

## Lancer

```bash
npm run dev:mobile-lab
```

Puis ouvrir :

```txt
http://localhost:5173/mobile-lab
```

Pour tester sur un emulateur ou un telephone du reseau local, utiliser l'URL reseau affichee par Vite :

```txt
http://<ip-locale>:5173/mobile-lab
```

## MiniSim

MiniSim est une app desktop qui lance et gere les simulateurs iOS et Android. Elle n'est pas une dependance React/Vite et ne doit pas etre importee dans l'app.

Workflow recommande :

1. Installer MiniSim depuis le site officiel : https://www.minisim.app/
2. Lancer un simulateur iPhone ou Android avec MiniSim.
3. Demarrer heuregeo avec `npm run dev:mobile-lab`.
4. Ouvrir l'URL locale ou reseau dans le navigateur du simulateur.
5. Tester les routes `/mobile-lab/*`.

## Compatibilite QA

Le Mobile Lab est complementaire a Playwright :

- Playwright reste la reference E2E automatisee.
- Vitest reste la reference unit/integration.
- Le Mobile Lab sert aux observations visuelles, gestures et micro-interactions.
- Aucune assertion Playwright existante n'est remplacee.

## Scenarios UX interessants

- Comparer `iPhone 15`, `iPhone SE`, `Pixel 8` et `Galaxy S24`.
- Basculer les themes `neon`, `oled`, `emerald`, `arctic`.
- Activer `Thumb reach` et verifier les CTA atteignables.
- Tester le swipe gauche/droite du drawer.
- Ouvrir les modals et verifier overlay, blur, fermeture tactile et safe-area.
- Verifier la lisibilite de la banque d'heures avec la navbar visible.
