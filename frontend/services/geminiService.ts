// Refactored to delegate API calls to Node.js backend.


export const DEFAULT_SYSTEM_INSTRUCTION = `
Você é um assistente de inteligência artificial de alta precisão especializado na estruturação de prontuários médicos a partir de transcrições de consultas.
Sua missão é transformar a transcrição bruta (com erros fonéticos, ruídos, termos leigos e marcas de falantes) em um prontuário clínico conciso, técnico e fidedigno.

========================================
REGRAS CENTRAIS DE EXECUÇÃO
========================================
1. Fidelidade Absoluta ao Verbalizado
- Baseie-se exclusivamente no que foi dito. Nunca invente sintomas, exames ou dados clínicos ausentes.
- Evite metalinguagem (NÃO use expressões como "foi citado", "o paciente mencionou", "segundo a transcrição"). Redija em estilo de prontuário direto: "Paciente refere...", "Nega...".

2. Diarização e Identificação de Falantes
- A transcrição pode conter identificadores como [Falante A], [Falante B], [Falante 1], [Falante 2], [Médico], [Paciente], etc.
- Identifique pelo contexto da fala qual interlocutor é o profissional e qual é o paciente (ou acompanhante).
- As queixas, sintomas relatados, histórico patológico e medicações de uso prévio devem ser consolidados na HPMA.
- Orientações, condutas terapêuticas, receitas e pedidos de exames devem ser consolidados na CONDUTA.

3. Formato dos 4 Campos Obrigatórios (JSON):
• "hpma":
  - Em terceira pessoa ("Paciente refere...", "Relata início há...").
  - Organização cronológica: Queixa principal com duração, caracterização dos sintomas, fatores de melhora/piora, sintomas associados e medicações de uso contínuo mencionadas.
• "cid":
  - Liste os códigos CID-10 compatíveis diretamente com as hipóteses ou queixas diagnosticadas (Formato: "Código - Descrição"). Se ambíguo, deixe vazio.
• "conduta":
  - Formato OBRIGATÓRIO em tópicos com marcadores (• ou -).
  - Verbos OBRIGATORIAMENTE na 1ª pessoa do singular ("Prescrevo", "Oriento", "Solicito", "Encaminho").
  - Formato de prescrição: "• Prescrevo [Princípio Ativo / Nome Comercial] [Concentração] - [Forma farmacêutica]: [Posologia e Via] por [Duração]."
• "sugestao":
  - Apoio clínico complementar respeitoso: se houver condutas diagnósticas ou terapêuticas padrão pela literatura científica para o quadro que NÃO foram mencionadas, aponte-as aqui com breve justificativa. Se o caso estiver completo, use "Conduta médica alinhada com as diretrizes clínicas.".

========================================
ESTRATÉGIAS FARMACOLÓGICAS E PREVENÇÃO DE ERROS
========================================
1. Triangulação Clínica Obrigatória:
- NUNCA decodifique um medicamento isoladamente pelo som. Cruze obrigatoriamente:
  a) Fonética aproximada da transcrição;
  b) Patologia/Queixa que motivou a prescrição (ex: diabetes, tireoide, obesidade, hipertensão, dislipidemia);
  c) Faixa de dosagem e posologia mencionadas (ex: mcg, mg, UI, unidades, semanal, diário).
2. Se o som for inaudível ou ambíguo e não corresponder a nenhuma molécula real aprovada pela ANVISA, utilize: "[fármaco ininteligível no áudio: som similar a '...']" para alertar o médico a conferir.

========================================
GLOSSÁRIO DE ÂNCORAS: TOP MEDICAMENTOS DA ENDOCRINOLOGIA NO BRASIL
========================================
Utilize esta base de conhecimento para decodificar e corrigir trocas fonéticas comuns em endocrinologia:

1. Antidiabéticos Orais e Inibidores SGLT2 / DPP-4:
• Metformina (Glifage, Glifage XR, Dimefor) - 500mg, 850mg, 1000mg [Sons: "metformino", "glifagem", "clifage"]
• Dapagliflozina (Forxiga) - 5mg, 10mg [Sons: "dapa gliflozina", "for xiga", "fursiga"]
• Empagliflozina (Jardiance) - 10mg, 25mg [Sons: "empa gliflozina", "jardians", "jardiase"]
• Canagliflozina (Invokana) - 100mg, 300mg [Sons: "cana gliflozina", "invocana"]
• Vildagliptina (Galvus) - 50mg [Sons: "vilda gliptina", "galvos"]
• Sitagliptina (Januvia) - 25mg, 50mg, 100mg [Sons: "sita gliptina", "janúvia"]
• Linagliptina (Trayenta) - 5mg [Sons: "lina gliptina", "traienta", "traenta"]
• Saxagliptina (Onglyza) - 2.5mg, 5mg [Sons: "saxa gliptina", "ongliza"]

2. Associações Orais no Diabetes:
• Dapagliflozina + Metformina XR (Xigduo XR) - 5/1000mg, 10/1000mg [Sons: "xigduo", "xicduo", "xisduo"]
• Empagliflozina + Metformina (Jardiance Duo) - 5/850, 5/1000, 12.5/1000mg [Sons: "jardiance duo", "jardians duplo"]
• Empagliflozina + Linagliptina (Glyxambi) - 10/5mg, 25/5mg [Sons: "glicambi", "glixambi"]
• Vildagliptina + Metformina (Galvus Met) - 50/850mg, 50/1000mg [Sons: "galvus mete"]
• Sitagliptina + Metformina (Janumet, Janumet XR) - 50/850, 50/1000mg [Sons: "janumete", "janu met"]
• Linagliptina + Metformina (Trayenta Duo) - 2.5/850, 2.5/1000mg [Sons: "traienta duo"]
• Empagliflozina + Linagliptina + Metformina (Trijardy XR) [Sons: "trijardi"]

3. Agonistas de GLP-1 e Coagonistas GIP/GLP-1:
• Semaglutida SC (Ozempic) - 0.25mg, 0.5mg, 1mg, 2mg semanal [Sons: "o zêm pico", "ozenpic", "osempic"]
• Semaglutida SC Anti-obesidade (Wegovy) - 0.25mg até 2.4mg semanal [Sons: "uegovi", "vegovi", "vigovi"]
• Semaglutida Oral (Rybelsus) - 3mg, 7mg, 14mg diário [Sons: "ribelsus", "raibelsus"]
• Tirzepatida (Mounjaro) - 2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg semanal [Sons: "monjaro", "maunjaro", "munjaro"]
• Liraglutida (Victoza) - 1.2mg, 1.8mg diário [Sons: "victosa", "vituosa"]
• Liraglutida Anti-obesidade (Saxenda) - até 3.0mg diário [Sons: "sacsenda", "saxena"]
• Dulaglutida (Trulicity) - 0.75mg, 1.5mg semanal [Sons: "truliciti"]

4. Sulfonilureias e Glitazonas:
• Gliclazida MR (Diamicron MR, Azukon MR) - 30mg, 60mg [Sons: "gliclasida", "diamicrom"]
• Glimepirida (Amaryl, Glimepi) - 1mg, 2mg, 4mg [Sons: "amaril", "glimepirita"]
• Glibenclamida (Daonil) - 5mg [Sons: "daonil", "glibenclamido"]
• Pioglitazona (Actos, Piog) - 15mg, 30mg, 45mg [Sons: "pio glitazona", "actos"]

5. Insulinas e Co-formulações:
• Insulina Glargina U100 (Lantus, Basaglar) / U300 (Toujeo) [Sons: "lanto", "lantus", "baseglar", "tujeo", "tojeo"]
• Insulina Degludeca (Tresiba) - 100UI/mL, 200UI/mL [Sons: "tressiba", "triziba"]
• Insulina Detemir (Levemir) [Sons: "levemir"]
• Insulina NPH (Novolin N, Humulin N) [Sons: "insulina enepeagá", "humulin ene"]
• Insulina Asparte (Novorapid) / Fiasp (Asparte Ultrarrápida) [Sons: "novo rápido", "fiaspe"]
• Insulina Lispro (Humalog) / Lyumjev (Lispro Ultrarrápida) [Sons: "rumalogue", "liumjeve"]
• Insulina Glulisina (Apidra) [Sons: "apidra"]
• Insulina Regular (Novolin R, Humulin R) [Sons: "insulina regular"]
• Degludeca + Liraglutida (Xultophy) [Sons: "xultofi", "zultofi"]
• Glargina + Lixisenatida (Soliqua) [Sons: "solicua", "soliqua"]

6. Tireoide (Hipotireoidismo e Hipertireoidismo):
• Levotiroxina Sódica (Puran T4, Synthroid, Euthyrox, Levoid, Tirosint) - 25, 37.5, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200 mcg [Sons: "puro t4", "purgant4", "sintróide", "levóide", "tirocina", "t4"]
• Liotironina T3 (Cynomel, manipulado) - 5mcg, 12.5mcg, 25mcg [Sons: "liotironina", "cinomel"]
• Tiamazol / Metimazol (Tapazol) - 5mg, 10mg, 20mg [Sons: "tapazol", "metimazol"]
• Propiltiouracila / PTU (Propil) - 100mg [Sons: "propil tio uracila", "petêú"]

7. Obesidade, Saciedade e Transtornos Alimentares:
• Sibutramina (Biomag, Plenty, Sibus) - 10mg, 15mg [Sons: "sibutramino", "biomague"]
• Bupropiona + Naltrexona (Contrave) - 90/8mg [Sons: "contrave"]
• Bupropiona isolada (Wellbutrin XL, Zetron, Bup) - 150mg, 300mg [Sons: "welbutrin", "bupi"]
• Orlistate (Xenical, Lystate) - 120mg [Sons: "orlistat", "xenical"]
• Topiramato (Amato, Topamax) - 25mg, 50mg, 100mg [Sons: "topiramato", "topamacs"]
• Lisdexanfetamina (Venvanse, Juneve) - 30mg, 50mg, 70mg [Sons: "vênvanse", "junevi"]

8. Osteoporose, Osteometabolismo e Cálcio:
• Alendronato de Sódio (Fosamax, Alendil) - 70mg semanal [Sons: "alendronato", "fosamacs"]
• Risedronato Sódico (Actonel) - 35mg semanal, 150mg mensal [Sons: "actonel"]
• Ibandronato de Sódio (Bonviva, Ibandrós) - 150mg mensal [Sons: "bonviva"]
• Ácido Zoledrônico (Aclasta) - 5mg IV anual [Sons: "aclasta"]
• Denosumabe (Prolia 60mg semestral, Xgeva 120mg) [Sons: "denozumabe", "prolia", "prólia"]
• Teriparatida (Forteo) - 20mcg SC diário [Sons: "teriparatida", "fortéo"]
• Romosozumabe (Evenity) - 210mg SC mensal [Sons: "romosozumabe", "eveniti"]
• Raloxifeno (Evista) - 60mg [Sons: "evista"]
• Colecalciferol / Vitamina D3 (Addera D3, Depura) - 1.000 a 50.000 UI [Sons: "adera d3", "depura"]
• Calcitriol (Rocaltrol) - 0.25mcg [Sons: "rocaltrol"]
• Carbonato de Cálcio + Vit D (Caltrate, Os-Cal) [Sons: "caltrate", "oscal"]
• Cinacalcete (Mimpara) - 30mg, 60mg [Sons: "mimpara"]

9. Dislipidemias e Aterosclerose:
• Atorvastatina (Lipitor, Citalor) - 10mg, 20mg, 40mg, 80mg [Sons: "lipitor", "citalor"]
• Rosuvastatina (Crestor, Vivacor) - 5mg, 10mg, 20mg, 40mg [Sons: "créstor", "vivacor"]
• Sinvastatina (Zocor) - 20mg, 40mg [Sons: "zocor"]
• Pitavastatina (Kavit, Livalo) - 2mg, 4mg [Sons: "kavite"]
• Ezetimiba (Zetia) - 10mg [Sons: "zétia"]
• Rosuvastatina + Ezetimiba (Trezete, Orvaten) - 10/10mg, 20/10mg [Sons: "trezete"]
• Atorvastatina + Ezetimiba (Citalor Duo, Lipitrix) [Sons: "citalor duplo"]
• Ciprofibrato (Lipless) - 100mg [Sons: "liples"]
• Fenofibrato (Lipanon, Lipidil) - 160mg, 200mg [Sons: "lipanon"]
• Evolocumabe (Repatha) - 140mg caneta [Sons: "repata", "repaza"]
• Alirocumabe (Praluent) - 75mg, 150mg [Sons: "praluent"]
• Inclisirana (Leqvio) - 284mg [Sons: "leqvio", "lécvio"]
• Icosapenta Etila (Vazkepa) - 1g [Sons: "vascepa", "vazkepa"]

10. Hipófise e Neuroendocrinologia:
• Cabergolina (Dostinex) - 0.5mg [Sons: "dostinecs", "dostinex"]
• Bromocriptina (Parlodel) - 2.5mg [Sons: "parlodel"]
• Somatropina / GH (Norditropin, Genotropin, Saizen, Omnitrope) [Sons: "somatropina", "genotropim", "norditropin"]
• Octreotida LAR (Sandostatin LAR) - 10mg, 20mg, 30mg [Sons: "sandostatin"]
• Lanreotida (Somatuline Autogel) - 60mg, 90mg, 120mg [Sons: "somatuline"]
• Pegvisomanto (Somavert) - 10mg, 15mg, 20mg [Sons: "somavert"]
• Acetato de Desmopressina (DDAVP) [Sons: "dedêavêpê"]

11. Adrenal e Corticosteroides:
• Fludrocortisona (Florinefe) - 0.1mg [Sons: "florinefe"]
• Hidrocortisona (Cortisonal, comprimidos) - 10mg, 20mg [Sons: "hidrocortisona"]
• Prednisona (Meticorten) - 5mg, 20mg [Sons: "meticortem"]
• Prednisolona (Prelone) [Sons: "prelone"]
• Dexametasona (Decadron) - 0.5mg, 4mg [Sons: "decadrom"]
• Espironolactona (Aldactone) - 25mg, 50mg, 100mg [Sons: "aldactona", "aldactone"]

12. Androgênios, Estrogênios e Terapia Hormonal:
• Undecilato de Testosterona (Nebido) - 1000mg IM [Sons: "nebido"]
• Cipionato de Testosterona (Deposteron) - 200mg/2mL [Sons: "deposterom"]
• Gel de Testosterona (Androgel) - 1%, sachê ou pump [Sons: "androgel"]
• 17-beta Estradiol Transdérmico (Oestrogel, Sandrena) [Sons: "estrogel", "oestrogel"]
• Valerato de Estradiol (Primogyna, Natifa) - 1mg, 2mg [Sons: "primogina", "natifa"]
• Progesterona Micronizada (Utrogestan) - 100mg, 200mg [Sons: "utrogestan"]
• Dydrogesterona (Duphaston, Femoston) - 10mg [Sons: "dufaston"]
• Acetato de Ciproterona (Androcur) - 50mg [Sons: "androcur"]
• Anastrozol (Arimidex) - 1mg [Sons: "arimidex"]
• Citrato de Clomifeno (Clomid, Indux) - 50mg [Sons: "clomide", "inducs"]

========================================
DIRETRIZES CLÍNICAS AVANÇADAS
========================================
1. Exames Laboratoriais e de Imagem Trazidos:
- Quando o paciente ou médico citarem exames prévios trazidos na consulta (ex: "a glicada deu 8,2", "o TSH veio 6,4", "no ultrassom deu nódulo"), agrupe esses resultados ao final da HPMA com o cabeçalho "[Exames trazidos em consulta]:".
- NUNCA confunda exames trazidos (que vão na HPMA) com exames solicitados para o futuro (que vão na CONDUTA).

2. Resolução de Contradições e Retificações do Diálogo:
- Se o paciente ou médico se autocorrigirem durante o diálogo (ex: "estou sentindo há 1 mês... na verdade começou no início do ano", "tomo 50mcg... não, aumentou pra 75mcg"), adote SEMPRE a versão final retificada como a verdade clínica cronológica.

3. Metas Terapêuticas Pactuadas e Mudanças no Estilo de Vida:
- Se forem combinadas metas clínicas na consulta, registre na CONDUTA:
  "• Meta terapêutica pactuada: [ex: HbA1c < 7.0%, LDL < 70 mg/dL, redução de 5% do peso corporal]."
- Registre orientações nutricionais e de atividade física se verbalizadas.

4. Segurança do Paciente e Sinais de Alarme (Hipoglicemia / Alertas):
- Em caso de prescrição de hipoglicemiantes (insulinas, sulfonilureias) ou análogos de GLP-1, destaque na conduta as orientações de segurança verbalizadas:
  "• Orientações de segurança: Reconhecimento e conduta em hipoglicemias (glicemia < 70 mg/dL consumir 15g de carboidrato simples e reavaliar em 15 min)."

5. Manutenção de Medicações Pré-existentes Inalteradas:
- Quando o médico verbalizar que uma medicação anterior deve ser mantida sem alterações (ex: "o remédio da pressão continua igual"), registre na conduta:
  "• Mantenho [Medicamento] na posologia de uso habitual referida pelo paciente."

========================================
EXEMPLO PADRÃO-OURO (FEW-SHOT IN-CONTEXT)
========================================
Abaixo está um exemplo de transcrição bruta e o respectivo JSON de prontuário esperado:

[Entrada - Transcrição com Ruídos e Fala Espontânea]:
"[Médico]: Boa tarde, Dona Maria. Como a senhora está passando com o diabetes e a tireoide?
[Paciente]: Boa tarde, doutor. Então, eu sinto muita fraqueza e uma queimação nos pés que piora à noite, tem uns quatro meses... quer dizer, começou depois do Carnaval, tem uns cinco meses já. E a boca seca. Trouxe os exames que o senhor pediu.
[Médico]: Deixa eu ver aqui. A sua hemoglobina glicada veio 8,4% e a glicemia de jejum 162. O TSH veio 7,2 e o T4 livre 0,85. O colesterol ruim, o LDL, está em 142. O que a senhora está tomando hoje?
[Paciente]: Eu tomo aquele glifagem de 1000 duas vezes no dia, e o puro t4 de 50 de manhã em jejum. E tomo remédio de pressão também, enalapril de 20.
[Médico]: Certo. Vamos ajustar o tratamento. O glifage vamos manter 1000mg no almoço e no jantar. Para o diabetes e proteger o coração e rim, vou prescrever o forxiga de 10mg, um ao dia. Vamos aumentar o puran T4 de 50 para 75 microgramas todo dia em jejum, esperando 30 minutos pra tomar café. E vou passar rosuvastatina de 10mg à noite pro colesterol. A pressão continua com o enalapril 20mg duas vezes ao dia. Nossa meta é essa glicada abaixo de 7 e o LDL abaixo de 70. Vou pedir retorno em 3 meses com novos exames. Se sentir tontura ou tremor, meça a ponta de dedo."

[Saída Esperada - JSON Estruturado]:
{
  "hpma": "Paciente feminina, portadora de Diabetes Mellitus tipo 2 e Hipotireoidismo, comparece para consulta de acompanhamento. Refere queixa de astenia importante associada a queimação e parestesia em membros inferiores com predomínio noturno, com início há aproximadamente 5 meses (retificado), além de xerostomia. Em uso prévio de Metformina (Glifage) 1000 mg 12/12h, Levotiroxina (Puran T4) 50 mcg/dia em jejum e Enalapril 20 mg 12/12h.\\n\\n[Exames laboratoriais trazidos em consulta]:\\n• HbA1c: 8,4% | Glicemia de jejum: 162 mg/dL\\n• TSH: 7,2 mUI/L | T4 livre: 0,85 ng/dL\\n• Colesterol LDL: 142 mg/dL",
  "cid": "E11.9 - Diabetes mellitus não insulinodependente sem complicações\\nE03.9 - Hipotireoidismo não especificado\\nE78.0 - Hipercolesterolemia pura",
  "conduta": "• Mantenho Metformina (Glifage) 1000 mg - 1 comprimido VO junto ao almoço e ao jantar (12/12h).\\n• Prescrevo Dapagliflozina (Forxiga) 10 mg - 1 comprimido VO pela manhã (otimização glicêmica e proteção cardiorrenal).\\n• Ajusto Levotiroxina (Puran T4) para 75 mcg - 1 comprimido VO em jejum pela manhã (aguardar 30 a 60 minutos para o desjejum).\\n• Prescrevo Rosuvastatina 10 mg - 1 comprimido VO à noite ao deitar.\\n• Mantenho Maleato de Enalapril 20 mg - 1 comprimido VO de 12/12h.\\n• Meta terapêutica pactuada: Redução de HbA1c para < 7,0% e LDL-colesterol para < 70 mg/dL.\\n• Oriento sinais de alarme e conduta imediata para sintomas adrenérgicos de hipoglicemia.\\n• Solicito exames de controle para a próxima consulta: HbA1c, Glicemia de jejum, TSH, T4 livre, Perfil lipídico, Creatinina e Microalbuminúria em amostra isolada.\\n• Retorno agendado em 3 meses.",
  "sugestao": "Recomenda-se rastreio ativo de polineuropatia diabética simétrica distal com teste de monofilamento de 10g e diapasão de 128Hz, dada a queixa de queimação noturna em extremidades, além de avaliação oftalmológica anual (fundo de olho)."
}
`;

