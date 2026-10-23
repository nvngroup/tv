import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSync } from 'esbuild';

let armazenado = null;
let bloqueado = false;
globalThis.localStorage = {
  getItem() { if (bloqueado) throw new Error('Armazenamento indisponível'); return armazenado; },
};
const bundle = buildSync({
  entryPoints: ['src/services/reproducao.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
}).outputFiles[0].text;
const { lerReproducao, restrita } = await import(`data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`);
const filme = { id: 'filme-1', name: 'Filme', url: 'https://exemplo.test/filme.mp4', type: 'movie', category: 'Filmes' };
const base = { tipo: 'filme', filme, serie: null, tempo: 80, duracao: 200, pausado: true, quando: 1 };

test('recupera o filme e o tempo sem depender do catálogo estar disponível', () => {
  armazenado = JSON.stringify(base);
  assert.deepEqual(lerReproducao(), base);
});

test('preserva temporada, episódio e lista para avançar depois de recarregar', () => {
  const episodio = { ...filme, type: 'series', seriesName: 'Série', seasonNumber: 2, episodeNumber: 3 };
  const dado = { ...base, filme: episodio, serie: { currentSeason: 2, currentEpisode: 3, episodes: [episodio], totalEpisodes: 1, seriesName: 'Série' } };
  armazenado = JSON.stringify(dado);
  assert.deepEqual(lerReproducao(), dado);
});

test('recupera o canal com suas fontes e metadados de reprodução', () => {
  const canal = { id: 'canal-1', name: 'Canal', url: 'https://exemplo.test/live.m3u8', sources: [{ url: 'https://exemplo.test/live.m3u8', referer: 'https://exemplo.test/' }] };
  const dado = { tipo: 'canal', canal, tempo: 0, duracao: 0, pausado: false, quando: 2 };
  armazenado = JSON.stringify(dado);
  assert.deepEqual(lerReproducao(), dado);
});

test('não oferece retomada de filme praticamente concluído', () => {
  armazenado = JSON.stringify({ ...base, tempo: 195 });
  assert.equal(lerReproducao(), null);
});

test('ignora registros quebrados ou sem identificação do conteúdo', () => {
  for (const dado of ['{', 'null', '{}', JSON.stringify({ ...base, tempo: -1 }), JSON.stringify({ ...base, filme: {} })]) {
    armazenado = dado;
    assert.equal(lerReproducao(), null);
  }
});

test('armazenamento bloqueado não impede o site de abrir', () => {
  bloqueado = true;
  try { assert.equal(lerReproducao(), null); } finally { bloqueado = false; }
});

test('conteúdo restrito continua identificado para respeitar o desbloqueio existente', () => {
  assert.equal(restrita({ ...base, filme: { ...filme, category: 'Adulto' } }), true);
  assert.equal(restrita({ ...base, tipo: 'canal', canal: { id: 'restrito-canal', name: 'Canal', url: 'https://exemplo.test/' } }), true);
  assert.equal(restrita(base), false);
});
