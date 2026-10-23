import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

test('proxy compilado carrega no Node ESM e responde sem URL', async () => {
  const output = await mkdtemp(join(tmpdir(), 'proxy-runtime-'));
  try {
    await writeFile(join(output, 'package.json'), '{"type":"module"}');
    // Sem bundler: preserva os imports relativos, como no runtime do deploy.
    for (const file of ['api/proxy.ts', 'functions/api/proxy.ts']) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
      const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const destination = join(output, file.replace(/\.ts$/, '.js'));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, compiled);
    }
    const { default: handler } = await import(pathToFileURL(join(output, 'api/proxy.js')).href);
    const response = new EventEmitter();
    const headers = new Headers();
    const chunks = [];
    let ended = false;
    response.setHeader = (key, value) => headers.set(key, value);
    response.write = (chunk) => { chunks.push(Buffer.from(chunk)); return true; };
    response.end = () => { ended = true; };
    await handler({ headers: { host: 'localhost' }, url: '/api/proxy', method: 'GET' }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { error: 'URL parameter is required' });
    assert.equal(ended, true);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
