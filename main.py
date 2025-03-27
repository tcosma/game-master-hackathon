import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configuración de la base de datos PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

# Verificar que DATABASE_URL está configurada
if not DATABASE_URL:
    raise ValueError("La variable de entorno DATABASE_URL no está configurada")

# Heroku añade un prefijo "postgres://" pero SQLAlchemy requiere "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Si la URL comienza con 'postg', podría ser una configuración manual incompleta
if DATABASE_URL.startswith("postg") and not DATABASE_URL.startswith("postgresql://"):
    print("ADVERTENCIA: El formato de DATABASE_URL parece incorrecto.")
    print("Debería ser: postgresql://usuario:contraseña@host:puerto/nombre_db")
    # Intenta corregir automáticamente si parece que solo se configuró el prefijo
    if len(DATABASE_URL) < 15:  # Es probable que sea solo un prefijo incompleto
        raise ValueError(
            "DATABASE_URL está incompleta. Configúrala correctamente en Heroku."
        )

try:
    engine = create_engine(DATABASE_URL)
    # Prueba conexión
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    print("Conexión a la base de datos establecida correctamente.")
except Exception as e:
    print(f"Error al conectar a la base de datos: {str(e)}")
    raise

# Crear aplicación FastAPI
app = FastAPI(
    title="RPG Game Microservice",
    description="Microservicio para juego de rol que consulta la última pelea del último personaje",
    version="1.0.0",
)


class ChatRequest(BaseModel):
    chat_id: str


@app.get("/")
def read_root():
    return {"message": "RPG Game Microservice API"}


@app.post("/last-fight", response_model=Dict[str, Any])
async def get_last_fight(request: ChatRequest):
    try:
        # Ejecutar función personalizada en PostgreSQL
        with engine.connect() as connection:
            query = text("SELECT * FROM get_last_fight(:chat_id)")
            result = connection.execute(query, {"chat_id": request.chat_id})
            fight = result.mappings().first()

        # Verificar si hay resultados
        if not fight:
            raise HTTPException(
                status_code=404, detail="No se encontraron peleas para este chat"
            )

        return {"fight": dict(fight)}

    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=500, detail=f"Error al consultar la base de datos: {str(e)}"
        )


@app.post("/last-fight-raw", response_model=Dict[str, Any])
async def get_last_fight_raw(request: ChatRequest):
    try:
        # Consulta SQL directa
        query = text(
            """
        WITH LastCharacter AS (
            SELECT id FROM personajes 
            WHERE chat_id = :chat_id
            ORDER BY id DESC LIMIT 1
        )
        SELECT f.* FROM fights f 
        JOIN LastCharacter lc ON f.character_id = lc.id 
        ORDER BY f.id DESC LIMIT 1
        """
        )

        with engine.connect() as connection:
            result = connection.execute(query, {"chat_id": request.chat_id})
            fight = result.mappings().first()

        # Verificar si hay resultados
        if not fight:
            raise HTTPException(
                status_code=404, detail="No se encontraron peleas para este chat"
            )

        return {"fight": dict(fight)}

    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=500, detail=f"Error al consultar la base de datos: {str(e)}"
        )


# Para ejecución local
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
