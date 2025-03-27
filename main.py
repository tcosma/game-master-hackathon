import os
from supabase import create_client, Client
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn

# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
        # Ejecutar la consulta en Supabase utilizando el método rpc
        result = supabase.rpc(
            "get_last_fight", {"chat_id_param": request.chat_id}
        ).execute()

        # Verificar si hay resultados
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404, detail="No se encontraron peleas para este chat"
            )

        return {"fight": result.data[0]}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al consultar la base de datos: {str(e)}"
        )


@app.post("/last-fight-raw", response_model=Dict[str, Any])
async def get_last_fight_raw(request: ChatRequest):
    try:
        # Consulta SQL directa (alternativa)
        query = f"""
        WITH LastCharacter AS (
            SELECT id FROM personajes 
            WHERE chat_id = '{request.chat_id}'
            ORDER BY id DESC LIMIT 1
        )
        SELECT f.* FROM fights f 
        JOIN LastCharacter lc ON f.character_id = lc.id 
        ORDER BY f.id DESC LIMIT 1
        """

        result = supabase.table("fights").select("*").execute(query=query)

        # Verificar si hay resultados
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404, detail="No se encontraron peleas para este chat"
            )

        return {"fight": result.data[0]}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al consultar la base de datos: {str(e)}"
        )


# Para ejecución local
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
