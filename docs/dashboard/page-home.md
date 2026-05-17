# Page Decision: Home (Visão Geral)

**Status:** Accepted  
**Data:** 2025-05-17  
**RFC de referência:** A1.4  
**Atividade:** A1.7 — Entrega E2E de 1 tela do dashboard

---

## 1. Telas candidatas avaliadas

| Tela | Risco Técnico | Complexidade | Aprendizado Gerado | Score |
| --- | --- | --- | --- | --- |
| **Home (Visão Geral)** | 🔴 Alto | 🔴 Alta | 🟢 Muito Alto | ★★★ |
| Histórico | 🟡 Médio | 🟡 Média | 🟡 Médio | ★★ |
| Crescimento | 🟡 Médio | 🟡 Média | 🟡 Médio | ★★ |
| Sensores | 🟢 Baixo | 🟢 Baixa | 🔴 Baixo | ★ |

**Eixos avaliados:**

- **Risco técnico:** dependências de dados em tempo real, múltiplos sensores simultâneos, estados de falha, ação de escrita (irrigação manual).
- **Complexidade:** quantidade de componentes distintos, variações de estado visual, composição do layout.
- **Aprendizado gerado:** o quanto fechar essa tela valida decisões que se propagam para todas as demais.

---

## 2. Tela escolhida

**Home — tela principal do dashboard de monitoramento da horta.**

É a primeira tela que o usuário vê ao abrir o sistema. Agrega em uma única view: leituras dos sensores principais (umidade do solo, umidade do ar, temperatura), condições climáticas atuais, gráfico de tendências em tempo real, alertas ativos, status do dispositivo/MQTT, ação rápida de irrigação manual, status da bomba e tabela de erros do sistema.

---

## 3. Justificativa (risco / complexidade / aprendizado)

### 3.1 Risco — por que enfrentar agora

A Home é a única tela que combina **leitura de múltiplos sensores simultâneos** com uma **ação de escrita** (iniciar irrigação manual). Isso introduz dois riscos que precisam ser resolvidos antes de qualquer outra tela:

- **Dados parciais e sensor offline:** o badge "Offline" no canto superior direito do wireframe mostra que esse estado já era esperado no design. Uma leitura pode chegar enquanto outra falha. A tela precisa renderizar isso de forma coerente — não travar, não mostrar tela em branco, não silenciar o erro.
- **Ação com feedback de estado:** o botão "Iniciar Irrigação" não é leitura passiva — é uma escrita que precisa de confirmação, loading, sucesso e falha. Resolver esse padrão aqui significa que Controle Manual (se existir como tela separada) recebe o padrão pronto.
- **Conexão MQTT:** o status do dispositivo expõe a dependência de protocolo mais arriscada do projeto. Descobrir que o mock de MQTT não reflete o comportamento real custa zero agora; custa um sprint se descoberto na integração.

> Se qualquer uma dessas dependências travar, é melhor descobrir na A1.7 do que no Marco 3 do PI com três telas pela metade.

### 3.2 Complexidade — por que ela força o design system a existir

A Home obriga a construção de componentes que serão reaproveitados em **todas** as outras telas:

| Componente | Reuso esperado |
| --- | --- |
| `<MetricGauge />` | Umidade/Temperatura em qualquer tela de leitura |
| `<TrendChart />` | Histórico, Crescimento |
| `<AlertCard />` | Qualquer tela com sistema de alertas |
| `<StatusBadge />` | Sensores, Dispositivo, Bomba |
| `<DeviceStatus />` | Sensores, painel de configuração |
| `<QuickAction />` | Controle Manual |
| `<ErrorTable />` | Log de erros global |

Começar pela tela de Sensores, por exemplo, produziria componentes de leitura simples usados apenas lá. A Home gera a **biblioteca base** do dashboard inteiro.

### 3.3 Aprendizado — o que esta tela valida que as outras não validam

1. **Contrato de dados da API:** o shape de `SensorReading`, `AlertItem`, `DeviceStatus` e `WeatherCondition` é definido aqui no mock. Gaps no schema (campo ausente, tipo errado, unidade inconsistente) são descobertos antes da integração real.
2. **Comportamento sob estado offline:** o wireframe já mostra o badge "Offline" como estado esperado. Implementar e testar esse estado na tela mais visível garante que o padrão de degradação graceful seja estabelecido como norma, não exceção.
3. **Decisão de stack de gráfico:** o `TrendChart` com múltiplas séries, dois eixos Y e filtro de período (30min / 1h / 6h / 24h) é o caso mais complexo de gráfico do projeto. Escolher a biblioteca aqui — com o caso mais exigente — garante que a escolha escala. Escolher com um gráfico simples e descobrir limitação depois gera troca de biblioteca no meio do projeto.
4. **Padrão de polling/websocket:** leituras em tempo real precisam de uma estratégia de atualização. Definir isso na camada de fetch da Home significa que as outras telas herdam a solução, não reinventam.

