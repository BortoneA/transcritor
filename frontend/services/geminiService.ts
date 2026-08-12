// Refactored to delegate API calls to Node.js backend.


export const DEFAULT_SYSTEM_INSTRUCTION = `
Você deve ler uma transcrição bruta de consulta médica (com erros de fala, trocas fonéticas, falhas de reconhecimento e trechos informais) e produzir uma saída clínica padronizada.

REGRAS CENTRAIS DE EXECUÇÃO
1. Fidelidade Absoluta ao Conteúdo da Transcrição
Baseie-se exclusivamente no que foi dito. Não adicione informações externas, hipóteses clínicas, interpretações diagnósticas ou contextos não verbalizados. Não explique causas, mecanismos ou significados médicos. Você pode condensar repetições, desde que mantenha todas as informações essenciais. EVITE "FOI CITADO", foi mencionado. Faça com rigor técnico.

2. Interpretação Segura de Erros de Transcrição (Alta Confiança Apenas)
Corrija somente quando houver forte evidência contextual + fonética. Priorize: Erros fonéticos comuns (Ex.: "metformino" -> metformina), Termos médicos usuais abreviados ("PA" -> pressão arterial), Termos leigos com equivalente técnico claro ("dor de cabeça forte" -> cefaleia intensa). Se não houver certeza, pesquise na internet O NOME COMERCIAL MAIS PRÓXIMO, nunca mantenha o termo original e nunca use entre aspas. Nunca altere nada que mude o significado clínico.

3. Regras Específicas por Categoria
3.1 Medicamentos: Padronize apenas se o nome estiver claro e inequívoco. Use forma farmacêutica e grafia corretas. Use o termo transcrito quando houver dúvida.
3.2 Sintomas e Sinais: Use vocabulário médico padrão quando claramente inferível. Mantenha linguagem leiga quando não houver equivalente específico.
3.3 Exames e Procedimentos: Expanda siglas usuais. Não invente resultados nem interpretações.
3.4 CID-10: Inclua apenas códigos mencionados ou diretamente mapeáveis sem ambiguidade. Use o código mais específico possível. Se nada for seguro -> deixe vazio.
3.5 CONDUTAS:
- OBRIGATÓRIO: Formato de tópicos (bullet points, usando o caractere • ou -).
- OBRIGATÓRIO: Verbos sempre na PRIMEIRA PESSOA DO SINGULAR (ex: "Prescrevo", "Oriento", "Solicito", "Encaminho", "Faço").

4. Limites Rígidos
Proibido inferir diagnóstico. Proibido sugerir evolução, riscos ou planos não verbalizados. Proibido melhorar a história ("paciente nega", "paciente parece", etc.). Em caso de termo possivelmente errado, mas sem contexto suficiente -> manter como dito originalmente.

5. Linguagem e Estilo
Formato de prontuário médico. Terceira pessoa na HPMA: "Paciente refere...". Objetivo, conciso, técnico. Sem comentários, explicações, justificativas ou introduções. Sem mencionar erros da transcrição.

6. Manejo de Transcrições com Ruído Extremo
Se mais de 20% do conteúdo estiver ininteligível: Inicie a saída com a tag: [Transcrição parcial - análise limitada]. Produza as seções normalmente usando apenas o que for compreensível.

SUGESTÃO DE CONDUTAS: CASO TENHA FALTADO ALGO QUE SEJA RESPALDADO NA LITERATURA CIENTÍFICA, FAVOR ACRESCENTAR COMO SUGESTÃO NESSE TÓPICO EXPLICANDO O PORQUÊ.
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
 * Compresses an audio/video file by downsampling it to 8kHz Mono WAV.
 * This drastically reduces file size for large recordings or video files.
 */
export const compressAudioFile = async (file: File, onProgress?: (msg: string) => void): Promise<File> => {
  try {
    if (onProgress) onProgress("Lendo arquivo original...");
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress("Decodificando mídia (isso pode levar um momento)...");
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    if (onProgress) onProgress("Otimizando áudio para IA (8kHz Mono)...");
    const targetSampleRate = 8000; // 8kHz is highly optimized for speech and reduces size significantly
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

    if (onProgress) onProgress("Gerando arquivo final...");
    const wavBlob = audioBufferToWav(renderedBuffer);

    if (wavBlob.size > file.size && file.type.startsWith('audio/')) {
      console.log("Arquivo original é menor que o WAV compactado. Usando original.");
      return file;
    }

    const fileName = file.name || 'audio';
    return new File([wavBlob], `otimizado-${fileName}.wav`, { type: 'audio/wav' });
  } catch (error) {
    console.error("Compression error:", error);
    return file;
  }
};

/**
 * Transcribes an audio file using AssemblyAI.
 */
export const transcribeAudio = async (file: File, _unusedApiKey: string, language: string = 'pt', onStatusUpdate?: (status: string) => void): Promise<string> => {
  try {
    let fileToUpload = file;

    if (file.size > 10 * 1024 * 1024 || file.type.startsWith('video/') || file.type.includes('webm')) {
      fileToUpload = await compressAudioFile(file, onStatusUpdate);
    }

    if (onStatusUpdate) onStatusUpdate("Enviando áudio para o servidor...");
    
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

    if (onStatusUpdate) onStatusUpdate("Solicitando transcrição...");
    
    // 2. Request transcription via backend proxy
    const transcriptResponse = await fetch('/api/assembly/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: language,
        keyIndex: keyIndex
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

    if (onStatusUpdate) onStatusUpdate("Processando transcrição (isso pode levar alguns minutos)...");

    while (true) {
      const pollingResponse = await fetch(`/api/assembly/transcript/${transcriptId}?keyIndex=${keyIndex}`);
      
      if (!pollingResponse.ok) {
        const errText = await pollingResponse.text().catch(() => '');
        throw new Error(`Falha ao verificar status (${pollingResponse.status}): ${errText}`);
      }

      const pollingData = await pollingResponse.json();

      if (pollingData.status === 'completed') {
        if (onStatusUpdate) onStatusUpdate("Transcrição concluída!");
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
