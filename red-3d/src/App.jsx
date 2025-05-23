// src/App.jsx
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchPanel from './components/SearchPanel';
import PropagationModal from './components/PropagationModal';
import NodeModal from './components/NodeModal';
import PropagationResult from './components/PropagationResult'; // Nuevo componente
import Graph3D from './components/Graph3D';
import { readCsv, readXlsx, buildGraph } from './utils/loadFiles';
import axios from 'axios';
import './App.css';

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
  const [selectedUser, setSelectedUser] = useState('');
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [modalNode, setModalNode] = useState(null);
  const [isPropagationModalOpen, setIsPropagationModalOpen] = useState(false);
  const [propagationStatus, setPropagationStatus] = useState('');
  const [propagationResult, setPropagationResult] = useState(null);

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
  // Maneja el clic en un nodo para abrir el modal de información
  // ────────────────────────────────────────────────────────────────
  const handleNodeClick = (node) => {
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
    setIsNodeModalOpen(true);
    setSelectedNode(node);
  };

  // ────────────────────────────────────────────────────────────────
  // Maneja la propagación
  // ────────────────────────────────────────────────────────────────
  const handlePropagation = async () => {
    if (!selectedUser || !message.trim()) {
      setPropagationStatus('Por favor selecciona un usuario y escribe un mensaje.');
      return;
    }
    setPropagationStatus('Iniciando propagación…');
    try {
      const response = await axios.post('http://localhost:8000/analyze_message', {
        user_id: selectedUser,
        message: message
      });
      setPropagationResult(response.data);
      setPropagationStatus('Propagación completada.');
      
      // Cerrar el modal y enfocar al usuario/nodo seleccionado
      setIsPropagationModalOpen(false);
      setHighlightId(selectedUser); // Enfocar el nodo en el grafo
    } catch (error) {
      setPropagationStatus(`Error: ${error.response?.data?.detail || error.message}`);
      setPropagationResult(null);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Función para resetear la vista
  // ────────────────────────────────────────────────────────────────
  const handleResetView = () => {
    setHighlightId('');
    setSearchText('');
    setMessage('');
    setSelectedUser('');
    setPropagationStatus('');
    setPropagationResult(null);
    setIsNodeModalOpen(false);
    setIsPropagationModalOpen(false);
    setModalNode(null);
  };

  return (
    <>
      <Navbar
        csvFile={csvFile}
        setCsvFile={setCsvFile}
        xlsxFile={xlsxFile}
        setXlsxFile={setXlsxFile}
        networkList={networkList}
        selectedNet={selectedNet}
        setSelectedNet={setSelectedNet}
      />
      <SearchPanel
        searchText={searchText}
        setSearchText={setSearchText}
        highlightId={highlightId}
        setHighlightId={setHighlightId}
        status={status}
        selectedNode={selectedNode}
        handleResetView={handleResetView}
      />
      <div className="propagation-button-container">
        <button
          onClick={() => setIsPropagationModalOpen(true)}
          className="button"
        >
          Iniciar Propagación
        </button>
      </div>
      <div className="legend-container">
        <h4 className="legend-title">Leyenda de Colores</h4>
        <ul className="legend-list">
          <li style={{ color: '#FFFF00' }}>Amarillo: Alegría</li>
          <li style={{ color: '#FF0000' }}>Rojo: Ira</li>
          <li style={{ color: '#4682B4' }}>Azul: Tristeza</li>
          <li style={{ color: '#00FF00' }}>Verde: Disgusto</li>
          <li style={{ color: '#A100A1' }}>Morado: Miedo</li>
          <li style={{ color: '#FF6200' }}>Naranja: Anticipación</li>
          <li style={{ color: '#00CED1' }}>Turquesa: Confianza</li>
          <li style={{ color: '#FF69B4' }}>Rosa: Sorpresa</li>
        </ul>
      </div>
      <PropagationModal
        isOpen={isPropagationModalOpen}
        setIsOpen={setIsPropagationModalOpen}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        message={message}
        setMessage={setMessage}
        nodes={graphData.nodes}
        handlePropagation={handlePropagation}
        propagationStatus={propagationStatus}
      />
      <NodeModal
        isOpen={isNodeModalOpen}
        setIsOpen={setIsNodeModalOpen}
        modalNode={modalNode}
      />
      <PropagationResult
        result={propagationResult}
        onClose={() => setPropagationResult(null)} // Para cerrar el cuadro
      />
      <div className="graph-container">
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