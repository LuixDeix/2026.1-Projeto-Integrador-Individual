const PRIMARY_API = 'https://horta-api-htggarb3eagagpgm.brazilsouth-01.azurewebsites.net';
const FALLBACK_API = 'https://server-horta.onrender.com';

const JANELA_HISTORICO_MINUTOS = 10080;

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function normalizarRegistro(log) {
  return {
    id: log.id,
    dataHora: log.dataHora,
    umidadeSoloPorcentagem: log.umidadeSoloPorcentagem ?? 0,
    temperatura: log.temperatura ?? 0,
    umidadeAr: log.umidadeAr ?? 0,
    pHSolo: log.pHSolo ?? 7.0,
    luzSolar: log.luzSolar ?? 0,
    statusIrrigacao: log.statusIrrigacao === 1 ? "LIGADO" : "DESLIGADO",
    estaChovendo: log.estaChovendo === 1,
    vazaoGotejamentoLh: log.statusIrrigacao === 1 ? 2.0 : 0,
    controleManualAtivo: false,
    estacao: log.estacao || "---",
    condicaoCeu: log.condicaoCeu || "---"
  };
}

async function obterHistoricoCompleto(baseUrl) {
  const url = `${baseUrl}/api/historico/completo?minutosAtras=${JANELA_HISTORICO_MINUTOS}`;
  console.log(`📡 Buscando histórico completo: ${url}`);

  const resposta = await fetchWithTimeout(url);

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status} em ${baseUrl}`);
  }

  const dados = await resposta.json();

  let lista = [];
  if (Array.isArray(dados)) {
    lista = dados;
  } else if (Array.isArray(dados.dashboardData)) {
    lista = dados.dashboardData;
  }

  if (lista.length === 0) {
    throw new Error(`Histórico vazio em ${baseUrl}`);
  }

  console.log(`✅ ${lista.length} registros recebidos de ${baseUrl}`);
  return lista.map(normalizarRegistro);
}

export async function buscarDadosDispositivo() {
  const payloadSeguro = {
    telemetria: null,
    historico: [],
    cenario: 'offline'
  };

  try {
    const historico = await obterHistoricoCompleto(PRIMARY_API);
    const ultimaLeitura = historico[historico.length - 1];
    return {
      telemetria: ultimaLeitura,
      historico,
      cenario: 'normal'
    };
  } catch (err) {
    console.warn(`⚠️ Azure falhou: ${err.message}. Tentando Render...`);
  }

  try {
    const historico = await obterHistoricoCompleto(FALLBACK_API);
    const ultimaLeitura = historico[historico.length - 1];
    return {
      telemetria: ultimaLeitura,
      historico,
      cenario: 'render-live'
    };
  } catch (err) {
    console.error(`💥 Render também falhou: ${err.message}. Ativando modo offline.`);
  }

  return payloadSeguro;
}
