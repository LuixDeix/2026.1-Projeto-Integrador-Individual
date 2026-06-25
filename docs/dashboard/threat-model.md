# Threat Model — Dashboard PHorta (A1.8)

**Escopo:** interface web do dashboard (`index.html` + `src/services/*`).  
**Complementa:** threat model geral do sistema IoT (ESP32, MQTT, API).

---

## 1. Ativos

| Ativo | Descrição | Localização |
|-------|-----------|-------------|
| Leituras de sensores | Temperatura, umidade, luminosidade, pH | Resposta `/api/historico/completo`, cache IndexedDB |
| Eventos de irrigação | Histórico agregado (API) e comandos manuais | `dataService.js` (`contarIrrigacoesDoHistorico`), painel Ação Rápida; `mockService.js` só em fallback de telemetria do canteiro A |
| Dados de canteiros | Nome, cultura, área | `localStorage` (`phorta-canteiros`) |
| Endpoints consumidos | Azure + Render APIs | `apiService.js` |
| Sessão local | Filtros, logs, preferências | `localStorage` / IndexedDB |
| Credenciais | Não há auth no dashboard v0.2 | — |

---

## 2. Ameaças concretas e mitigações

### A1 — XSS via nome de canteiro

**Cenário:** atacante cadastra canteiro com `<script>alert(1)</script>`; nome renderizado sem escape compromete sessão do operador.

| | |
|---|---|
| **Mitigação aplicada** | `sanitizarTextoCanteiro()` remove tags; `escapeHtml()` em toda renderização dinâmica (`canteirosView.js`, `alertasView.js`, `dashboardViewService.js`) |
| **Evidência** | `src/__tests__/cardHelpers.test.js` — teste de XSS em data; `src/__tests__/canteirosService.test.js` |

### A2 — Injeção em filtros de data/histórico

**Cenário:** payload malicioso em `<input type="datetime-local">` ou query string manipulada para quebrar parser ou injetar em logs.

| | |
|---|---|
| **Mitigação aplicada** | `sanitizarEntradaData()` aceita apenas `YYYY-MM-DDTHH:MM`; rejeita `<script>` e formatos inválidos |
| **Evidência** | `cardHelpers.test.js` — suite `sanitizarEntradaData` |

### A3 — Exposição de URLs/endpoints em logs de produção

**Cenário:** `console.log` com URLs completas ou tokens vazados em observabilidade.

| | |
|---|---|
| **Mitigação aplicada** | `observabilityService.js` emite JSON estruturado sem credenciais; URLs de API não são logadas pelo observability layer |
| **Dívida técnica** | `apiService.js` ainda loga URL em dev (`console.log 📡`). **Risco aceito:** ambiente acadêmico, sem secrets na URL. **Plano Marco 4:** redact URLs em produção via flag `DEBUG` |

### A4 — Dados em trânsito sem TLS

**Cenário:** MITM entre browser e API Azure/Render.

| | |
|---|---|
| **Mitigação aplicada** | Endpoints usam `https://`; deploy Vercel força HTTPS |
| **Headers** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` em `vercel.json` |

### A5 — CSV/Formula Injection no export do Histórico

**Cenário:** o nome de um canteiro (`canteiroId`/`nome`), embora protegido contra XSS em HTML por `sanitizarTextoCanteiro()` e `escapeHtml()`, não passava por nenhum tratamento ao ser gravado no CSV gerado por `gerarCsvLeituras()` (`historicoView.js`). Um nome iniciado com `=`, `+`, `-` ou `@` — por exemplo `=cmd|'/C calc'!A1` ou `=HYPERLINK("http://evil.tld")` — é interpretado como fórmula executável pelo Excel, Google Sheets e LibreOffice quando a coordenadora abre o arquivo exportado, podendo levar à execução de comandos ou abertura de links maliciosos na máquina dela. Esse vetor é distinto de A1: a injeção ocorre na planilha que consome o arquivo, não no navegador.

| | |
|---|---|
| **Mitigação aplicada** | `sanitizarCelulaCsv()` (`cardHelpers.js`), aplicada ao campo `canteiroId` em `gerarCsvLeituras()`: quando o valor é texto e o primeiro caractere é `=`, `+`, `-` ou `@`, prefixa com apóstrofo (`'`), fazendo a planilha tratar a célula como texto literal. Valores numéricos (incluindo negativos, ex. `-3.2`) não são afetados — a verificação de tipo precede a inspeção de caractere |
| **Evidência** | `src/__tests__/historicoView.test.js` — suites `historicoView CSV — formula injection (ameaça A5)` e `sanitizarCelulaCsv (unidade isolada)`: cobre neutralização de `=cmd(...)` e `=HYPERLINK(...)`, preservação de `25.5` e `-3.2`, e regressão do contrato existente (`,A,`) |
| **Escopo da correção** | `downloadCsv()` não foi alterada — não realiza nenhum tratamento de dado, apenas serializa a string já sanitizada em `Blob`; o ponto de entrada da injeção está integralmente em `gerarCsvLeituras()` |

---

## 3. Dívida técnica registrada

| Item | Justificativa | Plano |
|------|---------------|-------|
| CSP (Content-Security-Policy) completo | Tailwind CDN + Chart.js CDN exigem `unsafe-inline` parcial | ADR futuro com bundler local |
| Auth JWT no dashboard | Fora do escopo v0.2 (mock/API pública de leitura) | Marco 4 com middleware |
| Rate limiting no frontend | Não aplicável em SPA estática | Backend |

---

## 4. Evidência de scanning (SCA)

Execução: `npm audit --audit-level=moderate` em 14/06/2026.

Resultado salvo em: [`evidencias/npm-audit-a18.txt`](evidencias/npm-audit-a18.txt)

Dependências diretas: Jest, Babel (dev only). Superfície de ataque em produção limitada a assets estáticos servidos pela Vercel.

**Atualização (ameaça A5):** nova execução de `npm audit --audit-level=moderate` em 25/06/2026, sem novas dependências de produção introduzidas pela correção — `sanitizarCelulaCsv()` é função pura sem dependências externas. Resultado salvo em [`evidencias/npm-audit-a5.txt`](evidencias/npm-audit-a5.txt).
