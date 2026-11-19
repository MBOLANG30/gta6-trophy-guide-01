// gta6-trophy-guide-01 — the hand-in program (Node 22, standard library only).
//
// The entry is plain static files: app/ holds the guide (index.html, style.css, app.js
// and data/trophies.json — no build step, no network at runtime), and screenshots/
// holds the renders the judge sees. This program copies both trees into the output
// directory and writes dossier.json there, using the vendored make.fun library to
// build the dossier. vendor/makefun-frontend.ts must stay byte-identical to the kit's
// copy: the scorer rebuilds the dossier with its own copy and compares the two.
//
// The grader mounts the output directory, so this program never removes it and
// never removes anything inside it that it did not put there: it only creates the
// directory (mkdir -p style) and copies files into it. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory if needed; never delete it (the grader mounts it).
mkdirSync(outputDir, { recursive: true });

// Copy the guide itself.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// Copy the screenshots the judge reads.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotDir = join(repoRoot, 'screenshots');
if (existsSync(shotDir)) cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

// Write the dossier the judge reads: screenshots, first-load totals, and source.
// The caps mirror the scorer's own limits (at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and 48 MiB; dossier text at most 160 KiB).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
