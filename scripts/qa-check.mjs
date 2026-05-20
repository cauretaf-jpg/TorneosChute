import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const problems = [];

function check(condition, message) {
  if (!condition) problems.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

check(exists('index.html'), 'Falta index.html');
check(exists('src/main.jsx'), 'Falta src/main.jsx');
check(exists('src/styles.css'), 'Falta src/styles.css');
check(exists('public/favicon.svg'), 'Falta public/favicon.svg');
check(exists('.npmrc'), 'Falta .npmrc');

const assetPaths = [...source.matchAll(/"(\/[^"]+\.(?:png|svg))"/g)].map((match) => match[1]);
const missingAssets = assetPaths.filter((assetPath) => !exists(path.join('public', assetPath.replace(/^\//, ''))));
check(missingAssets.length === 0, `Faltan assets: ${missingAssets.slice(0, 8).join(', ')}`);

const teamsMatch = source.match(/const TEAMS = (\[[\s\S]*?\n\]);\n\nconst PLAYER_PHOTOS/);
check(Boolean(teamsMatch), 'No se pudo leer TEAMS desde src/main.jsx');
if (teamsMatch) {
  const TEAMS = eval(teamsMatch[1]);
  check(TEAMS.length === 6, `Se esperaban 6 equipos oficiales; se encontraron ${TEAMS.length}`);
  const totalPlayers = TEAMS.reduce((sum, team) => sum + team.players.length, 0);
  check(totalPlayers === 85, `Se esperaban 85 jugadores oficiales; se encontraron ${totalPlayers}`);
  for (const team of TEAMS) {
    check(Boolean(team.logo), `Equipo sin logo: ${team.name}`);
    check(exists(path.join('public', team.logo.replace(/^\//, ''))), `Logo inexistente para ${team.name}: ${team.logo}`);
  }
}


if (problems.length) {
  console.error('QA detectó problemas:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`QA OK · ${assetPaths.length} assets verificados · estructura lista para build.`);
