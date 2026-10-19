import { rmSync } from 'node:fs';
rmSync('public/data', { recursive: true, force: true });
