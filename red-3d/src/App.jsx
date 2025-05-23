import { useState, useEffect } from 'react';
import Graph3D from './components/Graph3D.jsx';
import { readCsv, readXlsx, buildGraph } from './utils/loadFiles.js';
import axios from 'axios';

export default function App() {
  const [csvFile, setCsvFile] = useState(null);
  const [xlsxFile, setXlsxFile] = useState(null);
  const [linksAll, setLinksAll] = useState([]);
  const [attrsAll, setAttrsAll] = useState([]);
  const [networkList, setNetworkList] = useState([]);
  const [selectedNet, setSelectedNet] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [status, setStatus] = useState('Sube el CSV y el XLSX…');
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [highlightId, setHighlightId] = useState('');
  const [message, setMessage] = useState('');
  const [emotionVector, setEmotionVector] = useState(null);
  const [emotionStatus, setEmotionStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalNode, setModalNode] = useState(null);

  // ────────────────────────────────────────────────────────────────
  // Lee archivos cuando el usuario los sube
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCsv() {
      if (!csvFile) return;
      setStatus('Leyendo CSV…');
      const links = await readCsv(csvFile);
      setLinksAll(links);
      const ids = [...new Set(
        links.map(l => String(l.network_id ?? l.networkId))
      )].filter(id => id);
      setNetworkList(ids);
      setSelectedNet(ids[0] ?? '');
      setStatus('CSV listo. Ahora el XLSX…');
    }
    loadCsv();
  }, [csvFile]);

  useEffect(() => {
    async function loadXlsx() {
      if (!xlsxFile) return;
      setStatus('Leyendo XLSX…');
      const attrs = await readXlsx(xlsxFile);
      setAttrsAll(attrs);
      setStatus('XLSX listo.');
    }
    loadXlsx();
  }, [xlsxFile]);

  // ────────────────────────────────────────────────────────────────
  // Construye el grafo cuando cambian selectedNet, linksAll o attrsAll
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedNet || linksAll.length === 0 || attrsAll.length === 0) {
      return;
    }
    setStatus('Filtrando y construyendo la red…');
    const linksFiltered = linksAll.filter(
      l => String(l.network_id ?? l.networkId) === selectedNet
    );
    const data = buildGraph(linksFiltered, attrsAll);
    setGraphData(data);
    setStatus(
      `Red ${selectedNet}: ${data.nodes.length} nodos · ${data.links.length} enlaces`
    );
    setSelectedUser('');
    setHighlightId('');
  }, [selectedNet, linksAll, attrsAll]);

  // ────────────────────────────────────────────────────────────────
  // Analiza el mensaje y resalta el nodo seleccionado
  // ────────────────────────────────────────────────────────────────
  const handleAnalyzeMessage = async () => {
    if (!selectedUser || !message.trim()) {
      setEmotionStatus('Por favor selecciona un usuario y escribe un mensaje.');
      return;
    }
    setEmotionStatus('Analizando mensaje…');
    setHighlightId(selectedUser);
    try {
      const response = await axios.post('http://localhost:8000/analyze_message', {
        user_id: selectedUser,
        message: message
      });
      setEmotionVector(response.data.vector);
      setEmotionStatus(response.data.message);
    } catch (error) {
      setEmotionStatus(`Error: ${error.response?.data?.detail || error.message}`);
      setEmotionVector(null);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Maneja el clic en un nodo para abrir el modal
  // ────────────────────────────────────────────────────────────────
  const handleNodeClick = (node) => {
    // Crear objetos para los vectores emocionales
    const emotional_vector_in = {
      subjectivity: node.in_subjectivity ?? 'N/A',
      polarity: node.in_polarity ?? 'N/A',
      fear: node.in_fear ?? 'N/A',
      anger: node.in_anger ?? 'N/A',
      anticipation: node.in_anticip ?? 'N/A',
      trust: node.in_trust ?? 'N/A',
      surprise: node.in_surprise ?? 'N/A',
      sadness: node.in_sadness ?? 'N/A',
      disgust: node.in_disgust ?? 'N/A',
      joy: node.in_joy ?? 'N/A',
    };
    const emotional_vector_out = {
      subjectivity: node.out_subjectivity ?? 'N/A',
      polarity: node.out_polarity ?? 'N/A',
      fear: node.out_fear ?? 'N/A',
      anger: node.out_anger ?? 'N/A',
      anticipation: node.out_anticip ?? 'N/A',
      trust: node.out_trust ?? 'N/A',
      surprise: node.out_surprise ?? 'N/A',
      sadness: node.out_sadness ?? 'N/A',
      disgust: node.out_disgust ?? 'N/A',
      joy: node.out_joy ?? 'N/A',
    };
    const nodeWithVectors = {
      ...node,
      emotional_vector_in,
      emotional_vector_out,
    };
    setModalNode(nodeWithVectors);
    setIsModalOpen(true);
    setSelectedNode(node);
  };

  // ────────────────────────────────────────────────────────────────
  // Función para resetear la vista y limpiar el resaltado
  // ────────────────────────────────────────────────────────────────
  const handleResetView = () => {
    setHighlightId('');
    setSearchText('');
    setMessage('');
    setEmotionVector(null);
    setEmotionStatus('');
    setSelectedUser('');
    setIsModalOpen(false);
    setModalNode(null);
  };

  // ────────────────────────────────────────────────────────────────
  // Estilos CSS
  // ────────────────────────────────────────────────────────────────
  const containerStyle = {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '350px',
    fontFamily: "'Inter', sans-serif",
    color: '#000000', // Texto negro para el contenedor
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    color: '#000000', // Texto negro para inputs
  };

  const textareaStyle = {
    ...inputStyle,
    height: '80px',
    resize: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    background: 'url("data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" fill=\"%23888\"><path d=\"M0 2l5 5 5-5z\"/></svg>") no-repeat right 0.75rem center/10px 10px',
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  };

  const statusStyle = {
    fontSize: '0.85rem',
    color: '#000000', // Cambiado de #4b5563 a negro
    marginTop: '0.5rem',
  };

  const vectorStyle = {
    marginTop: '1rem',
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    maxHeight: '200px',
    overflowY: 'auto',
    color: '#000000', // Texto negro para vectores
  };

  const modalStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
    zIndex: 100,
    maxWidth: '400px',
    width: '90%',
    fontFamily: "'Inter', sans-serif",
    color: '#000000', // Texto negro para el modal
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  };

  const modalCloseButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    marginTop: '1rem',
    width: '100%',
  };

  // ────────────────────────────────────────────────────────────────
  // JSX
  // ────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={containerStyle}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="file"
            accept=".csv"
            onChange={e => setCsvFile(e.target.files?.[0])}
            style={inputStyle}
            onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
            onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setXlsxFile(e.target.files?.[0])}
            style={inputStyle}
            onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
            onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
          />
        </div>
        {networkList.length > 0 && (
          <select
            value={selectedNet}
            onChange={e => setSelectedNet(e.target.value)}
            style={selectStyle}
            onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
            onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
          >
            {networkList.map(id => (
              <option key={id} value={id}>
                Red: {id}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Buscar usuario (ej. user_1)"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={inputStyle}
          onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
          onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setHighlightId(searchText.trim())}
            disabled={!searchText.trim()}
            style={searchText.trim() ? buttonStyle : disabledButtonStyle}
            onMouseOver={e => searchText.trim() && (e.target.style.backgroundColor = '#2563eb')}
            onMouseOut={e => searchText.trim() && (e.target.style.backgroundColor = '#3b82f6')}
          >
            Buscar
          </button>
          <button
            onClick={handleResetView}
            disabled={!highlightId && !message && !emotionVector && !selectedUser}
            style={
              highlightId || message || emotionVector || selectedUser
                ? buttonStyle
                : disabledButtonStyle
            }
            onMouseOver={e =>
              (highlightId || message || emotionVector || selectedUser) &&
              (e.target.style.backgroundColor = '#2563eb')
            }
            onMouseOut={e =>
              (highlightId || message || emotionVector || selectedUser) &&
              (e.target.style.backgroundColor = '#3b82f6')
            }
          >
            Resetear
          </button>
        </div>
        {graphData.nodes.length > 0 && (
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={selectStyle}
            onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
            onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
          >
            <option value="">Selecciona un usuario</option>
            {graphData.nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.id}
              </option>
            ))}
          </select>
        )}
        <textarea
          placeholder="Escribe el mensaje a analizar..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={textareaStyle}
          onMouseOver={e => (e.target.style.borderColor = '#3b82f6')}
          onMouseOut={e => (e.target.style.borderColor = '#d1d5db')}
        />
        <button
          onClick={handleAnalyzeMessage}
          disabled={!selectedUser || !message.trim()}
          style={selectedUser && message.trim() ? buttonStyle : disabledButtonStyle}
          onMouseOver={e =>
            selectedUser && message.trim() && (e.target.style.backgroundColor = '#2563eb')
          }
          onMouseOut={e =>
            selectedUser && message.trim() && (e.target.style.backgroundColor = '#3b82f6')
          }
        >
          Analizar Mensaje
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={statusStyle}>{status}</span>
          <span style={{ ...statusStyle, color: emotionStatus.startsWith('Error') ? '#dc2626' : '#000000' }}>
            {emotionStatus}
          </span>
          {selectedNode && (
            <span style={{ ...statusStyle, fontWeight: 'bold' }}>
              Nodo: {selectedNode.id} · Cluster: {selectedNode.cluster ?? '—'}
            </span>
          )}
        </div>
        {emotionVector && (
          <div style={vectorStyle}>
            <b>Vector Emocional:</b>
            <pre style={{ margin: 0, fontSize: '0.8rem', color: '#000000' }}>
              {JSON.stringify(emotionVector, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {isModalOpen && modalNode && (
        <>
          <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)} />
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: '600', color: '#000000' }}>
              Información del Nodo: {modalNode.id}
            </h3>
            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#000000' }}>
              <b>Cluster:</b> {modalNode.cluster ?? 'Sin cluster'}
            </p>
            <div style={{ ...vectorStyle, marginBottom: '1rem' }}>
              <b>Vector Emocional In:</b>
              <pre style={{ margin: 0, fontSize: '0.8rem', color: '#000000' }}>
                {JSON.stringify(modalNode.emotional_vector_in, null, 2)}
              </pre>
            </div>
            <div style={{ ...vectorStyle, marginBottom: '1rem' }}>
              <b>Vector Emocional Out:</b>
              <pre style={{ margin: 0, fontSize: '0.8rem', color: '#000000' }}>
                {JSON.stringify(modalNode.emotional_vector_out, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              style={modalCloseButtonStyle}
              onMouseOver={e => (e.target.style.backgroundColor = '#dc2626')}
              onMouseOut={e => (e.target.style.backgroundColor = '#ef4444')}
            >
              Cerrar
            </button>
          </div>
        </>
      )}
      <div style={{ width: '100vw', height: '100vh' }}>
        <Graph3D
          data={graphData}
          onNodeInfo={handleNodeClick}
          highlightId={highlightId}
          onResetView={handleResetView}
        />
      </div>
    </>
  );
}