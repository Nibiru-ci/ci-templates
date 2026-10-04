# Changelog

## v1.0.0

- Workflow réutilisable `ci.yml` : jobs `inputs`, `secrets`, `sca-dependencies`, `sca-image`.
- Composite `gitleaks` : Gitleaks 8.30.1, scan par plage de commits du push, scan complet sur `workflow_dispatch`, baseline et `.gitleaksignore`, annotations, résumé, mode bloquant ou rapport.
- Composite `trivy` : Trivy 0.75.0, modes `fs` et `image`, seuil `fail-on`, `ignore-unfixed`, cache de la base, SARIF et SBOM CycloneDX en artefacts, détection d'image de base en fin de support.
- Modèle d'appelant PHP et modèle Dependabot Composer.
- Lint des workflows : actionlint 1.7.12 et zizmor 1.30.1.
