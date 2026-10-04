# Nibiru-ci / ci-templates

CI de sécurité réutilisable et multi-stack : détection de secrets (Gitleaks) et SCA (Trivy) sur les dépendances et les images Docker. Le lint et le SAST arrivent en phase 2.

Un projet intègre la CI avec un seul fichier d'une vingtaine de lignes, sans section à décommenter. Toute la logique vit ici.

## Architecture

```
Projet : .github/workflows/ci.yml        (appelant, ~20 lignes)
   └── Nibiru-ci/ci-templates/.github/workflows/ci.yml@v1   (orchestration, permissions, timeouts)
         ├── job secrets           → actions/gitleaks@v1
         ├── job sca-dependencies  → actions/trivy@v1 (fs)
         └── job sca-image         → actions/trivy@v1 (image, si un Dockerfile est déclaré)
```

| Chemin | Rôle |
|---|---|
| `.github/workflows/ci.yml` | Workflow réutilisable appelé par les projets. Seul point d'entrée. |
| `.github/workflows/workflow-lint.yml` | actionlint et zizmor sur ce dépôt. |
| `actions/gitleaks/` | Installation épinglée de Gitleaks, calcul de la plage de commits, scan, résumé, politique. Embarque la config par défaut. |
| `actions/trivy/` | Installation épinglée de Trivy, cache de la base, build d'image, scan, SARIF, SBOM, résumé, politique. Embarque la config par défaut. |
| `templates/callers/` | Fichiers appelants à copier dans les projets, un par stack. |
| `templates/dependabot/` | Modèles `dependabot.yml` par écosystème. |
| `docs/onboarding.md` | Procédure d'intégration d'un projet. |

## Utilisation

```yaml
name: CI

on:
  push:
    branches: ["**"]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.ref_name != github.event.repository.default_branch }}

jobs:
  ci:
    uses: Nibiru-ci/ci-templates/.github/workflows/ci.yml@v1
    with:
      stack: php
      dockerfile: Dockerfile
      fail-on: high
```

`workflow_dispatch` lance un scan de secrets sur l'historique complet de toutes les branches. C'est le scan d'onboarding.

## Paramètres

| Input | Type | Défaut | Description |
|---|---|---|---|
| `stack` | string | requis | `php`, `node`, `java`, `go` ou `python`. |
| `dockerfile` | string | `""` | Chemin du Dockerfile. Vide : pas de job `sca-image`. |
| `docker-context` | string | `.` | Contexte de build Docker. |
| `scan-path` | string | `.` | Répertoire analysé par la SCA dépendances (monorepo). |
| `fail-on` | string | `none` | Seuil bloquant SCA : `none`, `low`, `medium`, `high`, `critical`. |
| `ignore-unfixed` | boolean | `true` | Ignore les vulnérabilités sans version corrigée. |
| `sbom` | boolean | `false` | Produit un SBOM CycloneDX en artefact. |
| `secrets-enforce` | boolean | `true` | Bloque si un secret est détecté. |
| `runs-on` | string | `ubuntu-24.04` | Label du runner (Linux X64 uniquement). |

## Checks produits

Noms stables, à utiliser dans les rulesets des projets :

| Check | Contenu |
|---|---|
| `ci / inputs` | Validation des paramètres. |
| `ci / secrets` | Gitleaks. |
| `ci / sca-dependencies` | Trivy sur les lockfiles. |
| `ci / sca-image` | Trivy sur l'image construite localement (vulnérabilités OS et librairies, secrets embarqués). |

Renommer un job casse les rulesets de tous les projets : c'est un changement majeur (`v2`).

## Périmètre du scan de secrets

| Événement | Commits scannés |
|---|---|
| push sur la branche par défaut | `before..after` du push. Premier push ou force-push : tous les ancêtres. |
| push sur une autre branche | Commits de la branche absents de la branche par défaut. Robuste aux force-push et aux runs annulés. |
| `workflow_dispatch` | Historique complet, toutes branches. |
| suppression de branche | Aucun. |

## Personnalisation par projet

Fichiers optionnels à la racine du projet, détectés automatiquement :

| Fichier | Effet |
|---|---|
| `.gitleaks.toml` | Remplace la config Gitleaks par défaut. Garder `[extend] useDefault = true`. |
| `.gitleaksignore` | Empreintes de faux positifs à ignorer. |
| `.gitleaks-baseline.json` | Secrets existants connus (stock), ignorés jusqu'à rotation. |
| `trivy.yaml` | Remplace la config Trivy par défaut. |
| `.trivyignore.yaml` ou `.trivyignore` | Exceptions de vulnérabilités. Toute ligne doit avoir une justification et une date d'expiration. |

## Résultats

Sans GitHub Advanced Security, les SARIF ne peuvent pas alimenter l'onglet Security. Les résultats sont publiés dans le résumé de chaque job et en artefacts (30 jours) : `gitleaks-report`, `sca-dependencies`, `sca-image`.

## Sécurité de ce dépôt

