import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const app = fileURLToPath(new URL('../src/app/', import.meta.url));
const normalize = value => value.split(path.sep).join('/');
function inspect(relative, source) {
  const failures = [];
  const layer = relative.split('/')[0];
  const ast = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
  const check = (specifier, node) => {
    const resolved = specifier.startsWith('.') ? normalize(path.relative(app, path.resolve(app, path.dirname(relative), specifier))) : specifier;
    const target = resolved.split('/')[0];
    if (['domain', 'application'].includes(layer)) {
      if (specifier.startsWith('@angular/') || specifier.startsWith('@ngrx/') || ['data', 'core', 'features', 'shared'].includes(target)) failures.push(`${relative} -> ${specifier}`);
      if (layer === 'domain' && target === 'application') failures.push(`${relative} -> ${specifier}`);
    }
    if (target === 'data' && layer !== 'data' && relative !== 'core/di/repository.providers.ts') failures.push(`${relative} -> concrete data adapter ${specifier}`);
    if (layer === 'data' && ['core', 'features', 'application', 'shared'].includes(target)) failures.push(`${relative} -> ${specifier}`);
    if (layer !== 'data' && specifier === '@angular/common/http' && /\b(HttpClient|HttpBackend)\b/.test(node.getText(ast))) failures.push(`${relative} -> HTTP transport outside data`);
  };
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text, node);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) check(node.arguments[0].text, node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return failures;
}

// Check the guard itself without adding another test framework.
assert.equal(inspect('domain/model.ts', "import { Injectable } from '@angular/core';").length, 1);
assert.equal(inspect('application/read.ts', "import { JobRepository } from '../data/job.repository';").length, 2);
assert.equal(inspect('features/jobs/page.ts', "import { JobRepository } from '../../data/job.repository';").length, 1);
assert.equal(inspect('features/jobs/page.ts', "import { JOB_REPOSITORY } from '../../core/di/repository.tokens';").length, 0);
assert.equal(inspect('application/read.ts', "import type { JobRepositoryPort } from '../domain/repositories/job.repository.port';").length, 0);
assert.equal(inspect('core/auth/session.ts', "import { HttpClient } from '@angular/common/http';").length, 1);

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
const sources = files(app).filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'));
const failures = sources.flatMap(file => inspect(normalize(path.relative(app, file)), fs.readFileSync(file, 'utf8')));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Architecture checks passed for ${sources.length} frontend sources.`);
