const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, 'data');

const fileNames = {
  destinations: 'destinations.json',
  users: 'users.json',
  budgets: 'budgets.json'
};

function getFilePath(type) {
  const fileName = fileNames[type];

  if (!fileName) {
    throw new Error(`Unknown data type: ${type}`);
  }

  const dataPath = path.join(dataDirectory, fileName);
  const rootPath = path.join(__dirname, fileName);

  // Prefer the data/ folder shown in the VS Code project structure.
  if (fs.existsSync(dataPath)) return dataPath;
  if (fs.existsSync(rootPath)) return rootPath;

  throw new Error(
    `Cannot find ${fileName}. Expected it in ${dataDirectory} or ${__dirname}.`
  );
}

function readJSON(type) {
  const filePath = getFilePath(type);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(type, data) {
  const filePath = getFilePath(type);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readJSON,
  writeJSON
};