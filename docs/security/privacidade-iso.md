# Documento de Segurança e Privacidade — PHorta Dashboard
**Normas aplicadas:** ISO 27001:2022 · ISO 27002:2022 · ISO 27701:2019  
**Escopo:** Implementações novas realizadas no ciclo de melhoria dos cards (v0.2.0)  
**Data:** 2026-06-13  
**Responsável:** Equipe PHorta  

---

## 1. Controles Implementados nas Novas Funcionalidades

Os itens abaixo documentam os controles de segurança aplicados **diretamente no código novo** escrito neste ciclo de melhoria. Cada controle é rastreável a um arquivo e função específica.

---

### 1.1 Sanitização de Entrada de Usuário
**Norma:** ISO 27001 A.14.2.5 (Princípios de engenharia de sistemas seguros)  
**Norma:** ISO 27002 8.28 (Programação segura)

**Implementação:**
- Função `sanitizarEntradaData(valor)` em `src/services/cardHelpers.js`
  - Valida entradas dos campos de filtro de data antes de uso.
  - Aceita **apenas** o formato `YYYY-MM-DDTHH:MM` (produzido por `<input type="datetime-local">`).
  - Rejeita strings com HTML/script, formatos alternativos e datas inválidas.
  - Retorna string vazia em caso de rejeição — nunca lança exceção.
  - Integrada em `appController.js` no handler do botão "Filtrar".

- Função `sanitizarDuracaoIrrigacao(valor, valoresPermitidos)` em `src/services/cardHelpers.js`
  - Valida a duração de irrigação contra uma lista de valores permitidos explícita `[30, 60, 120, 300]`.
  - Rejeita qualquer valor fora da lista — retorna 60s como padrão seguro.
  - Integrada em `appController.js` no handler do `select-duracao-irrigacao`.

**Cobertura de testes:** 14 testes unitários em `src/__tests__/cardHelpers.test.js`.

---

### 1.2 Controle de Acesso a Comandos de Atuadores
**Norma:** ISO 27002 8.2 (Direitos de acesso privilegiado)

**Implementação:**
- O handler do botão `btn-toggle-bomba` em `appController.js` verifica `cenarioAtual === 'offline'` antes de processar qualquer comando — retorna imediatamente se offline.
- A duração do comando de irrigação é validada por `sanitizarDuracaoIrrigacao()` antes de ser utilizada.
- O select de duração (`select-duracao-irrigacao`) é desabilitado via atributo `disabled` quando o dispositivo está offline.

**Melhoria futura recomendada:** Adicionar token de autenticação nos headers das chamadas à API de controle (`/api/controle/irrigacao`) — ver Seção 2.

---

### 1.3 Rastreabilidade de Ações (Audit Trail)
**Norma:** ISO 27002 8.16 (Atividades de monitoramento)  
**Norma:** ISO 27001 A.12.4.1 (Log de eventos)

**Implementação:**
- Função `adicionarLogErro(nivel, mensagem)` em `appController.js`
  - Registra eventos com timestamp, nível (`OK`, `WARN`, `ERR`, `CMD`) e mensagem.
  - Mantém histórico de até 20 entradas (FIFO — entradas antigas são descartadas).
  - Registra: falhas de API, mudanças de estado do dispositivo, comandos de irrigação.
- Os comandos enviados à bomba são registrados com nível `CMD` e a descrição completa.
- O log é exibido no painel "Tabela de Erros" do dashboard (visível ao operador).

**Limitação atual:** O log é volátil (em memória, perdido ao recarregar a página).  
**Melhoria futura:** Persistir o log em `localStorage` com TTL de 24h — ver Seção 2.

---

### 1.4 Funções Puras e Testabilidade
**Norma:** ISO 27002 8.28 (Programação segura — testes e revisão)

**Implementação:**
- Todo código de lógica de negócio novo está isolado em `src/services/cardHelpers.js` como funções puras (sem efeitos colaterais, sem acesso ao DOM).
- Cobertura de 54 testes unitários para as funções puras.
- Funções de renderização (`renderCardSensor`, `renderSidePanels`) cobertas por 50 testes adicionais.
- Função `normalizarRegistro` da API coberta por 9 testes.
- **Total: 104 testes | 0 falhas.**

---

## 2. Melhorias de Privacidade e Segurança para Futuras Iterações

