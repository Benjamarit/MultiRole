# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Competition workflow data

This repository is a frontend-only prototype. Groups, team assignments, evaluations, and account data are stored in browser `localStorage`; UI authorization checks are not a security boundary. A production backend must enforce project ownership, same-competition relationships, score validation, judge assignment, and evaluation deadlines server-side.

For backend persistence, use competition-owned group rows and a nullable team-to-group foreign key, plus a relational judge-team assignment table with foreign keys and a unique `(judge_id, team_id)` constraint. Before removing the legacy COI table, inspect its foreign keys and existing rows, then migrate or back up only that data and drop only its table; retain teams, members, evaluations, scores, criteria, and competitions. No backend schema or database migration is included in this repository.

Scoring remains a weighted average of normalized criterion scores. The leaderboard averages submitted judges' weighted totals; with the project's shared criteria and weights, this is equivalent to averaging each criterion across submitted judges and then applying the weights. Drafts are excluded.
