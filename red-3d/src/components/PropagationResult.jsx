import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import './PropagationResult.css';

export default function PropagationResult({ propagationLog, selectedUser, onClose }) {
  const [currentStep, setCurrentStep] = useState(-1); // Comienza en -1 para el mensaje inicial
  const [displayedSteps, setDisplayedSteps] = useState([]);

  // Etiquetas de emociones en español
  const emotionKeys = [
    'subjetividad', 'polaridad', 'miedo', 'ira', 'anticipación',
    'confianza', 'sorpresa', 'tristeza', 'disgusto', 'alegría'
  ];

  // Ordenar el log por timeStep, excluyendo entradas inválidas
  const sortedLog = propagationLog
    .filter(entry => entry.sender && entry.receiver && entry.t !== undefined)
    .sort((a, b) => a.t - b.t);

  useEffect(() => {
    if (!propagationLog.length) return;

    // Limpiar timeouts previos
    const timeouts = [];

    // Mensaje inicial: Validar la entrada inicial o usar selectedUser
    const initialEntry = propagationLog.find(entry => entry.t === 0 && !entry.sender);
    const initialMessage = initialEntry && initialEntry.receiver && initialEntry.vector_sent
      ? {
          message: `El nodo inicial ${initialEntry.receiver} publica el mensaje con vector:\n${JSON.stringify(
            Object.fromEntries(
              emotionKeys.map((key, i) => [key, initialEntry.vector_sent[i]])
            ),
            null,
            2
          )}`,
        }
      : {
          message: selectedUser
            ? `El nodo inicial ${selectedUser} publica el mensaje con vector:\n${JSON.stringify(
            Object.fromEntries(
              emotionKeys.map((key, i) => [key, propagationLog[0].vector_sent[i]])
            ),
            null,
            2
          )}`
            : `Error: No se pudo identificar el nodo inicial o el vector del mensaje. Log: ${JSON.stringify(propagationLog.slice(0, 1), null, 2)}`,
        };
    setDisplayedSteps([initialMessage]);

    // Programar cada paso para coincidir con los 4 segundos de ANIMATION_DELAY en Graph3D.jsx
    sortedLog.forEach((entry, index) => {
      const delay = (index + 1) * 4000; // 4 segundos por paso, después del mensaje inicial
      const timeout = setTimeout(() => {
        // Paso 1: Relación (línea turquesa)
        const relationshipMessage = {
          message: `El nodo ${entry.receiver} sigue al nodo ${entry.sender} (línea turquesa).`,
        };

        // Paso 2: Envío de mensaje (línea verde)
        const sentMessage = {
          message: `El nodo ${entry.sender} envía el mensaje al nodo ${entry.receiver} con vector:\n${JSON.stringify(
            Object.fromEntries(
              emotionKeys.map((key, i) => [key, entry.vector_sent[i]])
            ),
            null,
            2
          )} (línea verde).`,
        };

        // Paso 3: Acción y actualización de estado emocional (cambio de color del nodo)
        const updateMessage = {
          message: `El nodo ${entry.receiver} decide ${entry.action} el mensaje y actualiza su vector emocional a:\n${JSON.stringify(
            Object.fromEntries(
              emotionKeys.map((key, i) => [key, entry.state_in_after[i]])
            ),
            null,
            2
          )} (el color del nodo cambia).`,
        };

        setDisplayedSteps(prev => [
          ...prev,
          relationshipMessage,
          sentMessage,
          updateMessage,
        ]);
        setCurrentStep(index + 1);
      }, delay);
      timeouts.push(timeout);
    });

    // Limpiar timeouts al desmontar
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [propagationLog, selectedUser]);

  if (!propagationLog.length) return null;

  return (
    <div className="propagation-result">
      <div className="propagation-result-header">
        <h4 className="propagation-result-title">Pasos de Propagación</h4>
        <button className="propagation-result-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="propagation-result-content">
        {displayedSteps.map((step, index) => (
          <div key={index} className="propagation-step">
            <p>{step.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

PropagationResult.propTypes = {
  propagationLog: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedUser: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};