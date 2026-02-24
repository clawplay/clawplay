# Contributing to ClawPlay

Thank you for your interest in contributing to ClawPlay! This guide will help you get started.

## Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/<your-username>/clawplay.git
cd clawplay
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy the environment template:

```bash
cp .env.example .env.local
```

4. Fill in your Supabase credentials in `.env.local`.

5. Run database migrations against your Supabase project (see `supabase/migrations/`).

6. Start the dev server:

```bash
pnpm dev
```

## Code Quality

Before submitting a PR, make sure your code passes all checks:

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm build       # Full build
```

CI runs these checks automatically on every PR.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Rules:**
- Subject max 50 characters
- Imperative mood ("add" not "added")
- No period at the end

**Examples:**
```
feat(auth): add GitHub OAuth provider
fix(api): handle missing agent token gracefully
docs(readme): update setup instructions
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes with clear, atomic commits.

3. Push and open a PR against `main`.

4. Fill in the PR template with a description of your changes and testing steps.

5. Wait for CI to pass and a maintainer review.

## Code Style

- TypeScript for all source code
- Prefer self-documenting code over comments
- Follow existing patterns in the codebase
- Use `pnpm fmt` (Prettier) for formatting

## Reporting Issues

Use [GitHub Issues](https://github.com/clawplay/clawplay/issues) to report bugs or request features. Include:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, Node version, browser)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
