import PropTypes from 'prop-types';
import './NodeModal.css';

export default function NodeModal({ isOpen, setIsOpen, modalNode, propagationLog }) {
  if (!isOpen || !modalNode) return null;

  // Filter propagation log for this node (as receiver)
  const nodeHistory = propagationLog
    .filter(entry => entry.receiver === modalNode.id)
    .map(entry => ({
      timeStep: entry.t,
      action: entry.action,
      sender: entry.sender,
      state_in_before: entry.state_in_before,
      state_in_after: entry.state_in_after,
    }));

  // Map emotional indices to names for display
  const emotionKeys = [
    'subjectivity', 'polarity', 'fear', 'anger', 'anticipation',
    'trust', 'surprise', 'sadness', 'disgust', 'joy'
  ];

  return (
    <>
      <div className="modal-overlay" onClick={() => setIsOpen(false)} />
      <div className="modal">
        <h3 className="modal-title">Información del Nodo: {modalNode.id}</h3>
        <div className="modal-section">
          <h4 className="modal-section-title">Detalles del Nodo</h4>
          <p className="modal-cluster">
            <b>Cluster:</b> {modalNode.cluster ?? 'Sin cluster'}
          </p>
        </div>
        <div className="modal-section">
          <h4 className="modal-section-title">Vectores Emocionales</h4>
          <div className="modal-vectors-container">
            <div className="modal-vector">
              <h5>Vector Emocional In</h5>
              <pre className="modal-pre">
                {JSON.stringify(modalNode.emotional_vector_in, null, 2)}
              </pre>
            </div>
            <div className="modal-vector">
              <h5>Vector Emocional Out</h5>
              <pre className="modal-pre">
                {JSON.stringify(modalNode.emotional_vector_out, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        {nodeHistory.length > 0 && (
          <div className="modal-section">
            <h4 className="modal-section-title">Historial de Propagación</h4>
            {nodeHistory.map((entry, index) => (
              <div key={index} className="modal-history-entry">
                <h5 className="modal-history-header">
                  Paso {entry.timeStep} (Estado del nodo despues de  la interacción con {entry.sender})
                </h5>
                <div className="modal-history-states">
                  <div className="modal-history-state">
                    <h6>Estado Antes</h6>
                    <pre className="modal-pre">
                      {JSON.stringify(
                        Object.fromEntries(
                          emotionKeys.map((key, i) => [key, entry.state_in_before[i]])
                        ),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div className="modal-history-state">
                    <h6>Estado Después</h6>
                    <pre className="modal-pre">
                      {JSON.stringify(
                        Object.fromEntries(
                          emotionKeys.map((key, i) => [key, entry.state_in_after[i]])
                        ),
                        null,
                        2
                      )}
                    </pre>
                    <h5 className="modal-history-header">
                   (Acción que realiza: {entry.action} el mensaje)
                </h5>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-footer">
          <button
            onClick={() => setIsOpen(false)}
            className="modal-close-button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}

NodeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  modalNode: PropTypes.object,
  propagationLog: PropTypes.arrayOf(PropTypes.object).isRequired,
};