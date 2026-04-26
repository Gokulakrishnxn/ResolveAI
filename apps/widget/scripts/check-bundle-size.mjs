#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = 40;
const PATH = join(process.cwd(), 'dist', 'widget.js');

if (!existsSync(PATH)) {
  console.error(`[widget] expected build artifact at ${PATH}`);
  process.exit(1);
}

const buf = readFileSync(PATH);
const gz = gzipSync(buf);
const kb = (gz.length / 1024).toFixed(1);
const raw = (buf.length / 1024).toFixed(1);

if (gz.length > BUDGET_KB * 1024) {
  console.error(
    `[widget] FAIL — widget.js is ${kb}KB gzipped (budget ${BUDGET_KB}KB). Raw: ${raw}KB.`,
  );
  process.exit(2);
}
console.log(`[widget] OK — widget.js is ${kb}KB gzipped (raw ${raw}KB, budget ${BUDGET_KB}KB).`);
