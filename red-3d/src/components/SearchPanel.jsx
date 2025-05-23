// src/components/SearchPanel.jsx
import PropTypes from 'prop-types';
import './SearchPanel.css';

export default function SearchPanel({ searchText, setSearchText, highlightId, setHighlightId, status, selectedNode, handleResetView }) {
  return (
    <div className="search-panel">
      <input
        type="text"
        placeholder="Buscar usuario (ej. user_1)"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        className="search-input"
      />
      <div className="search-buttons">
        <button
          onClick={() => setHighlightId(searchText.trim())}
          disabled={!searchText.trim()}
          className={searchText.trim() ? 'button' : 'button-disabled'}
        >
          Buscar
        </button>
        <button
          onClick={handleResetView}
          disabled={!highlightId && !searchText}
          className={highlightId || searchText ? 'button' : 'button-disabled'}
        >
          Resetear
        </button>
      </div>
      <span className="search-status">{status}</span>
      {selectedNode && (
        <span className="search-selected-node">
          Nodo: {selectedNode.id} · Cluster: {selectedNode.cluster ?? '—'}
        </span>
      )}
    </div>
  );
}

SearchPanel.propTypes = {
  searchText: PropTypes.string.isRequired,
  setSearchText: PropTypes.func.isRequired,
  highlightId: PropTypes.string.isRequired,
  setHighlightId: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  selectedNode: PropTypes.object,
  handleResetView: PropTypes.func.isRequired,
};