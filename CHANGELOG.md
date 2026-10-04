# Changelog

## v1.1.0

- Nouveau job `lint` et composite `actions/lint` : php (Pint), node (npm run lint), python (Ruff), go (gofmt + golangci-lint), java et kotlin (Spotless).
- Nouveaux inputs de `ci.yml` : `lint-enforce` (défaut `false`), `lint-command`, `lint-path`, `runtime-version`. Nouveau secret optionnel `COMPOSER_AUTH`.
- Stack `kotlin` acceptée (traitée comme `java`).
- Configs par défaut Ruff et golangci-lint ; la config du projet est toujours prioritaire.
- Ruff 0.16.10 et golangci-lint 2.14.0 installés en binaire, checksum SHA-256 vérifié.
- Un outil non configuré compte comme un échec en mode bloquant.
- `self-test.yml` et `tests/fixtures/` : un cas propre et un cas fautif par stack.
- Modèles d'appelants pour node, java, go et python.

## v1.0.0

- Workflow réutilisable `ci.yml` : jobs `inputs`, `secrets`, `sca-dependencies`, `sca-image`.
- Composite `gitleaks` : Gitleaks 8.30.1, scan par plage de commits du push, scan complet sur `workflow_dispatch`, baseline et `.gitleaksignore`, annotations, résumé, mode bloquant ou rapport.
- Composite `trivy` : Trivy 0.75.0, modes `fs` et `image`, seuil `fail-on`, `ignore-unfixed`, cache de la base, SARIF et SBOM CycloneDX en artefacts, détection d'image de base en fin de support.
- Modèle d'appelant PHP et modèle Dependabot Composer.
- Lint des workflows : actionlint 1.7.12 et zizmor 1.30.1.

