# staff-app-clean Backend

This directory contains the TypeScript/Express backend scaffold for the **staff-app-clean** finance and loan platform.

## Prerequisites

- Node.js 22+
- npm 10+

## Installation

```bash
npm install
```

> Run the command from the repository root to install dependencies declared in `server/package.json`.

## Development

```bash
npm run dev
```

The development server uses [`tsx`](https://github.com/esbuild-kit/tsx) to run `server/src/index.ts` with hot reloading.

## Production Build

```bash
npm run build
```

The build script compiles the TypeScript sources into JavaScript emitted in `server/dist`.

## Start

```bash
npm start
```

Runs the application without watch mode. The server listens on `process.env.PORT` or falls back to `5000`.

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed before running the server.
