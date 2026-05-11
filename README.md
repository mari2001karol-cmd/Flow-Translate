# Flow Translate 🌐

Extensão para Google Chrome que une um **tradutor integrado** e um **sistema de flashcards (baralhos)** diretamente na navegação do usuário. Ferramenta ideal para estudo de idiomas.

## ✨ Funcionalidades

### 1. Popup do Tradutor
- Interface simples e moderna de tradução
- Seleção de idiomas (origem e destino)
- Detecção automática de idioma
- Copiar resultado para a área de transferência
- Salvar tradução no baralho de flashcards

### 2. Captura Inline (Content Script)
- Selecione qualquer palavra em uma página web
- Tooltip flutuante aparece com a tradução
- Botão para salvar a palavra no baralho

### 3. Highlighter Automático
- Palavras salvas nos baralhos são automaticamente destacadas
- Fundo azul nas palavras reconhecidas
- Clique para ver a tradução salva

## 🏗️ Arquitetura

```
Flow-Translate/
├── manifest.json          # Manifest V3 - configuração da extensão
├── popup/
│   ├── popup.html         # Interface do tradutor
│   ├── popup.css          # Estilos do popup (dark mode)
│   └── popup.js           # Lógica do popup
├── content/
│   ├── content.js         # Interação com DOM das páginas
│   └── content.css        # Estilos injetados nas páginas
├── background/
│   └── background.js      # Service Worker (API de tradução)
├── utils/
│   └── storage.js         # Utilitários de chrome.storage
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 Como Instalar (Desenvolvimento)

1. Clone o repositório
2. Abra `chrome://extensions/` no Chrome
3. Ative o **Modo do Desenvolvedor** (canto superior direito)
4. Clique em **"Carregar sem compactação"**
5. Selecione a pasta `Flow-Translate`

## 📚 API de Tradução

Utiliza a [MyMemory Translation API](https://mymemory.translated.net/) (gratuita, sem necessidade de API key).

## 🛠️ Tecnologias

- **Manifest V3** - Arquitetura moderna de extensões Chrome
- **Vanilla JavaScript** - Sem dependências externas
- **Chrome Storage API** - Persistência local de dados
- **MyMemory API** - Serviço de tradução gratuito