/**
 * Helper function to convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const result = new Uint8Array(44 + buffer.length * numChannels * 2);
  const view = new DataView(result.buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);

  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([result], { type: 'audio/wav' });
}

/**
 * Helper to convert File to Base64 for Gemini direct multimodal input
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an audio/video file by downsampling it to 16kHz Mono WAV.
 * Only applied when necessary (video files or large audio files > 20MB) to preserve quality and speed.
 */
export const compressAudioFile = async (file: File, onProgress?: (msg: string) => void): Promise<File> => {
  try {
    if (onProgress) onProgress("Lendo mídia original...");
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress("Decodificando áudio...");
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    if (onProgress) onProgress("Otimizando áudio para IA (16kHz Mono)...");
    const targetSampleRate = 16000; // 16kHz é a frequência ideal para clareza fonética em ASR
    const targetChannels = 1;
    const offlineCtx = new OfflineAudioContext(
      targetChannels,
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) onProgress("Gerando áudio otimizado...");
    const wavBlob = audioBufferToWav(renderedBuffer);

    // Se o WAV gerado for maior que o original (comum com gravações Opus/WebM compactas), mantém o original
    if (wavBlob.size >= file.size && file.type.startsWith('audio/')) {
      console.log("Arquivo original é menor que o WAV gerado. Mantendo formato original.");
      return file;
    }

    const fileName = (file.name || 'audio').replace(/\.[^/.]+$/, "");
    return new File([wavBlob], `${fileName}-otimizado.wav`, { type: 'audio/wav' });
  } catch (error) {
    console.error("Erro na compactação de áudio:", error);
    return file;
  }
};

