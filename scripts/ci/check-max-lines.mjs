import { globby } from 'globby';
import fs from 'fs';

const MAX = 500;
const ALLOW = [/^infra\/migrations\//, /^docs\//]; // allow long SQL or docs

const files = await globby([
  '**/*.{ts,tsx,js,jsx,mjs,cjs,sql,py,go,rs}',
  '!node_modules',
  '!dist',
  '!build',
  '!.next',
  '!coverage'
]);

const offenders = [];

for (const f of files) {
  if (ALLOW.some(rx => rx.test(f))) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n').length;
  if (lines > MAX) offenders.push({ file: f, lines });
}

if (offenders.length) {
  console.error('❌ Files exceed the 500-line cap:\n', offenders);
  process.exit(1);
} else {
  console.log('✅ All files within line cap.');
}