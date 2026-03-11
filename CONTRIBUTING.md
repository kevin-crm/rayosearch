# Contributing to AISearchGen

Thanks for your interest in contributing! Here's everything you need to know.

---

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Run `composer run setup` to install dependencies and set up your environment.
3. Create a branch for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. Make your changes, then open a pull request against `main`.

---

## Development Workflow

```bash
# Start the dev server (Laravel + Vite + queue worker)
composer run dev

# Run tests before opening a PR
composer run test

# Format PHP code
./vendor/bin/pint
```

---

## Pull Request Guidelines

- **One concern per PR.** Keep PRs focused — bug fixes, features, and refactors should be separate.
- **Write a clear description.** Explain what problem your PR solves and how.
- **Add tests** for any new behavior when applicable.
- **Pass all existing tests.** PRs with failing tests will not be merged.
- **Follow existing code style.** Run Pint (`./vendor/bin/pint`) before committing PHP changes.

---

## Reporting Bugs

Open a [GitHub Issue](../../issues/new?template=bug_report.md) and fill in the bug report template. Include:
- Steps to reproduce
- Expected vs. actual behavior
- Your PHP version, OS, and browser (if applicable)

---

## Suggesting Features

Open a [GitHub Issue](../../issues/new?template=feature_request.md) using the feature request template. Describe the problem you're trying to solve, not just the solution.

---

## Security Issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

---

## Code of Conduct

Be respectful and constructive. We welcome contributors of all backgrounds and experience levels.
