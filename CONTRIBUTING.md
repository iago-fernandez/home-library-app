# Contributing

Thank you for your interest in improving the Home Library App. This repository strictly adheres to modern frontend engineering standards, prioritizing robust typing, component reusability, and architectural cleanliness.

## Engineering Standards

To maintain a highly optimized frontend architecture, all contributions must adhere to the following:

* **TypeScript strictness:** All new variables, function parameters, and component props must be strictly typed. The use of `any` is prohibited. Interface definitions should reside in `src/lib/types`.
* **Component Modularity:** Svelte components must be strictly scoped and encapsulate their own logic and CSS. Do not bleed CSS into global scopes unless establishing base layout variables in `app.css`.
* **State Management:** All complex or shared application states (e.g., authentication, library selection) must be handled via Svelte Stores (`src/lib/stores`), not passed extensively via prop-drilling.
* **i18n Compatibility:** Hardcoded strings in the UI are strictly prohibited. All user-facing text must be defined within the localized dictionaries (`src/lib/i18n/en.ts` and `es.ts`) and injected via the `$t` store.

## Development Workflow

1. **Fork and Clone** the repository.
2. **Branching Strategy:**
   * `feat/`: New Svelte components, UI flows, or API integrations.
   * `fix/`: Resolution of layout shifts, reactivity bugs, or routing issues.
   * `refactor/`: Component optimization, CSS cleanup, or typing enhancements.
   * `docs/`: Content updates to technical documentation or User Guides.
3. **Validation:** Ensure the project passes all checks and compilation steps before pushing code.
   ```bash
   npm run check
   npm run build
   ```

## Commit Guidelines

We use **Conventional Commits** to maintain a clean, semantic, and easily traceable history:

* `feat(ui): implement batch editing grid for book selection`
* `fix(auth): resolve JWT expiration infinite loop`
* `refactor(components): extract auto-expanding textarea into isolated component`
* `chore(config): update Nginx routing policy`

## Pull Request Process

* Provide a clear, bulleted description of the modifications using the infinitive tense.
* Ensure your changes do not introduce new warnings in the browser console.
* Squash intermediate commits to keep the repository history linear and atomic.
