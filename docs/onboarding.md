# Intégrer un projet

## 1. Fichiers à ajouter

1. Copier `templates/callers/ci-<stack>.yml` dans `.github/workflows/ci.yml` du projet.
2. Renseigner `dockerfile` si le projet construit une image. Laisser `fail-on: none` pour commencer.
3. Copier `templates/dependabot/<écosystème>.yml` dans `.github/dependabot.yml`.

## 2. Scan d'onboarding

1. Actions → CI → Run workflow (branche par défaut). Le job `secrets` scanne tout l'historique.
2. Pour chaque secret trouvé : **révoquer et remplacer d'abord**. Un secret présent dans l'historique est compromis, même supprimé depuis.
3. Une fois tous les secrets révoqués, figer l'existant en baseline :

```bash
gitleaks git --no-banner -f json -r .gitleaks-baseline.json .
git add .gitleaks-baseline.json && git commit -m "chore: baseline gitleaks"
```

Seuls les nouveaux secrets bloqueront ensuite.

## 3. Passage en bloquant

| Étape | `fail-on` | Condition |
|---|---|---|
| Rapport | `none` | Onboarding, mesure du bruit. |
| Bloquant critique | `critical` | Plus aucun CRITICAL corrigeable, ou exceptions documentées. |
| Bloquant élevé | `high` | Cible. |

Exceptions dans `.trivyignore.yaml`, avec justification, ticket et date d'expiration :

```yaml
vulnerabilities:
  - id: CVE-2024-00000
    statement: "Code vulnerable non atteignable - ticket SEC-123"
    expired_at: 2027-01-31
```

## 4. Ruleset du projet

Sur la branche par défaut : pull request obligatoire, checks requis `ci / secrets`, `ci / sca-dependencies` et `ci / sca-image` si applicable, force-push interdit.

Sur une organisation en plan Free, les rulesets ne s'appliquent qu'aux dépôts publics.
