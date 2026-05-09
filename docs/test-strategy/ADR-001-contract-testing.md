ADR-001: Adoção de Contract Testing entre ESP32 e API
Contexto

O sistema da horta inteligente depende da comunicação entre um dispositivo embarcado (ESP32) e uma API backend. Essa comunicação ocorre via rede (HTTP ou MQTT) e envolve troca de dados estruturados (leituras de sensores e comandos de atuadores).

Uma falha de compatibilidade entre o formato enviado pelo ESP32 e o esperado pela API pode causar perda de dados, falhas de automação ou comportamento inconsistente. Como o firmware e o backend evoluem de forma relativamente independente, existe risco de quebra silenciosa na integração.

Decisão

Foi adotada a técnica de contract testing para garantir que a comunicação entre ESP32 e API permaneça consistente ao longo do tempo.

Na prática, será definido um contrato explícito (ex: JSON schema) que descreve o formato esperado das mensagens, incluindo campos obrigatórios, tipos e restrições. Esse contrato será versionado no repositório e utilizado tanto nos testes do backend quanto como referência para o firmware.

Os testes validarão que:

A API aceita apenas payloads que respeitam o contrato
Mudanças no backend não quebram compatibilidade com o firmware existente
Alternativas rejeitadas

Testes end-to-end apenas com hardware real

Essa abordagem foi descartada porque:

Depende da disponibilidade física do ESP32
Dificulta execução em CI
Torna os testes mais lentos e menos determinísticos

Embora úteis, esses testes não substituem a validação formal de contrato.

Consequências

Benefícios:

Redução de falhas de integração entre firmware e backend
Maior segurança ao evoluir a API
Documentação viva do formato de dados

Custos:

Necessidade de manter e versionar o contrato
Esforço adicional ao alterar o formato de mensagens
Curva de aprendizado da equipe
Quando não usar

Essa decisão deixa de fazer sentido caso o sistema evolua para um modelo onde firmware e backend sejam versionados e deployados sempre em conjunto (ex: sistema monolítico embarcado).

Também pode ser revista caso a comunicação passe a utilizar protocolos fortemente tipados e auto-validados (ex: gRPC com schema compartilhado), reduzindo a necessidade de contract testing explícito.