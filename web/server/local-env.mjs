import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Node entry points only; Workers receive configuration through bindings.
export function loadLocalEnv() {
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.env');
  try { process.loadEnvFile(file); } catch(error) { if(error.code!=='ENOENT')throw error; }
}
