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
