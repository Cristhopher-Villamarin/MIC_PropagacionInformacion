// src/components/NodeModal.jsx
import PropTypes from 'prop-types';
import './NodeModal.css';

export default function NodeModal({ isOpen, setIsOpen, modalNode }) {
  if (!isOpen || !modalNode) return null;

  return (
    <>
      <div className="modal-overlay" onClick={() => setIsOpen(false)} />
      <div className="modal">
        <h3 className="modal-title">Información del Nodo: {modalNode.id}</h3>
        <p className="modal-cluster">
          <b>Cluster:</b> {modalNode.cluster ?? 'Sin cluster'}
        </p>
        <div className="modal-vector">
          <b>Vector Emocional In:</b>
          <pre className="modal-pre">
            {JSON.stringify(modalNode.emotional_vector_in, null, 2)}
          </pre>
        </div>
        <div className="modal-vector">
          <b>Vector Emocional Out:</b>
          <pre className="modal-pre">
            {JSON.stringify(modalNode.emotional_vector_out, null, 2)}
          </pre>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="modal-close-button"
        >
          Cerrar
        </button>
      </div>
    </>
  );
}

NodeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  modalNode: PropTypes.object,
};