import { MedicalRecord } from './geminiService';

export interface SavedConsultation {
  id: string;
  patientName: string;
  createdAt: number;
  updatedAt: number;
  durationSeconds?: number;
  audioBlob?: Blob;
  audioFileName?: string;
  audioMimeType?: string;
  transcription?: string;
  medicalRecord?: MedicalRecord;
}

export interface ConsultationSummary {
  id: string;
  patientName: string;
  createdAt: number;
  updatedAt: number;
  hasAudio: boolean;
  audioFileName?: string;
  audioSizeBytes?: number;
  hasTranscription: boolean;
  hasRecord: boolean;
  recordPreview?: string;
}

const DB_NAME = 'MedScribeDB';
const DB_VERSION = 1;
const STORE_NAME = 'consultations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('patientName', 'patientName', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva ou atualiza uma consulta no IndexedDB
 */
export async function saveConsultation(consultation: SavedConsultation): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const recordToSave = {
      ...consultation,
      updatedAt: Date.now(),
    };

    const request = store.put(recordToSave);
    request.onsuccess = () => resolve(consultation.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Busca uma consulta completa por ID (incluindo o Blob de áudio se houver)
 */
export async function getConsultation(id: string): Promise<SavedConsultation | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lista sumários leves de consultas ordenadas pelas mais recentes (sem carregar os Blobs pesados em memória)
 */
export async function listConsultationSummaries(): Promise<ConsultationSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // decrescente (mais recente primeiro)

    const summaries: ConsultationSummary[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const val = cursor.value as SavedConsultation;
        summaries.push({
          id: val.id,
          patientName: val.patientName || 'Paciente não identificado',
          createdAt: val.createdAt,
          updatedAt: val.updatedAt || val.createdAt,
          hasAudio: !!val.audioBlob,
          audioFileName: val.audioFileName,
          audioSizeBytes: val.audioBlob ? val.audioBlob.size : undefined,
          hasTranscription: !!val.transcription && val.transcription.trim().length > 0,
          hasRecord: !!val.medicalRecord,
          recordPreview: val.medicalRecord?.hpma ? val.medicalRecord.hpma.slice(0, 120) + '...' : undefined,
        });
        cursor.continue();
      } else {
        resolve(summaries);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Deleta uma consulta por ID
 */
export async function deleteConsultation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Limpa todo o histórico
 */
export async function clearAllConsultations(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
