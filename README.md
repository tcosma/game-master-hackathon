# Microservicio RPG Game

Este microservicio es parte de un juego de rol basado en LLM. Proporciona APIs para consultar la última pelea del último personaje de un chat específico.

## Instalación y ejecución local

1. Instalar dependencias:
```
pip install -r requirements.txt
```

2. Configurar variables de entorno:
```
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_key
```

3. Ejecutar el servidor:
```
python main.py
```

## Despliegue en Heroku

1. Crear una aplicación en Heroku:
```
heroku create rpg-game-microservice
```

2. Configurar variables de entorno:
```
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_KEY=your_supabase_key
```

3. Desplegar la aplicación:
```
git push heroku main
```

## Integración con N8N

Para usar este microservicio en un workflow de N8N:

1. Añadir un nodo "HTTP Request" en N8N
2. Configurar como POST a `https://tu-app-heroku.herokuapp.com/last-fight`
3. Añadir en el cuerpo JSON: `{"chat_id": "{{$node['Telegram Trigger'].json.message.chat.id}}"}` 
4. El resultado puede usarse en nodos posteriores como `{{$node['HTTP Request'].json.fight}}`

## APIs disponibles

- `GET /`: Verificar que el servicio está funcionando
- `POST /last-fight`: Obtener la última pelea (usando función RPC)
- `POST /last-fight-raw`: Obtener la última pelea (usando consulta SQL directa)
