# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils import EmotionAnalyzer
from typing import Dict

app = FastAPI(
    title="API de Análisis de Vector Emocional",
    description="API para analizar el contenido emocional de textos",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = EmotionAnalyzer()

class TextRequest(BaseModel):
    text: str

class MessageRequest(BaseModel):
    user_id: str
    message: str

class EmotionResponse(BaseModel):
    vector: Dict[str, float]
    message: str = "Análisis completado exitosamente"

@app.post("/analyze", response_model=EmotionResponse)
async def analyze_text(request: TextRequest):
    """
    Analiza un texto y devuelve un vector emocional con 10 dimensiones:
    - subjectivity: Subjetividad del texto (0.0 a 1.0)
    - polarity: Polaridad emocional (-1.0 a 1.0)
    - fear: Miedo (0.0 a 1.0)
    - anger: Ira (0.0 a 1.0)
    - anticip: Anticipación (0.0 a 1.0)
    - trust: Confianza (0.0 a 1.0)
    - surprise: Sorpresa (0.0 a 1.0)
    - sadness: Tristeza (0.0 a 1.0)
    - disgust: Disgusto (0.0 a 1.0)
    - joy: Alegría (0.0 a 1.0)
    """
    try:
        emotion_vector = analyzer.get_emotion_vector(request.text)
        return {
            "vector": emotion_vector,
            "message": "Texto analizado exitosamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al analizar el texto: {str(e)}"
        )

@app.post("/analyze_message", response_model=EmotionResponse)
async def analyze_message(request: MessageRequest):
    """
    Analiza un mensaje asociado a un usuario y devuelve su vector emocional.
    """
    try:
        emotion_vector = analyzer.get_emotion_vector(request.message)
        return {
            "vector": emotion_vector,
            "message": f"Mensaje para el usuario {request.user_id} analizado exitosamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al analizar el mensaje: {str(e)}"
        )

@app.get("/health")
async def health_check():
    return {"status": "saludable"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)