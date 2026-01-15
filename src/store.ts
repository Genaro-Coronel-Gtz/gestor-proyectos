import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { addProject as addProjectToDb, deleteProject as deleteProjectFromDb } from './services/pouchdbService';

// Definimos la interfaz de la Tarea
export interface Task {
  id: string;
  name: string;
  duration: string;
  startDate: string;
  endDate: string;
  estimatedTime: string;
  assignee: string;
  notes: string;
  budget: number;
  completed: boolean;
  photoAttachmentNames?: string[];
}

// Definimos la interfaz del Proyecto
export interface Project {
  _id: string;
  name: string;
  _rev?: string; // <--- Añade esta línea
  tasks: Task[];
}

interface ProjectsState {
  list: Project[];
}

const initialState: ProjectsState = {
  list: [],
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // Aquí especificamos que el payload es un array de Proyectos
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.list = action.payload;
    },
    // Aquí el payload es un solo objeto Proyecto
    addProject: (state, action: PayloadAction<Project>) => {
      state.list.push(action.payload);
      addProjectToDb(action.payload).catch(err => console.error("Error guardando en PouchDB:", err));
    },
    // Aquí pasamos el proyecto actualizado
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.list.findIndex(p => p._id === action.payload._id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
    // Aquí pasamos solo el ID del proyecto a eliminar
    deleteProject: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter(p => p._id !== action.payload);
      deleteProjectFromDb(action.payload).catch(err => console.error("Error borrando en PouchDB:", err));
    }
  }
});

export const store = configureStore({
  reducer: {
    projects: projectsSlice.reducer
  }
});

// Tipos para el uso en los hooks de React-Redux
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { setProjects, addProject, updateProject, deleteProject } = projectsSlice.actions;