import PouchDB from 'pouchdb';
import type { Project, Task } from '../store';

const db = new PouchDB<Project>('projects_db');

// --- HELPER: CALCULAR PROGRESO ---
export const getStats = (tasks: Task[]) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : (completed / total) * 100;
  const budget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
  return { percentage, completed, total, budget };
};

// --- UTILITIES FOR BASE64 CONVERSION ---
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to base64."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
export const base64toBlob = (base64: string, contentType: string = ''): Blob => {
    const byteString = atob(base64.split(',')[1]); // Remove data URL prefix
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: contentType });
};

export const getAllProjects = async (): Promise<(Project & { _rev: string })[]> => {
    const allDocs = await db.allDocs({ include_docs: true });
    return allDocs.rows.map(row => row.doc).filter((doc): doc is Project & { _rev: string } => !!doc);
};

export const getProject = async (id: string): Promise<Project & { _rev: string }> => {
    return await db.get(id);
}

export const addProject = async (project: Project): Promise<void> => {
    await db.put(project);
};

export const updateProject = async (project: Project): Promise<void> => {
    await db.put(project);
};

export const deleteProject = async (id: string): Promise<void> => {
    const doc = await db.get(id);
    await db.remove(doc);
};

export const getAttachment = async (docId: string, attachmentId: string): Promise<Blob> => {
    return await db.getAttachment(docId, attachmentId);
}

export const addAttachment = async (docId: string, rev: string, attachmentId: string, file: File): Promise<PouchDB.Core.Response> => {
    return await db.putAttachment(docId, attachmentId, rev, file, file.type);
}

export const removeAttachment = async (docId: string, attachmentId: string, rev: string): Promise<PouchDB.Core.Response> => {
    return await db.removeAttachment(docId, attachmentId, rev);
}

export const dbInstance = db;