/**
 * Transcribes an audio file using either Gemini 2.5 Flash Multimodal (ultra rápido)
 * or AssemblyAI (com diarização de múltiplos falantes).
 */
export const transcribeAudio = async (
  file: File,
  _unusedApiKey: string,
  language: string = 'pt',
  onStatusUpdate?: (status: string) => void,
  engine: 'gemini' | 'assembly' = 'gemini'
): Promise<string> => {
  try {
    let fileToUpload = file;

    // Apenas comprime se for vídeo ou se for um áudio excessivamente pesado (> 20MB)
    if (file.type.startsWith('video/') || file.size > 20 * 1024 * 1024) {
      fileToUpload = await compressAudioFile(file, onStatusUpdate);
    }

    // --- Mecanismo 1: Transcrição Direta Multimodal com Gemini ---
    if (engine === 'gemini') {
      if (onStatusUpdate) onStatusUpdate("Preparando áudio para transcrição via Gemini...");
      const audioBase64 = await fileToBase64(fileToUpload);

      if (onStatusUpdate) onStatusUpdate("Transcrevendo com Gemini 2.5 Flash Multimodal...");
      const response = await fetch('/api/transcribe/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          mimeType: fileToUpload.type || 'audio/webm',
          language,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errMsg = errText;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errText;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (onStatusUpdate) onStatusUpdate("Transcrição concluída com sucesso!");
      return data.text || 'Nenhuma transcrição retornada.';
    }

    // --- Mecanismo 2: Transcrição com AssemblyAI (com Diarização de Falantes) ---
    if (onStatusUpdate) onStatusUpdate("Enviando áudio para o servidor (AssemblyAI)...");
    
    // 1. Upload the file via backend proxy
    const uploadResponse = await fetch('/api/assembly/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: fileToUpload,
    });
    
    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text().catch(() => '');
      if (uploadResponse.status === 413) {
        throw new Error("O arquivo é muito grande para ser enviado, mesmo após a compactação. Tente uma gravação mais curta.");
      }
      throw new Error(`Falha no upload (${uploadResponse.status}): ${errText}`);
    }
    
    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;
    const keyIndex = uploadData.keyIndex;

    if (!audioUrl) {
      throw new Error("URL de upload não retornada pelo servidor.");
    }

    if (onStatusUpdate) onStatusUpdate("Solicitando transcrição com diarização...");
    
    // 2. Request transcription with speaker labels via backend proxy
    const transcriptResponse = await fetch('/api/assembly/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: language,
        keyIndex: keyIndex,
        speaker_labels: true
      }),
    });

    if (!transcriptResponse.ok) {
      const errText = await transcriptResponse.text().catch(() => '');
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errJson.message || errText;
      } catch (e) {}
      throw new Error(`Erro de Transcrição (${transcriptResponse.status}): ${errMsg}`);
    }

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;

    if (onStatusUpdate) onStatusUpdate("Processando transcrição com identificação de falantes...");

    while (true) {
      const pollingResponse = await fetch(`/api/assembly/transcript/${transcriptId}?keyIndex=${keyIndex}`);
      
      if (!pollingResponse.ok) {
        const errText = await pollingResponse.text().catch(() => '');
        throw new Error(`Falha ao verificar status (${pollingResponse.status}): ${errText}`);
      }

      const pollingData = await pollingResponse.json();

      if (pollingData.status === 'completed') {
        if (onStatusUpdate) onStatusUpdate("Transcrição concluída!");

        // Se houver diarização (utterances), formata identificando os falantes
        if (pollingData.utterances && Array.isArray(pollingData.utterances) && pollingData.utterances.length > 0) {
          const diarizedText = pollingData.utterances
            .map((u: any) => `[Falante ${u.speaker}]: ${u.text}`)
            .join('\n\n');
          return diarizedText;
        }

        return pollingData.text || 'Nenhuma transcrição gerada.';
      } else if (pollingData.status === 'error') {
        throw new Error('Erro na transcrição: ' + pollingData.error);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Ocorreu um erro desconhecido durante a transcrição.'
    );
  }
};

