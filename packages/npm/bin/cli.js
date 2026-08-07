#!/usr/bin/env node
// Shim for the publishable `agent-plugin-builder` npm package.
// The bundled CLI only exports `run`, so invoke it explicitly.
import('../dist/index.js').then(({ run }) => run());
