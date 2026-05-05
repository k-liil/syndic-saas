# Checklist avant commit / merge sur main

## 1. Monter la version dans `package.json`

| Type de changement | Exemple | Incrément |
|--------------------|---------|-----------|
| Correctif (bug fix) | fix: corriger erreur de calcul | `0.1.2` → `0.1.3` (patch) |
| Nouvelle fonctionnalité | feat: ajouter module réclamations | `0.1.2` → `0.2.0` (minor) |
| Refonte / breaking change | refactor: nouvelle sidebar, nouveau design | `0.1.x` → `0.2.0` (minor) |

```json
// package.json
"version": "0.X.Y"
```

## 2. Vérifications techniques

- [ ] `pnpm tsc --noEmit` → 0 erreur TypeScript
- [ ] `pnpm lint` (ou `npx eslint src/...`) → 0 erreur ESLint
- [ ] `pnpm build` passe sans erreur (optionnel en local, Railway le fait)

## 3. Commits et branches

- [ ] Travailler sur une branche `feat/...`, `fix/...` ou `chore/...` (jamais directement sur `main`)
- [ ] Message de commit clair : `type(scope): description courte`
  - Exemples : `feat(sidebar): nouveau design V2`, `fix(cotisations): correction calcul surface`
- [ ] La version a été incrémentée dans `package.json` **avant** le commit final

## 4. Merge sur main

- [ ] Ouvrir une PR sur GitHub (`gh pr create` ou via l'interface)
- [ ] Vérifier que le build Railway de la branche passe (si branch deploy activé)
- [ ] Merger la PR → Railway déclenche le déploiement automatiquement sur `main`
- [ ] Vérifier le déploiement Railway (2-3 min après le merge)

## 5. Après le merge

- [ ] Tirer `main` en local : `git checkout main && git pull`
- [ ] Supprimer la branche locale si elle n'est plus utile : `git branch -d feat/...`

---

## Historique des versions

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | — | MVP initial |
| 0.1.1 | — | Correctifs divers |
| 0.1.2 | 2026-04-xx | Nouveau design landing page |
| 0.1.3 | 2026-05-05 | Sidebar V2 : switcher résidence, recherche ⌘K, carte utilisateur |
