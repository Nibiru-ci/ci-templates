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

## 3. Lint

Le lint démarre en mode rapport (`lint-enforce: false`) : le check `ci / lint` reste vert, mais les contrôles en échec ou non configurés apparaissent en alerte et dans le résumé du job.

1. Lire le résumé du premier run. Un contrôle « non configuré » indique un prérequis manquant : Pint dans `require-dev`, script `lint` dans `package.json`, plugin Spotless dans le build.
2. Si le projet a déjà sa commande de lint, la déclarer avec `lint-command` plutôt que de changer le projet.
3. Faire valider les règles par le lead dev de la stack, puis corriger l'existant.
4. Passer `lint-enforce: true` quand le run est vert.

Laravel avec dépôt privé (Nova) : ajouter `secrets: COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}` à l'appel (voir le README).

## 4. Ruleset du projet

Sur la branche par défaut : pull request obligatoire, checks requis `ci / secrets`, `ci / sca-dependencies` et `ci / sca-image` si applicable, force-push interdit.

Sur une organisation en plan Free, les rulesets ne s'appliquent qu'aux dépôts publics.

