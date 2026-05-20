/**
 * Flow Translate - Validador de manifest.json
 * 
 * Script executado na CI para garantir que o manifest.json:
 * 1. É um JSON válido (parseable)
 * 2. Contém todos os campos obrigatórios do Manifest V3
 * 3. Referencia arquivos que realmente existem no projeto
 * 4. Usa permissões válidas da Chrome Extensions API
 * 
 * Passo a passo para identificação da solução:
 * - O Chrome Web Store rejeita extensões com manifest inválido
 * - Validar na CI evita push de código quebrado
 * - Checamos existência de arquivos referenciados para evitar
 *   erros silenciosos em runtime (extensão carrega mas não funciona)
 * 
 * Uso: node scripts/validate-manifest.js
 * Exit code 0 = sucesso, 1 = falha
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname não existe em ES modules, precisamos derivar manualmente
// fileURLToPath() converte a URL do módulo (file:///...) para path do sistema
// dirname() extrai o diretório pai do path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Diretório raiz do projeto (um nível acima de /scripts) */
const ROOT_DIR = resolve(__dirname, '..');

/** Caminho absoluto do manifest.json */
const MANIFEST_PATH = resolve(ROOT_DIR, 'manifest.json');

// ============================================
// CONSTANTES DE VALIDAÇÃO
// ============================================

/** Campos obrigatórios no Manifest V3 */
const REQUIRED_FIELDS = [
  'manifest_version',
  'name',
  'version'
];

/** Permissões válidas da Chrome Extensions API (subset mais comum) */
const VALID_PERMISSIONS = [
  'activeTab', 'alarms', 'background', 'bookmarks', 'browsingData',
  'clipboardRead', 'clipboardWrite', 'contentSettings', 'contextMenus',
  'cookies', 'debugger', 'declarativeContent', 'declarativeNetRequest',
  'declarativeNetRequestFeedback', 'declarativeNetRequestWithHostAccess',
  'desktopCapture', 'downloads', 'enterprise.deviceAttributes',
  'enterprise.hardwarePlatform', 'enterprise.networkingAttributes',
  'enterprise.platformKeys', 'favicon', 'fileBrowserHandler',
  'fileSystemProvider', 'fontSettings', 'gcm', 'geolocation',
  'history', 'identity', 'idle', 'loginState', 'management',
  'nativeMessaging', 'notifications', 'offscreen', 'pageCapture',
  'platformKeys', 'power', 'printerProvider', 'privacy', 'processes',
  'proxy', 'readingList', 'runtime', 'scripting', 'search',
  'sessions', 'sidePanel', 'storage', 'system.cpu', 'system.display',
  'system.memory', 'system.storage', 'tabCapture', 'tabGroups',
  'tabs', 'topSites', 'tts', 'ttsEngine', 'unlimitedStorage',
  'vpnProvider', 'wallpaper', 'webAuthenticationProxy', 'webNavigation',
  'webRequest', 'webRequestAuthProvider'
];

// ============================================
// CONTADORES DE RESULTADO
// ============================================
let errors = 0;
let warnings = 0;

// ============================================
// FUNÇÕES DE LOG
// ============================================

function logError(msg) {
  errors++;
  console.error(`  ❌ ERRO: ${msg}`);
}

function logWarning(msg) {
  warnings++;
  console.warn(`  ⚠️  AVISO: ${msg}`);
}

function logSuccess(msg) {
  console.log(`  ✅ ${msg}`);
}

function logInfo(msg) {
  console.log(`  ℹ️  ${msg}`);
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * 1. Verifica se o arquivo manifest.json existe e é JSON válido.
 * @returns {object|null} O manifest parseado ou null se inválido
 */
function validateJsonParsing() {
  console.log('\n📋 [1/5] Validando sintaxe JSON...');

  if (!existsSync(MANIFEST_PATH)) {
    logError(`manifest.json não encontrado em: ${MANIFEST_PATH}`);
    return null;
  }

  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw);
    logSuccess('manifest.json é um JSON válido');
    return manifest;
  } catch (err) {
    // err.message inclui a posição do erro de parsing (linha/coluna)
    logError(`JSON inválido: ${err.message}`);
    return null;
  }
}

/**
 * 2. Verifica se os campos obrigatórios do Manifest V3 existem.
 * @param {object} manifest - O manifest parseado
 */
function validateRequiredFields(manifest) {
  console.log('\n📋 [2/5] Validando campos obrigatórios...');

  for (const field of REQUIRED_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null) {
      logError(`Campo obrigatório ausente: "${field}"`);
    } else {
      logSuccess(`"${field}": ${JSON.stringify(manifest[field])}`);
    }
  }

  // Valida que manifest_version é exatamente 3
  if (manifest.manifest_version !== 3) {
    logError(`manifest_version deve ser 3, encontrado: ${manifest.manifest_version}`);
  }

  // Valida formato do version (semver simplificado: 1.0.0, 1.2.3, etc.)
  if (manifest.version && !/^\d+(\.\d+){0,3}$/.test(manifest.version)) {
    logError(`"version" com formato inválido: "${manifest.version}" (esperado: X.Y.Z)`);
  }
}

