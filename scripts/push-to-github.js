/**
 * Script de Deploy Direto para o GitHub via API REST
 * Permite subir o projeto para o GitHub sem precisar de Git CLI instalado.
 * 
 * Uso:
 *   node scripts/push-to-github.js --repo=usuario/repositorio --token=ghp_xxxx
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v;
  return acc;
}, {});

const REPO = args.repo || process.env.GITHUB_REPO;
const TOKEN = args.token || process.env.GITHUB_TOKEN;
const BRANCH = args.branch || 'main';

if (!REPO || !TOKEN) {
  console.log(`
Uso do script:
  node scripts/push-to-github.js --repo="usuario/nome-do-repo" --token="seu_token_aqui"

Argumentos opcionais:
  --branch="main" (padrao: main)
  --message="Deploy inicial completo: Portfólio + Painel Admin"
`);
  process.exit(1);
}

const IGNORE_LIST = [
  'node_modules',
  '.git',
  '.vercel',
  '.agents',
  '.gemini',
  '.claude',
  '.playwright-cli',
  '.taste-skill',
  'skills-lock.json',
  'package-lock.json',
  'REDESIGN_V2_SUMMARY.md',
  'scripts',
  '.DS_Store',
  'Thumbs.db'
];

function getAllFiles(dir, baseDir = dir) {
  let list = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (IGNORE_LIST.includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      list = list.concat(getAllFiles(full, baseDir));
    } else {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      list.push({ fullPath: full, relPath: rel, size: stat.size });
    }
  }
  return list;
}

async function githubRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${REPO}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Instantes-De-Carly-Deployer',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`GitHub API [${method} ${endpoint}] HTTP ${res.status}: ${data ? data.message : res.statusText}`);
  }
  return data;
}

async function main() {
  console.log(`🚀 Iniciando sincronização com o repositório ${REPO} na branch ${BRANCH}...`);

  // 1. Verificar repositório
  try {
    const repoInfo = await githubRequest('');
    console.log(`✓ Repositório encontrado: ${repoInfo.full_name} (${repoInfo.private ? 'Privado' : 'Público'})`);
  } catch (err) {
    console.error(`✗ Erro ao acessar o repositório: ${err.message}`);
    process.exit(1);
  }

  // 2. Coletar arquivos locais
  const rootDir = path.resolve(__dirname, '..');
  const files = getAllFiles(rootDir);
  console.log(`✓ ${files.length} arquivos locais mapeados para envio.`);

  // 3. Obter commit atual da branch (se existir)
  let parentCommitSha = null;
  let baseTreeSha = null;
  try {
    const refData = await githubRequest(`/git/ref/heads/${BRANCH}`);
    parentCommitSha = refData.object.sha;
    const commitData = await githubRequest(`/git/commits/${parentCommitSha}`);
    baseTreeSha = commitData.tree.sha;
    console.log(`✓ Branch ${BRANCH} existente encontrada (Commit: ${parentCommitSha.slice(0, 7)})`);
  } catch (e) {
    console.log(`ℹ Branch ${BRANCH} ainda não existe ou repositório vazio.`);
    console.log(`ℹ Inicializando repositório com README.md inicial...`);
    const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    const initRes = await fetch(`https://api.github.com/repos/${REPO}/contents/README.md`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Instantes-De-Carly-Deployer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Initial commit (Setup)',
        content: Buffer.from(readmeContent).toString('base64'),
        branch: BRANCH
      })
    });
    if (initRes.ok) {
      const initData = await initRes.json();
      parentCommitSha = initData.commit.sha;
      console.log(`✓ Repositório inicializado com sucesso (Commit inicial: ${parentCommitSha.slice(0, 7)})`);
    } else {
      const errJson = await initRes.json().catch(() => ({}));
      console.log(`ℹ Nota na inicialização: ${errJson.message || initRes.statusText}`);
    }
  }

  // 4. Criar blobs em lote com concorrência
  console.log(`📦 Enviando arquivos para o GitHub...`);
  const treeItems = [];
  let processed = 0;
  const CONCURRENCY = 6;
  const queue = [...files];

  async function uploadWorker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const contentBuffer = fs.readFileSync(file.fullPath);
      const isText = !/\.(jpg|jpeg|png|webp|gif|pdf|ico|woff|woff2|ttf|eot)$/i.test(file.relPath);

      let blob;
      if (isText) {
        blob = await githubRequest('/git/blobs', 'POST', {
          content: contentBuffer.toString('utf8'),
          encoding: 'utf-8'
        });
      } else {
        blob = await githubRequest('/git/blobs', 'POST', {
          content: contentBuffer.toString('base64'),
          encoding: 'base64'
        });
      }

      treeItems.push({
        path: file.relPath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });

      processed++;
      if (processed % 10 === 0 || processed === files.length) {
        process.stdout.write(`  [${processed}/${files.length}] arquivos enviados com sucesso...\r`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => uploadWorker());
  await Promise.all(workers);
  console.log(`\n✓ Todos os ${files.length} arquivos enviados como blobs com sucesso!`);

  // 5. Criar nova árvore
  console.log(`🌳 Montando estrutura de pastas (tree)...`);
  const treeBody = { tree: treeItems };
  const newTree = await githubRequest('/git/trees', 'POST', treeBody);
  console.log(`✓ Árvore criada: ${newTree.sha.slice(0, 7)}`);

  // 6. Criar commit
  const commitMsg = args.message || 'Deploy inicial completo: Portfólio + Painel Admin';
  console.log(`📝 Criando commit: "${commitMsg}"...`);
  const commitPayload = {
    message: commitMsg,
    tree: newTree.sha,
    parents: parentCommitSha ? [parentCommitSha] : []
  };
  const newCommit = await githubRequest('/git/commits', 'POST', commitPayload);
  console.log(`✓ Commit registrado: ${newCommit.sha.slice(0, 7)}`);

  // 7. Atualizar ou criar ref da branch
  console.log(`🔗 Atualizando branch ${BRANCH}...`);
  if (parentCommitSha) {
    await githubRequest(`/git/refs/heads/${BRANCH}`, 'PATCH', {
      sha: newCommit.sha,
      force: true
    });
  } else {
    // Criar ref se for primeira vez
    const createRefRes = await fetch(`https://api.github.com/repos/${REPO}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Instantes-De-Carly-Deployer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${BRANCH}`,
        sha: newCommit.sha
      })
    });
    if (!createRefRes.ok) {
      const errData = await createRefRes.json();
      throw new Error(`Falha ao criar branch ${BRANCH}: ${errData.message}`);
    }
  }

  console.log(`\n🎉 SUCESSO TOTAL! O projeto está 100% publicado no GitHub:`);
  console.log(`👉 https://github.com/${REPO}/tree/${BRANCH}`);
  console.log(`Agora basta conectar o repositório na Vercel para colocar no ar!\n`);
}

main().catch(err => {
  console.error('\n✗ Erro no deploy:', err.message);
  process.exit(1);
});

