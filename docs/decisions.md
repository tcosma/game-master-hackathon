# Decisiones

## Decisiones Técnicas

1. **Uso de Agentes Especializados**
   - **Razón**: Simplificar la lógica y mejorar la mantenibilidad.
   - **Beneficios**: Reducción de errores, facilidad para añadir nuevas funcionalidades.

2. **Clasificación de Texto**
   - **Razón**: Automatizar la interpretación del contexto.
   - **Beneficios**: Mayor eficiencia en la gestión de solicitudes.

3. **Embeddings Vectoriales**
   - **Razón**: Optimizar la búsqueda de reglas.
   - **Beneficios**: Búsqueda rápida y precisa.

4. **Uso de modelos de 'pequeño' tamaño**
   - **Razón**: Minimizar costes máximizando la experiencia de usuario.
   - **Beneficios**: Mínimos costes sin afectar la experiencia de usuario.


## Decisiones de Diseño

1. **Persistencia de Sesiones**
   - **Razón**: Permitir cambios entre personajes.
   - **Implementación**: Campo `updated_at` en la tabla `sessions`.
   - **Beneficio**: Permitir continuar batallas entre diferentes personajes.


2. **Evitar Duplicados de Personajes**
   - **Razón**: Asegurar nombres únicos para un mismo usuario.
   - **Implementación**: Claves primarias únicas en la tabla `personajes`.

3. **Selección de Monstruos Aleatorios**
   - **Razón**: Proporcionar variedad.
   - **Implementación**: Consulta SQL: `SELECT * FROM monstruos ORDER BY RANDOM() LIMIT 1;`.

4. **Reglas del Juego en Embeddings**
   - **Razón**: Facilitar consultas rápidas.
   - **Implementación**: Tabla `documents` con campos `content` y `embedding`.