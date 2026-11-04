import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonical, sha256 } from '../src/canonical.mjs';
import { createLedger, verifyRecords, exportEvidence } from '../src/ledger.mjs';
import { verifyExport } from '../verify.mjs';

export function tempDir(prefix = 'xi-evidence-') { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
export function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
export { assert, fs, path, canonical, sha256, createLedger, verifyRecords, exportEvidence, verifyExport };