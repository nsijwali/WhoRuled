import * as maplibregl from 'maplibre-gl';
const map = new maplibregl.Map({
  container: 'm',
  style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#fff' } }] },
  center: [0, 20], zoom: 1, renderWorldCopies: false,
});
await new Promise((r) => map.on('load', r));
map.addSource('s', { type: 'geojson', data: 'data/lonlat.geojson' });
map.addLayer({ id: 'f', type: 'fill', source: 's', paint: { 'fill-color': '#d9c9a3' } });
map.addLayer({ id: 'l', type: 'line', source: 's', paint: { 'line-color': '#444', 'line-width': 0.5 } });
(window as any).run = async () => {
  await new Promise((r) => map.once('idle', r));
  const times: number[] = [];
  for (let i = 0; i < 60; i++) {
    const s = performance.now();
    map.jumpTo({ zoom: 1 + (i % 20) / 3, center: [i * 3 - 90, 20] });
    await new Promise((r) => map.once('render', r));
    map.getCanvas().getContext('webgl2')?.finish();
    times.push(performance.now() - s);
  }
  times.sort((a, b) => a - b);
  return { median: times[30]!, p95: times[57]!, max: times[59]! };
};
(window as any).ready = true;
