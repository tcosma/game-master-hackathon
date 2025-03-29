# Arquitectura

## Componentes Principales

### Base de Datos (Supabase)
- **Tablas Relevantes**:
  - `sessions`: Gestiona sesiones de usuarios.
  - `personajes`: Almacena información de personajes.
  - `fights`: Registra detalles de peleas.
  - `monstruos`: Contiene información de monstruos.
  - `documents`: Almacena embeddings vectoriales.

### Flujo de Trabajo (n8n)
- **Telegram Trigger**: Inicia el flujo.
- **AI Agent**: Interpreta el contexto del mensaje.
- **Text Classifier**: Clasifica el texto del usuario.
- **Agentes Especializados**:
- **Agentes Final**


### Modelos de Lenguaje (LLM)
- Modelos como OpenAI Chat Model y Google Gemini Chat Model.

### Persistencia de Datos
- Sesiones gestionadas mediante timestamps (`updated_at`).
- Partidas persistentes en la tabla `fights`.

## Diagrama de Flujos
- **Flujo Principal**:
  1. Telegram Trigger → AI Agent → Text Classifier → Agentes Especializados → Agente Final.
- **Ejemplo de Flujo Secundario (Creación de Personajes)**:
  1. Telegram Trigger → AI Agent → Creación de Personajes → Actualizador de Partidas → Agente Final.