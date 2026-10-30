# Plano de Implementação: Front-end Modo PC Industrial Minimalista & Chatbot Rasa

Modernização do layout e interface do **Modo PC (Central de Comando & Telemetria)** para o padrão **Industrial Minimalista de Alto Contraste Automotivo**, mantendo **todos os botões, controles e fluxos funcionais existentes estritamente preservados**, e migração da inteligência artificial do Copiloto para a arquitetura **Rasa Open Source** (rápida, gratuita, ilimitada e com suporte a intents/slots e conector Rasa REST webhook).

---

## 1. Revisão do Usuário & Alinhamento

### Itens de Ação e Decisões Tomadas:
- **Inteligência Artificial do Chatbot**: Migração para a arquitetura **Rasa** (Rasa NLU + Rasa Dialogue Core Engine). Operação instantânea (<20ms de latência), 100% gratuita, sem consumo de cotas de APIs proprietárias, com reconhecimento de intenções (`intents`), entidades (`entities`), slots de telemetria da viagem (`slots`) e suporte a conexão direta com instâncias Rasa REST (`/webhooks/rest/webhook`).
- **Identidade Visual do Modo PC**: **Estilo Industrial Minimalista com Contraste Automobilístico Elevado**, inspirado em estações de telemetria de frotas industriais (fundo Slate/Cinza Profundo `#020617` e `#090D16`, acabamentos de precisão milimétrica com linhas de contorno em `1px` de contraste sutil, tipografia monoespaçada tabular de instrumentos aeroespaciais/veiculares, sem cantos exagerados ou gradientes artificiais).
- **Garantia de Não-Regressão Funcional**: **Todos os botões, switches, atalhos, simulador de estados, teste de sirene, banco de dados de viagens, modo noturno e lógica de detecção por câmera (MediaPipe/Canvas) permanecem exatamente com suas ações atuais**.

---

## 2. Estratégia de Arquitetura & Design Visual (Modo PC)

### A. Domínio & Filosofia de Design
- **Domínio**: Dashboard de Engenharia Automotiva / Monitoramento Telemetria de Frota (conforme `3_saas_dashboard.md` do guia de design).
- **Estilo**: Industrial Minimalista de Alto Contraste.
- **Hierarquia Visual**:
  - **Topo**: Barra de Instrumentação Unificada com dados de hardware em tempo real (FPS, Conector Rasa, Latência da Sentinela, Duração da Viagem e controles de modo).
  - **Deck Central**: Status de Perigo/Alerta em padrão automotivo de alta visibilidade (Verde Nominal `#10B981`, Âmbar de Fadiga `#F59E0B`, Vermelho de Alerta Crítico `#EF4444`).
  - **Layout Dividido de Alta Densidade**:
    - **Lado Esquerdo (Telemetria & Hardware)**: Monitor de Visão Computacional com moldura industrial limpa, 4 gauges de precisão com valores tabulares (`font-mono tabular-nums`), touchpad de início/pausa e painel de calibração com botões de teste físico.
    - **Lado Direito (Terminal Rasa)**: Console vertical de comunicação com o motor Rasa, exibindo classificação de intenção, slots da viagem extraídos dinamicamente, histórico de mensagens com formatação executiva, ações rápidas em grade 2x2 e opções de exportação/cópia.

### B. Paleta de Cores & Superfícies (Regra 60-30-10)
- **60% Canvas**: `#020617` (Slate 950 ultra-profundo, absorção de reflexos).
- **30% Estrutura**: `#0B0F19` e `#111827` (painéis industriais com bordas finas `#1E293B` e destaques sutis).
- **10% Acentos Semânticos Funcionais**:
  - Âmbar de Alerta / Atenção (`#F59E0B` e `#FBBF24`)
  - Verde Esmeralda Operacional (`#10B981`)
  - Vermelho Crítico de Emergência (`#EF4444`)
  - Azul Elétrico Técnico Rasa (`#38BDF8` e `#0284C7`)

### C. Tipografia & Math Espacial
- **Família Display & Interface**: `Plus Jakarta Sans` / `Outfit` para títulos e botões limpos;
- **Família de Dados & Telemetria**: `JetBrains Mono` / `font-mono tabular-nums` para valores numéricos alinhados verticalmente;
- **Escala de Raios**: Padronização dos cantos para `rounded-xl` e `rounded-2xl` com proporção nested ($r_{inner} = r_{outer} - padding$).

---

