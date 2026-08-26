import fs from 'node:fs';

const path = 'server.js';
const fallback = 'https://website-html-c6tx.onrender.com';
const publicUrl = String(process.env.PUBLIC_URL || fallback).replace(/\/$/, '');
let src = fs.readFileSync(path, 'utf8');

const pattern = /const PUBLIC_URL\s*=\s*(['"`])[^'"`]+\1\s*;/;
const replacement = `const PUBLIC_URL = ${JSON.stringify(publicUrl)};`;

if (!pattern.test(src)) {
  throw new Error('Could not locate PUBLIC_URL in server.js');
}

src = src.replace(pattern, replacement);
fs.writeFileSync(path, src, 'utf8');
console.log(`[fix-public-url] PUBLIC_URL=${publicUrl}`);