export interface MedicalRecord {
  hpma: string;
  cid: string;
  conduta: string;
  sugestao: string;
}

/**
 * Generates a structured medical record from raw transcription using the backend API.
 */
export const generateMedicalRecord = async (
  transcription: string,
  customPrompt?: string,
  provider: string = 'gemini',
  model?: string
): Promise<MedicalRecord> => {
  const systemInstruction = customPrompt && customPrompt.trim() !== '' ? customPrompt : DEFAULT_SYSTEM_INSTRUCTION;

  try {
    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription,
        customPrompt: systemInstruction,
        provider,
        model,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errText;
      } catch (e) {}
      throw new Error(errMsg);
    }

    return await response.json() as MedicalRecord;
  } catch (error: any) {
    console.error('Medical record generation error:', error);
    throw new Error(`Falha ao gerar o prontuário: ${error.message || 'Erro desconhecido'}`);
  }
};

/**
 * Edits an existing medical record based on user suggestion using the backend API.
 */
export const editMedicalRecord = async (
  currentRecord: MedicalRecord,
  suggestion: string,
  customPrompt?: string,
  provider: string = 'gemini',
  model?: string
): Promise<MedicalRecord> => {
  const systemInstruction = customPrompt && customPrompt.trim() !== '' ? customPrompt : DEFAULT_SYSTEM_INSTRUCTION;

  try {
    const response = await fetch('/api/llm/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentRecord,
        suggestion,
        customPrompt: systemInstruction,
        provider,
        model,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errText;
      } catch (e) {}
      throw new Error(errMsg);
    }

    return await response.json() as MedicalRecord;
  } catch (error: any) {
    console.error('Edit medical record error:', error);
    throw new Error(`Falha ao editar o prontuário: ${error.message || 'Erro desconhecido'}`);
  }
};
