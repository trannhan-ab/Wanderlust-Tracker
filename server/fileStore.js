// server/fileStore.js
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function sanitizeFilename(filename) {
  if (!/^[a-zA-Z0-9_\-]+\.json$/.test(filename)) {
    throw new Error('Invalid filename');
  }
  return filename;
}

async function readJsonFile(filename, { defaultValue = null } = {}) {
  filename = sanitizeFilename(filename);
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue;
    throw err;
  }
}

async function writeJsonFile(filename, data) {
  filename = sanitizeFilename(filename);
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.tmp-${Date.now()}`;
  const text = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, text, 'utf8');
  await fs.rename(tmpPath, filePath);
}

module.exports = { readJsonFile, writeJsonFile };
