# AI Video Studio

Aplicación local inspirada en el flujo funcional de ClipShort, diseñada para transformar una idea libre en un video vertical MP4 listo para TikTok, Instagram Reels y YouTube Shorts.

## Estado actual

Esta primera entrega **no implementa todavía el pipeline completo**. Queda resuelta la base técnica solicitada:

- análisis de arquitectura inicial;
- estructura de carpetas local-first;
- frontend Angular con Angular Material;
- backend Node.js + Express + TypeScript estricto;
- interfaces compartidas para IA y proyectos;
- persistencia por archivos JSON;
- API básica con `health check`;
- motor de generación de guion con Ollama y validación de JSON;
- preparación del frontend para Netlify.

## Arquitectura propuesta

### 1. Frontend

- **Angular + TypeScript estricto**
- **Angular Material** para layout, cards, listas y componentes base
- panel inicial responsive preparado para:
  - crear proyectos;
  - consultar estado;
  - mostrar progreso por etapas;
  - listar renders finales.

### 2. Backend

- **Express + TypeScript**
- estructura modular para separar:
  - configuración;
  - rutas;
  - servicios;
  - almacenamiento local;
  - jobs de generación;
  - proveedores de IA.

### 3. Abstracción de IA

El directorio `shared/` define interfaces para desacoplar proveedores:

- `LlmProvider` → pensado para Ollama hoy, API externa mañana.
- `TtsProvider` → pensado para Piper hoy, API externa mañana.
- `ImageProvider` → pensado para un motor local configurable hoy, API externa mañana.

Esto permite sustituir la implementación sin reescribir el resto del sistema.

### 4. Persistencia local

No se usa base de datos. Cada proyecto se guarda bajo:

```text
generated/projects/{projectId}/
├── project.json
├── script.json
├── audio/
├── images/
├── subtitles/
├── music/
├── renders/
└── final/
```

El backend ya incluye un `ProjectStoreService` para:

- asegurar la estructura;
- crear proyectos nuevos;
- leer proyectos;
- listar proyectos existentes.

### 5. Jobs y no bloqueo

En esta iteración sólo queda creado el registro base de jobs, pero la arquitectura ya está encaminada para ejecutar:

- generación asíncrona;
- progreso en tiempo real;
- cancelación;
- render no bloqueante.

La siguiente fase natural es mover el pipeline a workers o procesos desacoplados que orquesten Ollama, Piper, generación de imágenes y FFmpeg.

## Estructura del repositorio

```text
ai-video-studio/
├── frontend/
├── backend/
├── generated/
│   └── projects/
├── models/
├── scripts/
├── temp/
├── shared/
└── README.md
```

## Variables de entorno

Crear un archivo `backend/.env` a partir de `backend/.env.example`.

```env
PORT=3000
CORS_ORIGIN=http://localhost:4200
PROJECTS_ROOT=
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
PIPER_BINARY_PATH=/usr/local/bin/piper
IMAGE_PROVIDER_MODE=local
```

Si `PROJECTS_ROOT` queda vacío, el sistema usa automáticamente:

`/home/runner/work/clipsRD/clipsRD/generated/projects`

## Instalación

### Requisitos

- Node.js 24+
- npm 11+

### 1. Frontend

```bash
cd /home/runner/work/clipsRD/clipsRD/frontend
npm install
npm start
```

Frontend disponible en:

- `http://localhost:4200`

### 2. Backend

```bash
cd /home/runner/work/clipsRD/clipsRD/backend
cp .env.example .env
npm install
npm run dev
```

Backend disponible en:

- `http://localhost:3000`

## Scripts útiles

### Frontend

```bash
cd /home/runner/work/clipsRD/clipsRD/frontend
npm run build
```

### Backend

```bash
cd /home/runner/work/clipsRD/clipsRD/backend
npm run build
```

## API disponible

### Health check

`GET /api/health`

Respuesta esperada:

```json
{
  "service": "ai-video-studio-backend",
  "status": "ok",
  "timestamp": "2026-08-21T00:00:00.000Z",
  "storage": {
    "projectsRoot": "/absolute/path/generated/projects",
    "totalProjects": 0
  },
  "jobs": {
    "active": 0
  }
}
```

### Proyectos

- `GET /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects`
- `POST /api/script/generate`

Ejemplo mínimo de creación:

```json
{
  "idea": "Crea un video de 60 segundos sobre 5 misterios del océano",
  "durationSeconds": 60
}
```

### Generación de guion

`POST /api/script/generate`

Ejemplo mínimo:

```json
{
  "projectId": "mi-proyecto-abc12345",
  "prompt": "Explica un misterio real del océano con ritmo y cierre natural.",
  "language": "es",
  "duration": 60,
  "niche": "ciencia",
  "tone": "intrigante"
}
```

El backend genera 5 hooks, selecciona el de mayor potencial de retención, construye el guion estructurado y persiste el resultado en `generated/projects/{projectId}/script.json`.

## Netlify

Se añadió `netlify.toml` para publicar el frontend Angular como sitio estático.

Puntos importantes:

- Netlify compila únicamente el **frontend**;
- el **backend sigue siendo local** en esta fase;
- la SPA queda cubierta con redirect a `index.html`.

## Verificación realizada

Antes de cerrar la tarea se debe verificar:

- compilación del frontend;
- compilación del backend.

Esta base queda lista para que después solicites la siguiente fase del pipeline sin adelantar funcionalidades no pedidas.