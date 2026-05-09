Unit Tests

Os testes unitários são aplicados no backend do sistema, cobrindo funções isoladas responsáveis por processamento de dados e regras de negócio. No contexto da horta inteligente, isso inclui validação de payloads recebidos do ESP32, cálculo de médias de sensores e avaliação de regras de automação (ex: decisão de ligar a irrigação).

Por exemplo, uma função responsável por verificar se a umidade do solo está abaixo do limite configurado pode ser testada isoladamente, garantindo que diferentes entradas (valores normais, extremos e inválidos) produzam a decisão correta. Esse nível garante que a lógica central do sistema esteja correta independentemente de integrações externas.

Integration Tests

Os testes de integração verificam a comunicação entre componentes do sistema, principalmente entre a API e o banco de dados, bem como entre os endpoints e os serviços internos.

No projeto, esse nível se materializa na validação do fluxo completo de recebimento de dados: o ESP32 envia uma requisição → a API processa → os dados são armazenados no banco. Um exemplo concreto seria um teste que envia uma requisição HTTP para o endpoint /api/v1/readings e verifica se o dado foi corretamente persistido.

Esse nível é essencial porque o sistema depende diretamente da integração correta entre coleta, processamento e armazenamento de dados.

System Tests

Os testes de sistema validam o comportamento do sistema como um todo, simulando cenários próximos ao ambiente real de operação da estufa.

No contexto do projeto, isso inclui fluxos completos como: receber dados de sensores, aplicar regras de automação e enviar comandos para atuadores. Um exemplo seria simular uma sequência de leituras onde a umidade do solo está abaixo do limite e verificar se o sistema aciona corretamente a bomba de irrigação.

Esses testes podem ser executados em ambiente de staging, utilizando dados simulados ou o próprio hardware (ESP32), garantindo que todos os componentes funcionem em conjunto.

Acceptance Tests

Os testes de aceitação são utilizados para validar se o sistema atende aos requisitos definidos do ponto de vista do usuário ou do Product Owner.

No estágio atual do projeto (v0.1), esse nível é aplicado de forma parcial, pois a interface de usuário (dashboard completo) ainda não está totalmente implementada. Ainda assim, critérios de aceitação definidos no SRS já funcionam como base para validação manual, como por exemplo: verificar se o sistema realiza irrigação automática quando a umidade está abaixo do limite.

A decisão é evoluir este nível na v0.2, com a introdução de testes de aceitação automatizados baseados em cenários de uso reais (ex: monitoramento via dashboard e controle manual).