# CONTEXTO DEL PROYECTO: Gestor de Proyectos

## 1. Visión General del Proyecto

Este es un **Gestor de Proyectos (Task Manager)**, una aplicación de página única (SPA) construida con **React**. Permite a los usuarios crear, visualizar, actualizar y eliminar proyectos. Cada proyecto contiene una lista de tareas con detalles como responsable, presupuesto, fechas y estado de finalización. La aplicación es completamente _offline-first_, almacenando todos los datos localmente en el navegador del usuario a través de **PouchDB**.

## 2. Arquitectura y Tecnologías

La arquitectura de la aplicación se centra en un stack moderno de desarrollo frontend con las siguientes tecnologías clave:

- **Framework Principal:** **React 19** con Hooks. La estructura se basa en componentes funcionales.
- **Vite:** Se utiliza como la herramienta de construcción y servidor de desarrollo, lo que proporciona un arranque rápido y _Hot Module Replacement_ (HMR).
- **TypeScript:** Todo el código está escrito en TypeScript, asegurando un tipado estricto y una mejor mantenibilidad.
- **Gestión de Estado:** **Redux Toolkit** para la gestión del estado global. El estado principal (`projects`) se sincroniza con PouchDB, pero Redux actúa como una capa de "verdad" síncrona para la UI.
- **Enrutamiento:** **React Router DOM v7** para gestionar las rutas de la aplicación. Las rutas principales son el Dashboard (`/`) y la vista de detalle del proyecto (`/project/:id`).
- **Base de Datos Local:** **PouchDB** para el almacenamiento de datos del lado del cliente. Esto permite que la aplicación funcione sin conexión y persista los datos entre sesiones.
- **Componentes de UI:** **Material-UI (MUI)** para construir la interfaz de usuario. Se utiliza su sistema de componentes, iconos y un sistema de theming (claro/oscuro).
- **Estilos:** CSS plano (`App.css`, `index.css`) y estilos en línea de MUI.
- **Linting:** **ESLint** para mantener la calidad y consistencia del código.

## 3. Estructura del Proyecto

El proyecto sigue una estructura típica para una aplicación React:

```
/
├── public/              # Archivos estáticos públicos
├── src/                 # Código fuente de la aplicación
│   ├── assets/          # Imágenes y otros recursos
│   ├── App.css          # Estilos generales para App.tsx
│   ├── App.tsx          # Componente principal que contiene la lógica de las vistas
│   ├── hooks.ts         # Hooks personalizados de Redux (useAppDispatch, useAppSelector)
│   ├── index.css        # Estilos globales
│   ├── main.tsx         # Punto de entrada de la aplicación
│   ├── store.ts         # Configuración de Redux Toolkit (slice y store)
│   ├── theme.ts         # Definiciones de los temas claro y oscuro de MUI
│   └── ThemeContext.tsx # Contexto de React para gestionar el cambio de tema
├── .gitignore
├── package.json         # Dependencias y scripts del proyecto
├── vite.config.ts       # Configuración de Vite
└── tsconfig.json        # Configuración de TypeScript
```

## 4. Lógica de Componentes y Flujo de Datos

### Componentes Principales

- **`App.tsx`**: Es el corazón de la aplicación. Contiene la definición de las rutas y la lógica para cargar los proyectos desde PouchDB al estado de Redux al iniciar la aplicación. También incluye los componentes para las vistas principales: `Dashboard` y `ProjectDetail`.
- **`Dashboard.tsx` (dentro de `App.tsx`)**: La vista principal. Muestra una lista de todos los proyectos, permite crear nuevos proyectos y proporciona funciones para importar/exportar datos.
- **`ProjectDetail.tsx` (dentro de `App.tsx`)**: Muestra los detalles de un proyecto específico, incluyendo su lista de tareas. Desde aquí se pueden añadir, editar y eliminar tareas.
- **`TaskFormModal.tsx` (dentro de `App.tsx`)**: Un modal reutilizable para crear y editar tareas. Incluye la lógica para manejar la subida de imágenes.

### Flujo de Datos

1.  **Arranque:** `main.tsx` renderiza `App`. `App` obtiene todos los proyectos de `PouchDB` y los carga en el `store` de Redux usando `dispatch(setProjects(docs))`.
2.  **Visualización:** Los componentes (`Dashboard`, `ProjectDetail`) leen los datos del `store` de Redux usando el hook `useAppSelector`.
3.  **Modificación de Datos (Proyectos):**
    -   Cuando un usuario crea un proyecto en el `Dashboard`, se despacha la acción `addProject`.
    -   El `reducer` de Redux actualiza el estado y, simultáneamente, guarda el nuevo proyecto en `PouchDB`.
4.  **Modificación de Datos (Tareas):**
    -   Las tareas son parte del objeto `project`. Cuando se guarda una tarea (crear/editar), se actualiza el array de tareas del proyecto correspondiente.
    -   Luego, se despacha la acción `updateProject` con el objeto de proyecto completo y actualizado.
    -   El `reducer` actualiza el `store` y `PouchDB` con el proyecto modificado.
5.  **Gestión de Tema:** `ThemeContext.tsx` gestiona el estado del tema (claro/oscuro), guardando la preferencia del usuario en `localStorage`.

## 5. Convenciones y Estilo de Programación

- **Componentes Funcionales y Hooks:** El código utiliza exclusivamente componentes funcionales de React y aprovecha los hooks (`useState`, `useEffect`, `useDispatch`, `useSelector`).
- **Tipado Estricto:** Se hace un uso extensivo de las interfaces de TypeScript (`Project`, `Task`) para asegurar la consistencia de los datos en toda la aplicación.
- **Nombres de Archivos:** Los componentes de React usan la extensión `.tsx`.
- **Alias de Importación:** Se ha configurado un alias `@` para apuntar a `./src/` en `vite.config.ts` y `tsconfig.json`, permitiendo importaciones más limpias (ej. `import Component from '@/components/MyComponent'`).
- **Manejo de Asincronía:** Se utiliza `async/await` para interactuar con PouchDB.

## 6. Funcionalidades Clave

- **CRUD de Proyectos y Tareas:** Funcionalidad completa para Crear, Leer, Actualizar y Eliminar tanto proyectos como tareas.
- **Persistencia Local:** Todos los datos se guardan en el navegador, haciendo que la aplicación sea funcional sin conexión a internet.
- **Cálculo de Progreso:** La aplicación calcula y muestra el progreso de cada proyecto basándose en el número de tareas completadas.
- **Gestión de Presupuesto:** Suma los presupuestos de las tareas para mostrar un presupuesto total por proyecto.
- **Adjuntar Imágenes a Tareas:** Permite adjuntar hasta 3 imágenes por tarea, las cuales se almacenan como `attachments` en PouchDB.
- **Importar/Exportar Datos:** Funcionalidad para exportar todos los datos (proyectos, tareas e imágenes codificadas en base64) a un archivo JSON, y para importarlos de nuevo a la aplicación.
- **Tema Claro/Oscuro:** El usuario puede cambiar entre un tema claro y uno oscuro. La preferencia se guarda localmente.