## 3. Mudanças Propostas por Arquivo

### Backend / Serviços:

#### `server.ts`
- Implementar o **Motor Rasa NLU & Dialogue Core** no endpoint `/api/chat`:
  - Pipeline de NLU em português com classificação de intents veiculares (`intent: gerar_relatorio_viagem`, `intent: tempo_parada_descanso`, `intent: conducao_noturna`, `intent: explicacao_microssono`, `intent: legislacao_motorista`, `intent: calibracao_olhos`, `intent: saudacao_bot`, `intent: consulta_geral`).
  - Extrator de slots alimentado pela telemetria em tempo real (`duracao_viagem`, `alertas_sonolencia`, `microssonos_evitados`, `abertura_ocular_ear`, `indice_fadiga`).
  - Gerador executivo de respostas estruturadas com diagnóstico detalhado e planos de ação.
  - Conector nativo transparente para servidor Rasa REST externo (`RASA_ENDPOINT` ou `http://localhost:5005/webhooks/rest/webhook`) com chaveamento e fallback automático para a engine Rasa interna instantânea.

### Frontend / Componentes:

#### `src/components/AiChatbot.tsx`
- Atualizar a interface do chatbot para a identidade **Rasa Open Source AI**:
  - Badge de status do motor: `Rasa Core · NLU v3` com latência instantânea (`<15ms`).
  - Exibição sutil da intenção identificada e score de confiança (ex: `intencao: gerar_relatorio (99%)`).
  - Manter rigorosamente todos os botões de ação: atalhos rápidos de 1 clique, copiar texto, baixar relatório em `.md`, limpar histórico, recolher/expandir e campo de envio de texto.
  - Refinar o acabamento visual para a linguagem Industrial Minimalista (moldura técnica de terminal, contrastes nítidos e legibilidade impecável).

#### `src/components/CockpitHeader.tsx`
- Refinar a barra superior para estilo industrial automotivo:
  - Eliminar poluição visual e acentuar a distinção clara entre Modo PC e Modo Mobile.
  - Preservar rigorosamente todos os botões: alternar para Mobile, Banco de Dados, Mute/Unmute, Modo Noturno, Dicas e Configurações.

#### `src/components/FatigueGauge.tsx`
- Modernizar os gauges de telemetria:
  - Estilo de mostradores de precisão de instrumentos veiculares com números tabulares de alto contraste.
  - Barras com gradiente funcional para abertura de olhos esquerdo/direito, tempo de olhos fechados e bocejo.

#### `src/components/SimulatorBar.tsx`
- Refinar os botões de simulação e teste de sirene no estilo industrial de alta definição, preservando todos os gatilhos e funções de calibração.

#### `src/components/CameraFeed.tsx`
- Atualizar o enquadramento e os indicadores de visão computacional para o estilo industrial minimalista, com bordas finas e sobreposição de telemetria nítida.

#### `src/App.tsx`
- Integrar a composição completa em duas colunas sincronizadas no Modo PC, mantendo o chaveamento perfeito entre Modo PC e Modo Mobile, além de todas as rotinas de áudio e banco de dados.

---

## 4. Plano de Verificação

### Testes Automatizados & Compilação:
1. `npm run lint` (`tsc --noEmit`): Sem erros de tipagem TypeScript.
2. `compile_applet`: Build do Vite sem avisos ou falhas.
3. Teste do endpoint `/api/chat` via requisição REST: validação de retorno rápido com motor Rasa.

### Verificação Manual (Walkthrough):
1. **Modo PC Visual**:
   - Verificar a ergonomia industrial de alto contraste no desktop em 1440px / 1520px.
   - Conferir se os 4 gauges, o feed de câmera e o painel de calibração estão perfeitamente alinhados à esquerda.
2. **Copiloto Rasa**:
   - Enviar mensagem no chatbot e conferir resposta instantânea da engine Rasa com relatório analítico de viagem.
   - Testar botões de atalho rápido ("Gerar Relatório da Viagem", "Quando devo parar?", etc.).
   - Testar botões de "Copiar" e "Baixar Relatório (.md)".
3. **Preservação dos Botões**:
   - Clicar em "Testar Sirene" no painel de calibração e verificar o som.
   - Clicar em "Simular Dormindo", "Simular Sonolento" e "Simular Acordado".
   - Clicar em "Modo Mobile" e voltar para "Modo PC", certificando que nada quebrou.
   - Abrir o "Banco de Dados" e as "Configurações".