Esta seção documenta pontos identificados durante a implementação que **não foram alterados neste ciclo** (pois estão fora do escopo "somente código novo"), mas que devem ser endereçados em versões futuras.

---

### 2.1 Autenticação no Dashboard
**Prioridade:** Alta  
**Norma:** ISO 27001 A.9.4.1 (Restrição de acesso à informação)  
**Norma:** ISO 27701 7.2.1 (Identificação e autenticação)

O dashboard atualmente não exige autenticação para visualizar dados dos sensores nem para acionar a irrigação. Qualquer pessoa com acesso à URL pode controlar o sistema.

**Ação recomendada:**
- Implementar autenticação mínima (ex: token JWT ou HTTP Basic Auth) no backend para o endpoint `/api/controle/irrigacao`.
- Adicionar verificação de sessão no frontend antes de exibir controles de atuadores.

---

### 2.2 Persistência Segura do Log de Eventos
**Prioridade:** Média  
**Norma:** ISO 27002 8.16 (Atividades de monitoramento)

O log de erros implementado (`estadoApp.logErros`) é volátil — perdido ao fechar o navegador.

**Ação recomendada:**
- Persistir o log em `localStorage` com:
  - TTL de 24 horas (limpeza automática de entradas antigas).
  - Limite de tamanho (ex: 100 KB máximo) para evitar abuso de armazenamento.
  - Nunca persistir dados sensíveis (ex: tokens, credenciais) no log.

---

### 2.3 Proteção de Dados Ambientais (ISO 27701)
**Prioridade:** Baixa  
**Norma:** ISO 27701 7.4 (Minimização de dados)

Os dados coletados pelo sistema (temperatura, umidade, pH, luz solar) são **dados ambientais**, não dados pessoais no sentido da LGPD/GDPR. Porém, padrões de irrigação podem — indiretamente — indicar presença humana no local (horário de plantio, atividade).

**Ação recomendada:**
- Definir política de retenção de dados no backend (ex: dados históricos retidos por no máximo 90 dias).
- Documentar que os dados coletados são exclusivamente ambientais/operacionais, sem vinculação a pessoas físicas identificáveis.
- Incluir aviso de coleta de dados operacionais na interface caso o sistema seja tornado público.

---

### 2.4 Proteção de URLs de API Hardcoded
**Prioridade:** Média  
**Norma:** ISO 27002 8.28 (Programação segura)

As URLs das APIs (Azure e Render) estão hardcoded em `apiService.js`. Em caso de rotação de endpoints, requer alteração de código.

**Ação recomendada:**
- Mover para variáveis de ambiente (ex: `.env` + build step com Vite/esbuild).
- Nunca expor URLs internas ou tokens em builds de produção sem ofuscação.

---

### 2.5 Content Security Policy (CSP)
**Prioridade:** Média  
**Norma:** ISO 27001 A.14.1.2 (Segurança de serviços de aplicação em redes públicas)

O `index.html` não define headers de Content Security Policy, deixando o dashboard vulnerável a ataques XSS se algum dado da API for renderizado sem escape.

**Ação recomendada:**
- Adicionar meta tag CSP no `<head>` do `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self'; script-src 'self' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; connect-src https://horta-api-*.azurewebsites.net https://server-horta.onrender.com;">
  ```
- Garantir que todos os valores vindos da API passem por `textContent` (não `innerHTML`) ao serem exibidos.

---

## 3. Resumo de Conformidade

| Controle | Norma | Status neste ciclo |
|----------|-------|--------------------|
| Sanitização de entrada de data | ISO 27001 A.14.2.5 / ISO 27002 8.28 | **Implementado** |
| Sanitização de duração de irrigação | ISO 27002 8.2 | **Implementado** |
| Validação de acesso a atuadores (offline guard) | ISO 27002 8.2 | **Implementado** |
| Rastreabilidade de comandos (audit log) | ISO 27002 8.16 | **Implementado (volátil)** |
| Testes unitários para funções de segurança | ISO 27002 8.28 | **Implementado (104 testes)** |
| Autenticação no dashboard | ISO 27001 A.9.4.1 | Pendente — v futuro |
| Persistência segura do log | ISO 27002 8.16 | Pendente — v futuro |
| Política de retenção de dados | ISO 27701 7.4 | Pendente — v futuro |
| URLs de API em variáveis de ambiente | ISO 27002 8.28 | Pendente — v futuro |
| Content Security Policy | ISO 27001 A.14.1.2 | Pendente — v futuro |
