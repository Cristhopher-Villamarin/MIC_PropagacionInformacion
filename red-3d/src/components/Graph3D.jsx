import { useEffect, useRef, memo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

/**
 * @param {Object}   props
 * @param {Object}   props.data         { nodes, links }
 * @param {Function} props.onNodeInfo   callback al hacer click
 * @param {string}   props.highlightId  id del nodo a enfocar/colorear (opcional)
 * @param {Array}    props.highlightedLinks  Array of { source, target, timeStep } to highlight (opcional)
 * @param {Function} props.onResetView  callback para resetear la vista (opcional)
 */
function Graph3D({ data, onNodeInfo, highlightId, highlightedLinks = [], onResetView }) {
  const fgRef = useRef();
  const isTransitioning = useRef(false);
  const linkProgress = useRef({});

  // Colores inspirados en Intensamente e Intensamente 2
  const emotionColors = {
    in_fear: '#A100A1',      // Morado (Miedo)
    in_anger: '#FF0000',     // Rojo (Ira)
    in_anticip: '#FF6200',   // Naranja (Anticipación)
    in_trust: '#00CED1',     // Turquesa (Confianza)
    in_surprise: '#FF69B4',  // Rosa (Sorpresa)
    in_sadness: '#4682B4',   // Azul (Tristeza)
    in_disgust: '#00FF00',   // Verde (Disgusto)
    in_joy: '#FFFF00'        // Amarillo (Alegría)
  };

  // Crear textura de gradiente
  const createGradientTexture = (colors, weights) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    let offset = 0;
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    colors.forEach((color, i) => {
      const stop = offset + (weights[i] / totalWeight);
      gradient.addColorStop(offset, color);
      offset = stop;
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
  };

  // Obtener color del nodo (gradiente de 3 emociones)
  const getNodeColor = (node) => {
    const emotions = [
      node.in_fear || 0,
      node.in_anger || 0,
      node.in_anticip || 0,
      node.in_trust || 0,
      node.in_surprise || 0,
      node.in_sadness || 0,
      node.in_disgust || 0,
      node.in_joy || 0
    ];
    const emotionKeys = [
      'in_fear', 'in_anger', 'in_anticip', 'in_trust',
      'in_surprise', 'in_sadness', 'in_disgust', 'in_joy'
    ];
    const sortedEmotions = emotions
      .map((val, idx) => ({ val, idx }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 3);
    const colors = sortedEmotions.map(e => emotionColors[emotionKeys[e.idx]]);
    const weights = sortedEmotions.map(e => e.val);
    return { texture: createGradientTexture(colors, weights), opacity: 0.75 };
  };

  // Centra toda la red al cargar / filtrar
  useEffect(() => {
    if (!isTransitioning.current) {
      fgRef.current?.zoomToFit(400, 100);
    }
  }, [data]);

  // Enfoca y “flashea” cuando cambia highlightId
  useEffect(() => {
    if (!highlightId || !fgRef.current || !data.nodes.length || isTransitioning.current) return;

    const node = data.nodes.find(n => n.id === highlightId);
    if (!node) {
      console.warn('Node not found for highlightId:', highlightId);
      alert('Usuario no encontrado');
      return;
    }

    const focusNode = () => {
      isTransitioning.current = true;

      const { x = 0, y = 0, z = 0 } = node;
      const bounds = calculateGraphBounds(data.nodes);
      const graphSize = Math.max(bounds.maxDistance, 10);
      const distance = graphSize * 1.5;

      fgRef.current.cameraPosition(
        { x: x + distance, y: y + distance * 0.5, z },
        { x, y, z },
        1500
      );

      node.__flashUntil = Date.now() + 9000;
      fgRef.current.refresh();

      setTimeout(() => {
        node.__flashUntil = 0;
        fgRef.current.refresh();
        isTransitioning.current = false;
      }, 9000);
    };

    setTimeout(focusNode, 100);
  }, [highlightId, data.nodes]);

  // Resetea la vista cuando highlightId se limpia
  useEffect(() => {
    if (!highlightId && fgRef.current && !isTransitioning.current) {
      isTransitioning.current = true;
      fgRef.current.zoomToFit(400, 100);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 500);
    }
  }, [highlightId]);

  // Animar enlaces destacados
  useEffect(() => {
    if (!highlightedLinks.length || !fgRef.current || !data.links.length) {
      console.log('Animation skipped:', {
        highlightedLinksLength: highlightedLinks.length,
        hasFgRef: !!fgRef.current,
        linksLength: data.links.length,
      });
      return;
    }

    console.log('Highlighted links:', highlightedLinks);
    console.log('Graph links:', data.links.map(l => ({ source: l.source?.id || l.source, target: l.target?.id || l.target })));

    // Group links by time step
    const steps = {};
    highlightedLinks.forEach(link => {
      const t = link.timeStep;
      if (!steps[t]) steps[t] = [];
      steps[t].push(link);
    });

    let currentTimeStep = Math.min(...Object.keys(steps).map(Number));
    const maxTimeStep = Math.max(...Object.keys(steps).map(Number));

    const animateLinks = () => {
      if (currentTimeStep > maxTimeStep) {
        console.log('Animation complete');
        clearInterval(interval);
        return;
      }

      const linksToHighlight = steps[currentTimeStep] || [];
      console.log(`Processing time step ${currentTimeStep}:`, linksToHighlight);

      let matchedLinks = 0;
      linksToHighlight.forEach(({ source, target }) => {
      const link = data.links.find(l => {
        const linkSource = typeof l.source === 'object' ? l.source.id : l.source;
        const linkTarget = typeof l.target === 'object' ? l.target.id : l.target;
        return (linkSource === source && linkTarget === target) ||
               (linkSource === target && linkTarget === source);
      });
      if (link) {
        console.log(`Highlighting link: ${source} -> ${target}`);
        link.__highlightUntil = Date.now() + 2000;
        matchedLinks++;
      } else {
        console.warn(`Link not found: ${source} -> ${target}`);
      }
    });

    console.log(`Matched ${matchedLinks} of ${linksToHighlight.length} links in time step ${currentTimeStep}`);
    fgRef.current.refresh();
    currentTimeStep++;
    };

    const interval = setInterval(animateLinks, 2500); // New step every 2.5 seconds (2s highlight + 0.5s pause)

    return () => {
      console.log('Cleaning up animation');
      clearInterval(interval);
      data.links.forEach(link => delete link.__highlightUntil);
      fgRef.current.refresh();
    };
  }, [highlightedLinks, data.links]);

  // Calcular los límites del grafo
  const calculateGraphBounds = (nodes) => {
    if (!nodes.length) return { maxDistance: 10 };
    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x || 0),
        maxX: Math.max(acc.maxX, node.x || 0),
        minY: Math.min(acc.minY, node.y || 0),
        maxY: Math.max(acc.maxY, node.y || 0),
        minZ: Math.min(acc.minZ, node.z || 0),
        maxZ: Math.max(acc.maxZ, node.z || 0),
      }),
      {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      }
    );
    const maxDistance = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    );
    return { maxDistance };
  };

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      backgroundColor="#111"
      linkOpacity={0.9}
      linkWidth={link => (Date.now() < (link.__highlightUntil || 0) ? 2 : 0.8)}
      linkDirectionalArrowLength={5}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={link => (Date.now() < (link.__highlightUntil || 0) ? '#00FFFF' : '#FFFFFF')} // Fluorescent cyan
      d3VelocityDecay={0.3}
      warmupTicks={100}
      onNodeClick={n => onNodeInfo?.(n)}
      nodeThreeObject={node => {
        const group = new THREE.Group();
        const R = 6;

        const color = Date.now() < (node.__flashUntil || 0)
          ? '#8a411d'
          : getNodeColor(node).texture;

        const material = new THREE.MeshBasicMaterial({
          map: color instanceof THREE.Texture ? color : null,
          color: color instanceof THREE.Texture ? null : color,
          transparent: true,
          opacity: getNodeColor(node).opacity
        });

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(R, 16, 16),
          material
        );
        group.add(sphere);

        const label = new SpriteText(String(node.id));
        label.color = 'white';
        label.textHeight = 3;
        label.material.depthWrite = false;
        label.material.depthTest = false;
        group.add(label);

        return group;
      }}
    />
  );
}

export default memo(Graph3D);