import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import './PropagationResult.css';

export default function PropagationResult({ propagationLog, selectedUser, onClose }) {
  const [displayedSteps, setDisplayedSteps] = useState([]);
  const contentRef = useRef(null); // Referencia al contenedor de contenido

  // Etiquetas de emociones en español
  const emotionKeys = [
    'subjetividad', 'polaridad', 'miedo', 'ira', 'anticipación',
    'confianza', 'sorpresa', 'tristeza', 'disgusto', 'alegría'
  ];

  // Colores para emociones
  const emotionColors = {
    subjetividad: '#6366f1',
    polaridad: '#8b5cf6',
    miedo: '#A100A1',
    ira: '#FF0000',
    anticipación: '#FF6200',
    confianza: '#00CED1',
    sorpresa: '#FF69B4',
    tristeza: '#4682B4',
    disgusto: '#00FF00',
    alegría: '#FFFF00'
  };

  // Tiempos de animación (coinciden con Graph3D.jsx)
  const animationDelay = 5000; // ANIMATION_DELAY de getAnimationConfig
  const subStepDelay = animationDelay / 2; // ~1667ms

  // Ordenar el log por timeStep, excluyendo entradas inválidas
  const sortedLog = propagationLog
    .filter(entry => entry.sender && entry.receiver && entry.t !== undefined)
    .sort((a, b) => a.t - b.t);

  // Función para formatear vectores como tabla horizontal
  const formatVector = (vector) => {
    if (!vector || !Array.isArray(vector)) {
      return (
        <div className="vector-error">
          <span>⚠️ Vector no disponible</span>
        </div>
      );
    }

    return (
      <div className="emotion-table-container">
        <table className="emotion-table">
          <thead>
            <tr>
              {emotionKeys.map((key) => (
                <th
                  key={key}
                  className="emotion-header"
                  style={{
                    backgroundColor: `${emotionColors[key]}20`,
                    borderColor: emotionColors[key]
                  }}
                >
                  <span className="emotion-label">{key.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {vector.map((value, i) => (
                <td
                  key={i}
                  className="emotion-value"
                  style={{
                    color: emotionColors[emotionKeys[i]] || '#374151',
                    backgroundColor: `${emotionColors[emotionKeys[i]] || '#374151'}15`
                  }}
                >
                  <span className="value-text">
                    {value?.toFixed(2) ?? 'N/A'}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Función para obtener el icono según el tipo de acción
  const getActionIcon = (action) => {
    switch (action) {
      case 'modificar': return '✏️';
      case 'reenviar': return '📤';
      case 'rechazar': return '❌';
      default: return '📨';
    }
  };

  // Función para obtener la clase CSS según el tipo de acción
  const getActionClass = (action) => {
    switch (action) {
      case 'modificar': return 'action-modify';
      case 'reenviar': return 'action-forward';
      case 'rechazar': return 'action-reject';
      default: return 'action-send';
    }
  };

  // Función para activar el scroll automático
  const scrollToLastStep = () => {
    if (contentRef.current) {
      setTimeout(() => {
        const lastStep = contentRef.current.querySelector('.propagation-step:last-child');
        if (lastStep) {
          lastStep.scrollIntoView({ behavior: 'smooth', block: 'end' });
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }, 200); // Aumentado para asegurar DOM actualizado
    }
  };

  useEffect(() => {
    if (!propagationLog.length) return;

    const timeouts = [];

    // Mensaje inicial
    const initialEntry = propagationLog.find(entry => entry.t === 0 && !entry.sender);
    const initialMessage = initialEntry && initialEntry.receiver && initialEntry.vector_sent
      ? {
          message: (
            <div className="step-initial">
              <div className="step-header">
                <span className="step-icon">🚀</span>
                <h3 className="step-title">INICIO DE PROPAGACIÓN</h3>
              </div>
              <p className="step-description">
                El nodo inicial <span className="node-badge initial-node">{initialEntry.receiver}</span> publica el mensaje:
              </p>
              {formatVector(initialEntry.vector_sent)}
            </div>
          ),
        }
      : {
          message: selectedUser
            ? (
                <div className="step-initial">
                  <div className="step-header">
                    <span className="step-icon">🚀</span>
                    <h3 className="step-title">INICIO DE PROPAGACIÓN</h3>
                  </div>
                  <p className="step-description">
                    El nodo inicial <span className="node-badge initial-node">{selectedUser}</span> publica el mensaje:
                  </p>
                  {formatVector(propagationLog[0]?.vector_sent)}
                </div>
              )
            : <div className="step-error">
                <p className="error-text">❌ ERROR: No se pudo identificar el nodo inicial o el vector del mensaje.</p>
              </div>,
        };

    setDisplayedSteps([initialMessage]);
    scrollToLastStep();

    // Programar mensajes uno por uno
    sortedLog.forEach((entry, index) => {
      const stepNumber = index + 1;
      const baseDelay = index * animationDelay;

      console.log(`Programando paso ${stepNumber}: relación en ${baseDelay}ms, envío en ${baseDelay + subStepDelay}ms, actualización en ${baseDelay + 2 * subStepDelay}ms`);

      // Paso 1: Relación (línea turquesa)
      const relationshipTimeout = setTimeout(() => {
        setDisplayedSteps(prev => [
          ...prev,
          {
            message: (
              <div className="step-connection">
                <div className="step-header">
                  <span className="step-icon">🔗</span>
                  <h4 className="step-subtitle">PASO {stepNumber} - CONEXIÓN</h4>
                </div>
                <p className="step-description">
                  El nodo <span className="node-badge receiver-node">{entry.receiver}</span> sigue al nodo <span className="node-badge sender-node">{entry.sender}</span>
                </p>
              </div>
            ),
          }
        ]);
        scrollToLastStep();
      }, baseDelay);
      timeouts.push(relationshipTimeout);

      // Paso 2: Envío (línea verde)
      const sentTimeout = setTimeout(() => {
        setDisplayedSteps(prev => [
          ...prev,
          {
            message: (
              <div className={`step-message ${getActionClass(entry.action)}`}>
                <div className="step-header">
                  <span className="step-icon">{getActionIcon(entry.action)}</span>
                  <h4 className="step-subtitle">ENVÍO DE MENSAJE</h4>
                </div>
                <p className="step-description">
                  {entry.action === 'modificar'
                    ? <>El nodo <span className="node-badge sender-node">{entry.sender}</span> envía el mensaje <span className="action-badge modify-badge">MODIFICADO</span> al nodo <span className="node-badge receiver-node">{entry.receiver}</span></>
                    : entry.action === 'reenviar'
                    ? <>El nodo <span className="node-badge sender-node">{entry.sender}</span> <span className="action-badge forward-badge">REENVÍA</span> el mensaje al nodo <span className="node-badge receiver-node">{entry.receiver}</span></>
                    : <>El nodo <span className="node-badge sender-node">{entry.sender}</span> <span className="action-badge send-badge">ENVÍA</span> el mensaje al nodo <span className="node-badge receiver-node">{entry.receiver}</span></>}
                </p>
                {formatVector(entry.vector_sent)}
              </div>
            ),
          }
        ]);
        scrollToLastStep();
      }, baseDelay + subStepDelay);
      timeouts.push(sentTimeout);

      // Paso 3: Actualización (cambio de color)
      const updateTimeout = setTimeout(() => {
        setDisplayedSteps(prev => [
          ...prev,
          {
            message: (
              <div className="step-update">
                <div className="step-header">
                  <span className="step-icon">🧠</span>
                  <h4 className="step-subtitle">ACTUALIZACIÓN EMOCIONAL</h4>
                </div>
                <p className="step-description">
                  El nodo <span className="node-badge receiver-node">{entry.receiver}</span> actualiza su estado emocional y decide <span className={`action-badge ${getActionClass(entry.action)}-badge`}>{entry.action.toUpperCase()}</span> el mensaje
                </p>
                <div className="color-change-notice">
                  <p>🎨 El color del nodo cambia para reflejar su nuevo estado emocional</p>
                </div>
                {formatVector(entry.state_in_after)}
              </div>
            ),
          }
        ]);
        scrollToLastStep();
      }, baseDelay + 2 * subStepDelay);
      timeouts.push(updateTimeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [propagationLog, selectedUser]);

  if (!propagationLog.length) return null;

  return (
    <div className="propagation-result">
      <div className="propagation-result-header">
        <div className="header-content">
          <span className="header-icon">📊</span>
          <h4 className="propagation-result-title">PASOS DE PROPAGACIÓN</h4>
        </div>
        <button className="propagation-result-close" onClick={onClose}>
          ×
        </button>
      </div>
      
      <div className="propagation-result-content" ref={contentRef}>
        {displayedSteps.map((step, index) => (
          <div key={index} className="propagation-step">
            {typeof step.message === 'string' ? (
              <div className="step-text">
                <p>{step.message}</p>
              </div>
            ) : (
              step.message
            )}
          </div>
        ))}
      </div>
      
      <div className="propagation-result-footer">
        <p className="footer-stats">
          📈 <span className="stats-number">{displayedSteps.length}</span> pasos mostrados | 
          ⏱️ Actualización cada ~{Math.round(subStepDelay)}ms
        </p>
      </div>
    </div>
  );
}

PropagationResult.propTypes = {
  propagationLog: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedUser: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};