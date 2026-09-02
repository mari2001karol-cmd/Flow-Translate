# Incidente: Falha de Lint no CI/CD

```
COM ESSE ARQUIVO SELECIONADO APERTE AS TECLAS CTRL+SHFIT+V PARA ABRIR O MODO LEITURA DE ARQUITOS .MD
```

- **Data:** 2026-05-23
- **Severidade:** Média — bloqueou o pipeline de CI/CD
- **Status:** Resolvido

---

## Contexto

O job `lint` do GitHub Actions falhou com **11 erros** distribuídos em 3 arquivos ao executar `npm run lint` (`eslint . --max-warnings 0`).

---

## Erros Encontrados

### 1. `background/popup/popup/settings.js` — `no-undef` (6 erros)

```
Error: 'document' is not defined  no-undef  (linhas 1, 2, 3, 4, 6)
```

**Causa:** O arquivo `settings.js` foi acidentalmente criado dentro de `background/popup/popup/`. O glob `background/**/*.js` fazia o ESLint aplicar as globals de **Service Worker** a esse arquivo — que não incluem `document`, `window` nem outros globals de DOM.

**Solução:** O arquivo era uma duplicata. O correto já existia em `popup/settings.html`. O diretório `background/popup/` foi removido integralmente.

```
background/
  popup/          ← removido (duplicata acidental)
    settings.html
    popup/
      settings.js
```

---

### 2. `content/content.js` — `no-redeclare` (2 erros)

```
Error: 'NodeFilter' is already defined as a built-in global variable  no-redeclare
Error: 'chrome' is already defined as a built-in global variable      no-redeclare
```

**Causa:** O arquivo tinha um comentário JSDoc no topo declarando as variáveis como globais:

```js
/* global NodeFilter, chrome */
```

O `eslint.config.mjs` já definia essas mesmas variáveis em `browserGlobals` para o bloco `content/**/*.js`. O ESLint interpretou isso como redeclaração.

**Solução:** Remoção do comentário `/* global */` redundante. A configuração centralizada no `eslint.config.mjs` é suficiente.

---

### 3. `utils/storage.js` — `no-undef` (4 erros)

```
Error: 'chrome' is not defined  no-undef  (linhas 21, 36, 50, 73)
```

**Causa:** O bloco `utils/**/*.js` no `eslint.config.mjs` usava apenas `globals.node`, que não inclui a global `chrome`. Como `storage.js` chama `chrome.storage.local`, o ESLint não reconhecia o identificador.

**Solução:** Adição de `chrome: "readonly"` nas globals do bloco `utils` em `eslint.config.mjs`:
(esse erro foi meu mesmo Karol kkkkk)

```js
// eslint.config.mjs
{
  files: ["utils/**/*.js"],
  languageOptions: {
    globals: {
      ...globals.node,
      chrome: "readonly", // adicionado
    },
  },
}
```

---

## Arquivos Alterados

| Arquivo              | Tipo de alteração                                |
| -------------------- | ------------------------------------------------ |
| `background/popup/`  | Removido (diretório inteiro)                     |
| `content/content.js` | Removido comentário `/* global */`               |
| `eslint.config.mjs`  | Adicionado `chrome: "readonly"` no bloco `utils` |

---

## Verificação

Após as correções, `npm run lint` passou sem erros ou warnings:

```
> flow-translate@1.0.0 lint
> eslint . --max-warnings 0
```

---

## Passo a Passo: Como Abordar Novos Erros de Lint

Use este guia sempre que o CI falhar no job `lint`.

### Passo 1 — Leia a mensagem de erro completa

O ESLint informa arquivo, linha, mensagem e nome da regra:

```
path/to/file.js
  10:5  error  'variavel' is not defined  no-undef
```

Anote:

- o **arquivo** afetado
- a **regra** violada (ex: `no-undef`, `no-redeclare`, `prefer-const`)
- a **linha** do erro

---

### Passo 2 — Identifique o bloco do ESLint que cobre o arquivo

Abra `eslint.config.mjs` e localize qual bloco `files: [...]` cobre o caminho do arquivo.

| Caminho do arquivo   | Bloco correspondente                              |
| -------------------- | ------------------------------------------------- |
| `popup/**/*.js`      | globals de browser (`document`, `window`, etc.)   |
| `background/**/*.js` | globals de service worker (`self`, `fetch`, etc.) |
| `content/**/*.js`    | globals de browser + `chrome` + `NodeFilter`      |
| `utils/**/*.js`      | globals de Node + `chrome`                        |
| `scripts/**/*.js`    | globals de Node                                   |

Se o arquivo **não se encaixa** no bloco que o captura, o problema pode ser de **localização errada do arquivo** (como aconteceu no incidente acima).

---

### Passo 3 — Classifique o tipo de erro

#### `no-undef` — variável não reconhecida como global

O contexto (bloco ESLint) não inclui essa global. Soluções possíveis:

- A variável é uma global do ambiente (ex: `chrome`, `document`)? → adicione ao bloco correto em `eslint.config.mjs`
- O arquivo está na pasta errada? → mova o arquivo para a pasta correta
- A variável vem de outro módulo? → importe-a corretamente

#### `no-redeclare` — global declarada duas vezes

A variável já está definida no `eslint.config.mjs` **e** também em um comentário `/* global */` no arquivo. Solução: remova o comentário `/* global */`, pois a configuração centralizada é suficiente.

#### `prefer-const` — variável declarada com `let` mas nunca reatribuída

Troque `let` por `const`.

```js
// antes
let valor = calcular();

// depois
const valor = calcular();
```

#### `no-unused-vars` — variável declarada mas nunca usada

Remova a variável ou, se for um parâmetro de função que precisa existir por assinatura, prefixe com `_`:

```js
function handler(_event, data) { ... }
```

#### `eqeqeq` — uso de `==` em vez de `===`

Substitua todas as comparações soltas por estritas:

```js
// antes
if (x == null)

// depois
if (x === null)
```

---

### Passo 4 — Aplique a correção e rode o lint localmente

```bash
npm run lint
```

Se quiser tentar o auto-fix (funciona para regras como `prefer-const`, `eqeqeq`):

```bash
npm run lint:fix
```

> Erros como `no-undef` e `no-redeclare` **não** são corrigidos automaticamente — exigem intervenção manual.

---

### Passo 5 — Confirme que nenhum erro foi introduzido

Rode o lint uma segunda vez após a correção para garantir que a mudança não criou novos problemas:

```bash
npm run lint
# saída esperada: nenhuma linha de erro, exit code 0
```

---

### Passo 6 — Documente o incidente (se relevante)

Se o erro foi causado por má configuração do ESLint, arquivo no lugar errado, ou padrão que pode se repetir, crie um novo arquivo em `docs/incidentes/` seguindo o formato deste documento:

```
docs/incidentes/AAAA-MM-DD-descricao-curta.md
```
