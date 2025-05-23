# emotion_analysis.py
import numpy as np
import re
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from textblob import TextBlob
from nrclex import NRCLex
from typing import List, Dict

# Descargar recursos necesarios (solo una vez)
nltk.download('punkt_tab')
nltk.download('punkt')
nltk.download('wordnet')
nltk.download('stopwords')

class EmotionAnalyzer:
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        self.emotion_labels = [
            "subjectivity", "polarity", "fear", "anger", "anticip", 
            "trust", "surprise", "sadness", "disgust", "joy"
        ]
    
    def clean_text(self, text: str) -> str:
        """Limpia el texto para análisis emocional"""
        text = re.sub(r'@[A-Za-z0-9_]+', '', text)     # Remove mentions
        text = re.sub(r'#', '', text)                  # Remove hashtag symbols
        text = re.sub(r'RT[\s]+', '', text)            # Remove RT
        text = re.sub(r'https?:\/\/\S+', '', text)     # Remove URLs
        text = re.sub(r':[ \s]+', '', text)            # Remove colons
        text = re.sub(r"[\'\"]", '', text)             # Remove quotes
        text = re.sub(r'\.\.\.+', '', text)            # Remove ellipses
        text = text.lower()                            # Lowercase

        tokens = nltk.word_tokenize(text)
        tokens = [self.lemmatizer.lemmatize(t) for t in tokens if t not in self.stop_words and t.isalpha()]
        return ' '.join(tokens)
    
    def get_emotion_vector(self, text: str) -> Dict[str, float]:
        """Obtiene el vector emocional de 10 dimensiones a partir de un texto"""
        # Limpiar el texto
        cleaned_text = self.clean_text(text)

        # Obtener subjetividad y polaridad con TextBlob
        blob = TextBlob(cleaned_text)
        subjectivity = blob.sentiment.subjectivity
        polarity = blob.sentiment.polarity

        # Obtener emociones con NRCLex
        emotion = NRCLex(cleaned_text)
        affect_frequencies = emotion.affect_frequencies

        # Extraer las 8 emociones específicas
        emotions = [
            affect_frequencies.get('fear', 0.0),
            affect_frequencies.get('anger', 0.0),
            affect_frequencies.get('anticip', 0.0),  # Anticipation
            affect_frequencies.get('trust', 0.0),
            affect_frequencies.get('surprise', 0.0),
            affect_frequencies.get('sadness', 0.0),
            affect_frequencies.get('disgust', 0.0),
            affect_frequencies.get('joy', 0.0)
        ]

        # Combinar subjetividad, polaridad y emociones
        emotion_vector = np.array([subjectivity, polarity] + emotions)
        
        # Convertir a diccionario con nombres de dimensiones
        return dict(zip(self.emotion_labels, emotion_vector.tolist()))