- Les actions tierces sont épinglées par SHA. Gitleaks et Trivy sont installés en binaire, version épinglée, checksum SHA-256 vérifié.
- Aucune action tierce hors `actions/*` (GitHub). Les actions `aquasecurity/trivy-action` et `setup-trivy` ne sont volontairement pas utilisées (compromission CVE-2026-33634).
- `persist-credentials: false` sur tous les checkouts, permissions `contents: read`, timeouts sur tous les jobs.
- Revue obligatoire de `@Nibiru-ci/ci-owners` (CODEOWNERS) sur toute modification.

## Mise à jour des outils

Dependabot met à jour les SHA des actions. Les binaires se mettent à jour à la main :

```bash
V=8.30.1   # nouvelle version Gitleaks
curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${V}/gitleaks_${V}_checksums.txt" | grep linux_x64.tar.gz

V=0.75.0   # nouvelle version Trivy
curl -sSfL "https://github.com/aquasecurity/trivy/releases/download/v${V}/trivy_${V}_checksums.txt" | grep Linux-64bit.tar.gz
```

Reporter la version et le SHA-256 dans `GITLEAKS_VERSION` / `GITLEAKS_SHA256` ou `TRIVY_VERSION` / `TRIVY_SHA256`. Ne jamais adopter une version publiée depuis moins de 7 jours.

## Versionnement et publication

Les projets appellent `@v1`, un tag majeur déplacé à chaque version compatible. `ci.yml` référence les composites en `@v1` : une modification de composite n'est visible qu'après déplacement du tag.

```bash
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
git tag -fa v1 -m "v1 -> v1.1.0" v1.1.0
git push --force origin v1
```

Changement incompatible (input supprimé, job renommé, comportement par défaut modifié) : nouveau tag majeur `v2`.


| `stack` | string | requis | `php`, `node`, `java`, `kotlin`, `go` ou `python`. |
| `lint-enforce` | boolean | `false` | Bloque si un contrôle de lint échoue ou n'est pas configuré. `false` = rapport non bloquant. |
| `lint-command` | string | `""` | Commande de lint du projet. Remplace entièrement les contrôles par défaut. |
| `lint-path` | string | `.` | Répertoire du projet pour le lint (monorepo). |
| `runtime-version` | string | `""` | Version du runtime pour le lint. Vide : node 24, java 21, go du `go.mod`, PHP du runner. |

## Lint

Le lint n'est pas un contrôle de sécurité : il garantit la cohérence du code. Les règles sont celles du projet quand il en a, sinon des défauts sobres. **Les règles de chaque stack doivent être validées avec les leads dev concernés** avant de passer en `lint-enforce: true`.

| Stack | Contrôles par défaut | Prérequis côté projet |
|---|---|---|
| `php` | `php -l` sur chaque fichier, puis `composer install --no-scripts` et `vendor/bin/pint --test` | `laravel/pint` dans `require-dev` |
| `node` | `npm ci --ignore-scripts`, `npm run lint`, `npm run format:check` si le script existe, `tsc --noEmit` si `tsconfig.json` et TypeScript installé | script `lint`, `package-lock.json` (npm uniquement) |
| `python` | `ruff check .` et `ruff format --check .` | aucun |
| `go` | `gofmt -l .` et `golangci-lint run ./...` | `go.mod` |
| `java`, `kotlin` | `spotlessCheck` (Gradle) ou `spotless:check` (Maven) | plugin Spotless déclaré dans le build |

**Règle de configuration :** si le projet fournit sa config (`ruff.toml`, `[tool.ruff]` dans `pyproject.toml`, `.golangci.yml`, `pint.json`, `eslint.config.js`...), c'est elle qui s'applique. Les défauts Nibiru-ci (`actions/lint/defaults/`) ne servent que sans config projet : Ruff et golangci-lint.

**Un outil non configuré n'est pas un succès.** Si le prérequis manque (Pint absent, script `lint` absent, Spotless absent), le contrôle apparaît en « non configuré » : il alerte en mode rapport et fait échouer en mode bloquant.

**`lint-command`** remplace tous les contrôles par défaut. Le projet gère alors lui-même l'installation de ses dépendances :

```yaml
with:
  stack: node
  lint-command: npm ci --ignore-scripts && npm run lint && npm run typecheck
```

C'est aussi la solution pour pnpm, yarn, checkstyle ou detekt.

**Dépôts Composer privés (Laravel Nova)** : passer `COMPOSER_AUTH` en secret.

```yaml
jobs:
  ci:
    uses: Nibiru-ci/ci-templates/.github/workflows/ci.yml@v1
    with:
      stack: php
    secrets:
      COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

Le secret contient `{"http-basic":{"nova.laravel.com":{"username":"...","password":"..."}}}`.

**Limites connues :**
- PHP : le runner fournit PHP 8.3 et Composer. `setup-php` n'est pas utilisé car la politique de l'organisation n'autorise que les actions GitHub. Si `runtime-version` demande une autre version, le contrôle « runtime php » passe en non configuré. L'installation utilise `--ignore-platform-reqs` : le lint n'exécute pas le code, mais une extension manquante n'est pas détectée.
- Java et Kotlin : détection de Spotless par recherche du mot dans les fichiers de build. Non testé en self-test (pas de fixture).
- Pour Node, seuls npm et `package-lock.json` sont gérés par défaut.