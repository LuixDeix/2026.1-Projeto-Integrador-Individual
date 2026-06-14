export function obterTelemetriaMockada() {
  const agora = new Date();
  return {
    dataHora: agora.toISOString(),
    umidadeSoloPorcentagem: 63.5,
    umidadeAr: 61.2,
    temperatura: 19.5,
    luzSolar: 72,
    pHSolo: 6.2,
    statusIrrigacao: "DESLIGADO",
    controleManualAtivo: false,
    vazaoGotejamentoLh: 0,
    estacao: "INVERNO",
    condicaoCeu: "ENSOLARADO"
  };
}

export function obterHistoricoMockado() {
  const agora = new Date();
  const dadosMockados = [];
  
  for (let i = 2880; i >= 0; i -= 15) {
    const dataPonto = new Date(agora.getTime() - i * 60 * 1000);
    const dataHoraStr = dataPonto.toISOString();

    dadosMockados.push({
      id: 2,
      dataHora: dataHoraStr,
      umidadeSoloPorcentagem: parseFloat((62 + Math.sin(i / 110) * 6 + Math.random() * 1.5).toFixed(1)),
      umidadeAr: parseFloat((60 + Math.cos(i / 130) * 4 + Math.random() * 1.5).toFixed(1)),
      temperatura: parseFloat((18 + Math.sin(i / 220) * 3 + Math.random() * 0.8).toFixed(1)),
      luzSolar: parseFloat(Math.min(100, Math.abs(40 + Math.sin(i / 50) * 35 + 40)).toFixed(1)),
      pHSolo: parseFloat((6.1 + Math.sin(i / 600) * 0.15).toFixed(2)),
      estaChovendo: Math.sin(i / 300) > 0.75,
      alertaCriticoAlface: false,
      statusIrrigacao: Math.sin(i / 160) < -0.85 ? "LIGADO" : "DESLIGADO",
      vazaoGotejamentoLh: Math.sin(i / 160) < -0.85 ? 2.5 : 0,
      controleManualAtivo: false,
      estacao: "INVERNO",
      condicaoCeu: "ENSOLARADO"
    });
  }
  return dadosMockados;
}
