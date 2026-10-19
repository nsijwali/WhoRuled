import { readFileSync, writeFileSync } from 'node:fs';
import mapshaper from 'mapshaper';
const raw: unknown = JSON.parse(readFileSync('data/borders-gpl/world_1492.geojson', 'utf8'));
const out = await mapshaper.applyCommands(
  '-i in.json -clip bbox=-180,-85.0511,180,85.0511 -simplify visvalingam 20% keep-shapes -o out.json format=geojson',
  { 'in.json': raw },
);
const o = out['out.json'];
writeFileSync('spike/data/lonlat.geojson', typeof o === 'string' ? o : Buffer.from(o as Uint8Array));
console.log('lonlat bytes', readFileSync('spike/data/lonlat.geojson').length);
