// src/components/PropagationResult.jsx
import PropTypes from 'prop-types';
import './PropagationResult.css';

export default function PropagationResult({ result, onClose }) {
  if (!result) return null;

  return (
    <div className="propagation-result">
      <div className="propagation-result-header">
        <h4 className="propagation-result-title">Resultado de Propagación</h4>
        <button className="propagation-result-close" onClick={onClose}>
          ×
        </button>
      </div>
      <pre className="propagation-result-content">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

PropagationResult.propTypes = {
  result: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};