/**
 * 3. Valida as permissões declaradas contra a lista de permissões válidas.
 * @param {object} manifest - O manifest parseado
 */
function validatePermissions(manifest) {
  console.log('\n📋 [3/5] Validando permissões...');

  const permissions = manifest.permissions || [];

  if (permissions.length === 0) {
    logWarning('Nenhuma permissão declarada');
    return;
  }

  for (const perm of permissions) {
    if (VALID_PERMISSIONS.includes(perm)) {
      logSuccess(`Permissão válida: "${perm}"`);
    } else {
      logWarning(`Permissão não reconhecida: "${perm}" (pode ser válida em versões futuras)`);
    }
  }
}

/**
 * 4. Verifica se os arquivos referenciados no manifest existem no disco.
 *    Isso cobre: service_worker, popup, content_scripts (js/css), icons.
 * @param {object} manifest - O manifest parseado
 */
function validateFileReferences(manifest) {
  console.log('\n📋 [4/5] Validando referências de arquivos...');

  const filesToCheck = [];

  // Service Worker (background)
  if (manifest.background?.service_worker) {
    filesToCheck.push({
      path: manifest.background.service_worker,
      label: 'background.service_worker'
    });
  }

  // Popup HTML
  if (manifest.action?.default_popup) {
    filesToCheck.push({
      path: manifest.action.default_popup,
      label: 'action.default_popup'
    });
  }

  // Ícones do action
  if (manifest.action?.default_icon) {
    for (const [size, path] of Object.entries(manifest.action.default_icon)) {
      filesToCheck.push({ path, label: `action.default_icon.${size}` });
    }
  }

  // Ícones gerais
  if (manifest.icons) {
    for (const [size, path] of Object.entries(manifest.icons)) {
      filesToCheck.push({ path, label: `icons.${size}` });
    }
  }

  // Content Scripts (js e css)
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((cs, i) => {
      if (cs.js) {
        cs.js.forEach(path => {
          filesToCheck.push({ path, label: `content_scripts[${i}].js` });
        });
      }
      if (cs.css) {
        cs.css.forEach(path => {
          filesToCheck.push({ path, label: `content_scripts[${i}].css` });
        });
      }
    });
  }

  // Verifica existência de cada arquivo
  // resolve() junta ROOT_DIR + caminho relativo do manifest
  for (const file of filesToCheck) {
    const absPath = resolve(ROOT_DIR, file.path);
    if (existsSync(absPath)) {
      logSuccess(`${file.label}: "${file.path}" encontrado`);
    } else {
      logError(`${file.label}: "${file.path}" NÃO encontrado em ${absPath}`);
    }
  }
}

/**
 * 5. Validações adicionais de boas práticas.
 * @param {object} manifest - O manifest parseado
 */
function validateBestPractices(manifest) {
  console.log('\n📋 [5/5] Validando boas práticas...');

  // Description é recomendada (obrigatória para publicar na Chrome Web Store)
  if (!manifest.description) {
    logWarning('"description" ausente (obrigatório para publicar na Chrome Web Store)');
  } else if (manifest.description.length > 132) {
    logWarning(`"description" com ${manifest.description.length} chars (máx. recomendado: 132)`);
  } else {
    logSuccess(`"description" presente (${manifest.description.length} chars)`);
  }

  // Content Security Policy
  if (manifest.content_security_policy) {
    logSuccess('content_security_policy definida');
  } else {
    logInfo('content_security_policy não definida (Chrome usará a padrão)');
  }

  // Verifica se content_scripts tem matches definido
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((cs, i) => {
      if (!cs.matches || cs.matches.length === 0) {
        logError(`content_scripts[${i}].matches está vazio ou ausente`);
      }
    });
  }
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================

console.log('╔══════════════════════════════════════════╗');
console.log('║   Flow Translate - Manifest Validator    ║');
console.log('╚══════════════════════════════════════════╝');

const manifest = validateJsonParsing();

if (manifest) {
  validateRequiredFields(manifest);
  validatePermissions(manifest);
  validateFileReferences(manifest);
  validateBestPractices(manifest);
}

// ============================================
// RESULTADO FINAL
// ============================================

console.log('\n══════════════════════════════════════════');
console.log(`  Resultado: ${errors} erro(s), ${warnings} aviso(s)`);
console.log('══════════════════════════════════════════\n');

if (errors > 0) {
  console.error('💥 Validação FALHOU! Corrija os erros acima.\n');
  // process.exit(1) encerra o processo com código 1 (falha)
  // O GitHub Actions interpreta exit code != 0 como step falhado
  process.exit(1);
} else {
  console.log('🎉 Validação APROVADA! manifest.json está correto.\n');
  // process.exit(0) indica sucesso (padrão, mas explicitamos por clareza)
  process.exit(0);
}