### 3.4 Por que as outras telas não foram escolhidas

- **Histórico:** depende de filtros de período com paginação e potencialmente exportação — spec não fechada. Construir agora significa construir sobre premissas que podem mudar.
- **Crescimento:** requer modelo de dados de séries temporais mais longas (dias/semanas) e possivelmente cálculos derivados. Dependência de regras de negócio ainda não validadas.
- **Sensores:** listagem de leitura por sensor — baixo risco, baixa complexidade, baixo aprendizado. Fechar ela primeiro seria otimizar o que não é crítico e não geraria os componentes base que o restante precisa.

---

## 4. Wireframe da versão implementada

> O wireframe abaixo reflete **exatamente** o que está sendo implementado — não uma versão de intenção anterior.

**Legenda dos blocos:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]   HOME • HISTÓRICO • CRESCIMENTO • SENSORES      [🔔]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  ┌───────────┐ │
│  │ Umid. Solo   │ │ Umid. Ar     │ │ Temperatura  │  │ Condições │ │
│  │   gauge 40%  │ │  gauge 25%   │ │  gauge 15°C  │  │  Atuais   │ │
│  │   Úmido      │ │  Seco        │ │  Agradável   │  │ vento/UV  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘  └───────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────┐  ┌──────────────────────┐ │
│  │ Tendências em tempo real             │  │ ⚠ Alertas            │ │
│  │ [30min][1h][6h][24h]                 │  │ - Umid. solo baixa   │ │
│  │                                      │  │ - Reserv. crítico    │ │
│  │  gráfico multisérie (solo/ar/temp)   │  │ - Sistema normal     │ │
│  │                                      │  │ [Ver todos os alertas│ │
│  └──────────────────────────────────────┘  └──────────────────────┘ │
│                                                                      │
│                    ┌──────────────────────┐  ┌──────────────────┐   │
│  ┌───────────────┐ │ ⚙ Status Dispositivo │  │ 💧 Ação Rápida   │   │
│  │ Tabela Erros  │ │ Estado: IDLE         │  │ Duração: 60s     │   │
│  │ (sistema)     │ │ Conexão: Online      │  │ [Iniciar Irrig.] │   │
│  │               │ │ MQTT: Conectado      │  ├──────────────────┤   │
│  │               │ └──────────────────────┘  │ 🪣 Status Bomba  │   │
│  └───────────────┘                           │ Bomba desligada  │   │
│                                              └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Escopo da v1 (o que está implementado):**

- Cards de métricas com gauge animado (Umid. Solo, Umid. Ar, Temperatura)
- Bloco de Condições Atuais (Vento, Chuva, Pressão, Índice UV)
- Gráfico de Tendências com filtro de período (30min / 1h / 6h / 24h)
- Painel de Alertas com severidade (informativo / atenção / crítico)
- Status do Dispositivo (Estado, Conexão, MQTT, Último comando, Tempo ligado)
- Ação Rápida de Irrigação com input de duração e botão de acionamento
- Status da Bomba
- Tabela de Erros do sistema

**Fora do escopo da v1 (entra na A1.8):**

- Conexão com API real (hoje: mock isolado e plugável)
- WebSocket para atualização em tempo real (hoje: polling simulado no mock)
- Filtro de período customizado no gráfico
- Histórico completo de erros com paginação

---

## 5. Estados visuais cobertos

| Estado | O que aparece para o usuário |
| --- | --- |
| **Carregando** | Skeleton loader nos cards e no gráfico; spinner no header com timestamp "Atualizando..." |
| **Sucesso (dados completos)** | Todos os gauges, gráfico e painéis renderizados com dados realistas |
| **Offline / sem conexão** | Badge "Offline" no canto superior direito; cards mostram último valor conhecido com indicador de dado desatualizado |
| **Sensor com falha individual** | Card do sensor afetado exibe `--` no valor e badge vermelho "Sem leitura"; demais cards renderizam normalmente |
| **Fetch falhou (erro de rede)** | Banner de erro não-bloqueante no topo: "Não foi possível atualizar os dados. Última leitura: 12:30:45" com botão "Tentar novamente" |
| **Dado parcial** | Gráfico renderiza apenas as séries com dados disponíveis; legenda marca série ausente com tracejado e tooltip explicativo |
| **Alerta crítico ativo** | AlertCard com borda vermelha e ícone de perigo; sem modal bloqueante — o usuário continua operando o dashboard |
| **Ação de irrigação em andamento** | Botão "Iniciar Irrigação" muda para "Irrigando... (45s)" com spinner; input de duração desabilitado; Status da Bomba atualiza para "Bomba ligada" |

---

## 6. Estrutura de mock

**Localização:** `src/mocks/home.mock.ts`

**Valores mockados usados (realistas):**

- Umidade do Solo: 40% — estado "Úmido" (faixa plausível pós-irrigação)
- Umidade do Ar: 25% — estado "Seco" (alerta esperado)
- Temperatura: 15°C — estado "Agradável" (manhã de outono)
- Tendências: 30 pontos em 30 minutos com variação de ±3% (não valores fixos)
- Timestamps coerentes: série começa em `now - 30min`, incrementos de 1 minuto

**Plano de migração para API real:**
Toda chamada de dados passa por `src/services/homeService.ts`. O mock é injetado via variável de ambiente:

```typescript
// src/services/homeService.ts
const fetchSensors = process.env.VITE_USE_MOCK === "true"
  ? () => import("../mocks/home.mock").then(m => m.sensorsMock)
  : () => api.get("/sensors/current");
```

Trocar para API real = mudar `VITE_USE_MOCK=false` no `.env.production`. Nenhum componente muda.

---

## 7. Decisão de stack

| Decisão | Escolha | Justificativa |
| --- | --- | --- |
| Framework | React + TypeScript | Definido na RFC A1.4 |
| Gráfico | Recharts | Suporte nativo a múltiplos eixos Y e séries mistas; API declarativa compatível com o padrão de componentes do projeto; bundle menor que Chart.js para o caso de uso de linha temporal |
| Estilo | Tailwind CSS | Definido na RFC A1.4 |
| Estado local | React useState + useReducer | Sem necessidade de estado global na v1; dados chegam por prop/fetch isolado. Zustand entra na A1.8 se polling global for necessário |
| Fetch / polling | React Query (TanStack Query) | Cache automático, refetch em intervalo, estados de loading/error/success nativos — elimina boilerplate que seria escrito manualmente |

> Qualquer divergência em relação à RFC A1.4 está registrada aqui como atualização de ADR. Não houve divergência na v1.

---

## 8. Rastreabilidade requisito → tela → teste

| Requisito (UC) | Componente na tela | Teste |
| --- | --- | --- |
| UC-01: Exibir leitura atual dos sensores | `<MetricGauge />` | `home.test.tsx` — render com dados válidos |
| UC-02: Exibir estado offline do sistema | Badge "Offline" + cards com dado desatualizado | `home.test.tsx` — render em estado offline |
| UC-03: Exibir alertas ativos com severidade | `<AlertCard />` | `alerts.test.tsx` — render crítico/atenção/info |
| UC-04: Iniciar irrigação manual | `<QuickAction />` + botão | `irrigation.test.tsx` — click + estado de loading |
| UC-05: Exibir tendências em tempo real | `<TrendChart />` com filtro | `chart.test.tsx` — troca de período atualiza dados |

> Cada teste está ancorado em uma linha da matriz risco→teste da A1.6.

---

## 9. Definition of Done

- [ ] Todos os 8 estados visuais renderizam sem erro no browser
- [ ] `npm install && npm run dev` funciona sem configuração adicional
- [ ] Camada de fetch isolada — trocar mock por API real não altera nenhum componente
- [ ] ≥1 teste rodando validando comportamento real (não snapshot vazio)
- [ ] Log de execução do teste em `docs/dashboard/evidencias/home-test-run.log`
- [ ] Dados mockados passam no critério de realismo (temperaturas em faixa plausível, timestamps coerentes, sem "teste 1 / lorem ipsum")
- [ ] Layout não quebra em viewport mobile (≥375px)
- [ ] PR com descrição seguindo o template da A1.5
- [ ] Review aprovado por outro membro da equipe (sem self-merge)
- [ ] Tag `v0.1.0-dashboard` criada no Git
- [ ] `docs/releases/release-1.md` preenchido
