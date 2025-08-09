# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Introduce logging utilities for enhanced server monitoring; update README with logging configuration details and usage examples; improve server stats logging for better performance insights ([6486ece])
- Bump version to 0.2.1; expand corpus with additional historical and cultural entries; enhance Markov generation logic to respect max token limits and improve fallback behavior; add tests for max token requirements in completions endpoint ([61606ed])
- Enhance Markov text generation with improved token selection logic and add comprehensive tests for functionality and edge cases ([9e67d3d])

## [v0.2.0] - 2025-08-09

### Added

- Bump version to 0.2.0; add new endpoints for model listing, tokenization, detokenization, and version info; implement Markov chain text generation; enhance README with new features and usage examples ([e8ef356])

### Documentation

- Add JSR badges to README for enhanced visibility of project score and metrics ([a7c1c1a])

### Refactored

- Clean up whitespace and reformat code in multiple files for improved readability; update export order in mod.ts ([7c90ea8])

## [v0.1.1] - 2025-08-09

### Style

- Remove unnecessary whitespace in server.ts for cleaner code ([c4d641e])

### Maintenance

- Bump version to 0.1.1; add startup banner with server details and embedded logo in server.ts ([91ac5f7])

## [v0.1.0] - 2025-08-09

### Added

- Add module exports and publish configuration in deno.json; create mod.ts for API and text generation exports; enhance README with installation instructions and usage examples ([62f47db])
- Implement custom model support via WR_MODEL environment variable and update README with configuration details ([164c5db])
- Add Docker support with multi-stage build, Dockerfile, and .dockerignore; update README with build and run instructions ([8c27e8f])
- Add support for embeddings endpoint and update README with usage examples ([0342b63])
- Enhance Deno vLLM emulator with additional tasks, CI workflow, and comprehensive tests ([1ec136f])
- Add initial implementation of Deno vLLM emulator with server and API endpoints ([b63dcf6])

### Fixed

- Correct import statement formatting in README for better consistency ([42d5bcc])
- **tests**: add linting directive to openai_client_test.ts for improved code quality ([3b6bee4])
- **tests**: rename server variable for clarity and add linting directive ([93a5842])

### Documentation

- Update README to include CI badge and center image for better presentation ([802873f])
- Update README for endpoint details and improve formatting; refactor server code for consistency and readability ([ad19492])

### Other

- Initial commit ([90f26d7])
