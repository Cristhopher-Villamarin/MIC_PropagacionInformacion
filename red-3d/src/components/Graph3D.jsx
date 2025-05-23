import { useEffect, useRef, memo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

/**
 * @param {Object}   props
 * @param {Object}   props.data         { nodes, links }
 * @param {Function} props.onNodeInfo   callback al hacer click
 * @param {string}   props.highlightId  id del nodo a enfocar/colorear (opcional)
 * @param {Function} props.onResetView  callback para resetear la vista (opcional)
 */
function Graph3D({ data, onNodeInfo, highlightId, onResetView }) {
  const fgRef = useRef();
  const isTransitioning = useRef(false); // Evitar transiciones simultáneas

  /* Centra toda la red al cargar / filtrar */
  useEffect(() => {
    if (!isTransitioning.current) {
      fgRef.current?.zoomToFit(400, 100); // Suavizar el zoom inicial
    }
  }, [data]);

  /* Enfoca y “flashea” cuando cambia highlightId */
  useEffect(() => {
    if (!highlightId || !fgRef.current || !data.nodes.length || isTransitioning.current) return;

    const node = data.nodes.find(n => n.id === highlightId);
    if (!node) {
      alert('Usuario no encontrado');
      return;
    }

    const focusNode = () => {
      isTransitioning.current = true; // Bloquear nuevas transiciones

      const { x = 0, y = 0, z = 0 } = node;
      const bounds = calculateGraphBounds(data.nodes);
      const graphSize = Math.max(bounds.maxDistance, 10);
      const distance = graphSize * 1.5;

      // Mover cámara suavemente
      fgRef.current.cameraPosition(
        { x: x + distance, y: y + distance * 0.5, z }, // Ajustar posición para mejor ángulo
        { x, y, z }, // Punto al que mirar
        1500 // Duración más larga para suavidad (1.5 segundos)
      );

      // Iluminar la esfera por 1 segundo
      node.__flashUntil = Date.now() + 9000;
      fgRef.current.refresh();

      // Apagar el flash y liberar la transición
      setTimeout(() => {
        node.__flashUntil = 0;
        fgRef.current.refresh();
        isTransitioning.current = false; // Permitir nuevas transiciones
      }, 9000);
    };

    // Ejecutar sin pausar la física para mantener fluidez
    setTimeout(focusNode, 100); // Breve espera para estabilidad de coordenadas
  }, [highlightId, data.nodes]);

  /* Resetea la vista cuando highlightId se limpia */
  useEffect(() => {
    if (!highlightId && fgRef.current && !isTransitioning.current) {
      isTransitioning.current = true;
      fgRef.current.zoomToFit(400, 100); // Suavizar el zoom de reset
      setTimeout(() => {
        isTransitioning.current = false;
      }, 500); // Liberar después de la animación
    }
  }, [highlightId]);

  /* Calcular los límites del grafo para ajustar la distancia de la cámara */
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

  /* ─────────── render ─────────── */
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      backgroundColor="#111"
      linkOpacity={0.9}
      linkWidth={0.8}
      d3VelocityDecay={0.3}
      warmupTicks={100} // Estabilizar la física al inicio
      onNodeClick={n => onNodeInfo?.(n)}
      nodeThreeObject={node => {
        const group = new THREE.Group();
        const R = 6;

        const color =
          Date.now() < (node.__flashUntil || 0)
            ? '#ffff00'
            : node.color || '#14c3a2';

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(R, 16, 16),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.75,
          })
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