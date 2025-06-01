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
  const animationFrameRef = useRef();
  const animationStateRef = useRef({
    isRunning: false,
    startTime: 0,
    currentLinkIndex: 0
  });

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
    const totalWeight = weights.reduce((acc, curr) => acc + curr, 0) || 1;
    colors.forEach((color, i) => {
      const stop = offset + (weights[i] / totalWeight);
      gradient.addColorStop(offset, color);
      offset = stop;
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 1);
    return new THREE.CanvasTexture(canvas);
  };

  // Obtener color del nodo
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
    return { texture: createGradientTexture(colors, weights), opacity: 0.8 };
  };

  // Centra la red al cargar
  useEffect(() => {
    if (!isTransitioning.current && fgRef.current) {
      fgRef.current.zoomToFit(400, 100);
    }
  }, [data.nodes, data.links]);

  // Forzar refresco inicial para asegurar renderización de flechas
  useEffect(() => {
    if (fgRef.current) {
      setTimeout(() => {
        fgRef.current.refresh();
      }, 100);
    }
  }, []);

  // Enfoca al nodo destacado
  useEffect(() => {
    if (!highlightId || !fgRef.current || !data.nodes.length || isTransitioning.current) return;

    const node = data.nodes.find(n => n.id === highlightId);
    if (!node) {
      console.warn('Node not found:', highlightId);
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

  // Resetea la vista
  useEffect(() => {
    if (!highlightId && fgRef.current && !isTransitioning.current) {
      isTransitioning.current = true;
      fgRef.current.zoomToFit(400, 100);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 500);
    }
  }, [highlightId]);

  // Calcular límites del grafo
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

  // Limpiar animación previa
  const cleanupAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationStateRef.current = {
      isRunning: false,
      startTime: 0,
      currentLinkIndex: 0
    };
    data.links.forEach(link => {
      link.__isHighlighted = false;
      link.__isPermanentlyHighlighted = false;
      link.__animationProgress = 0;
      link.__isAnimating = false;
    });
  };

  // Animación mejorada de enlaces optimizada para 60fps
  useEffect(() => {
    cleanupAnimation();

    if (!fgRef.current || !highlightedLinks.length || !data.links.length) {
      console.log('No se ejecuta animación:', {
        hasFgRef: !!fgRef.current,
        highlightedLinksCount: highlightedLinks.length,
        linksCount: data.links.length
      });
      return;
    }

    console.log('Iniciando animación para highlightedLinks:', highlightedLinks);

    // Resetear todos los enlaces
    data.links.forEach(link => {
      link.__isHighlighted = false;
      link.__isPermanentlyHighlighted = false;
      link.__animationProgress = 0;
      link.__isAnimating = false;
    });

    // Preparar la animación secuencial
    const sortedHighlightedLinks = [...highlightedLinks].sort((a, b) => a.timeStep - b.timeStep);
    const ANIMATION_DELAY = 2000; // 2 segundos entre cada enlace
    const ANIMATION_DURATION = 1000; // 1 segundo para cada animación de enlace

    let lastTime = 0;
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms

    const animationState = animationStateRef.current;
    animationState.isRunning = true;
    animationState.startTime = performance.now();

    const animateStep = (currentTime) => {
      if (!animationState.isRunning) return;

      // Limitar a 60fps
      if (currentTime - lastTime < FRAME_TIME) {
        animationFrameRef.current = requestAnimationFrame(animateStep);
        return;
      }
      lastTime = currentTime;

      const elapsed = currentTime - animationState.startTime;
      const expectedIndex = Math.floor(elapsed / ANIMATION_DELAY);

      // Activar nuevos enlaces si es tiempo
      while (animationState.currentLinkIndex <= expectedIndex && animationState.currentLinkIndex < sortedHighlightedLinks.length) {
        const highlight = sortedHighlightedLinks[animationState.currentLinkIndex];
        const sourceId = String(highlight.source);
        const targetId = String(highlight.target);

        const linkObj = data.links.find(l => {
          const linkSource = l.source.id ? String(l.source.id) : String(l.source);
          const linkTarget = l.target.id ? String(l.target.id) : String(l.target);
          return linkSource === sourceId && linkTarget === targetId ||
               (linkSource === targetId && linkTarget === sourceId);
        });

        if (linkObj) {
          console.log(`Activando enlace [${animationState.currentLinkIndex}]: ${sourceId} -> ${targetId}`);
          linkObj.__isAnimating = true;
          linkObj.__animationStartTime = currentTime;
          linkObj.__animationProgress = 0;
        } else {
          console.warn(`Enlace no encontrado: ${sourceId} -> ${targetId}`);
        }

        animationState.currentLinkIndex++;
      }

      // Actualizar progreso de animaciones activas
      let hasActiveAnimations = false;
      const linksToUpdate = [];

      for (let i = 0; i < data.links.length; i++) {
        const link = data.links[i];
        if (link.__isAnimating) {
          const animElapsed = currentTime - (link.__animationStartTime || currentTime);
          const progress = Math.min(animElapsed / ANIMATION_DURATION, 1);
          link.__animationProgress = progress;

          if (progress >= 1) {
            link.__isAnimating = false;
            link.__isPermanentlyHighlighted = true;
            link.__animationProgress = 1;
          } else {
            hasActiveAnimations = true;
          }
          linksToUpdate.push(link);
        }
      }

      // Refrescar si hay cambios
      if (linksToUpdate.length > 0 && fgRef.current) {
        fgRef.current.refresh();
      }

      // Continuar animando si hay enlaces activos o pendientes
      if (hasActiveAnimations || animationState.currentLinkIndex < sortedHighlightedLinks.length) {
        animationFrameRef.current = requestAnimationFrame(animateStep);
      } else {
        console.log('Animación completada completamente');
        animationState.isRunning = false;
      }
    };

    // Iniciar la animación
    animationFrameRef.current = requestAnimationFrame(animateStep);

    // Cleanup function
    return () => {
      cleanupAnimation();
    };
  }, [highlightedLinks, data.links]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanupAnimation();
    };
  }, []);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      backgroundColor="#111"
      // Configuración de enlaces básicos
      linkOpacity={0.9}
      linkWidth={link => {
        if (link.__isAnimating) {
          const progress = link.__animationProgress || 0;
          return 0.8 + (1.2 * progress); // De 0.8 a 2
        } else if (link.__isPermanentlyHighlighted) {
          return 2;
        }
        return 0.8;
      }}
      linkColor={link => {
        if (link.__isAnimating) {
          const progress = link.__animationProgress || 0;
          const r = Math.round(255 * (1 - progress) + 170 * progress); // 255 -> 170 (rojo de #aaff00)
          const g = 255; // Verde constante
          const b = Math.round(255 * (1 - progress)); // 255 -> 0 (azul de #aaff00)
          return `rgb(${r},${g},${b})`;
        } else if (link.__isPermanentlyHighlighted) {
          return '#aaff00'; // Verde fosforescente permanente
        }
        return '#FFFFFF'; // Blanco por defecto
      }}
      // Configuración de flechas - USANDO VALORES FIJOS COMO EN EL CÓDIGO QUE FUNCIONA
      linkDirectionalArrowLength={5}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={link => {
        if (link.__isAnimating) {
          const progress = link.__animationProgress || 0;
          const r = Math.round(255 * (1 - progress) + 170 * progress); // 255 -> 170 (rojo de #aaff00)
          const g = 255; // Verde constante
          const b = Math.round(255 * (1 - progress)); // 255 -> 0 (azul de #aaff00)
          return `rgb(${r},${g},${b})`;
        } else if (link.__isPermanentlyHighlighted) {
          return '#aaff00'; // Verde fosforescente permanente
        }
        return '#FFFFFF'; // Blanco por defecto
      }}
      linkDirectionalArrowResolution={8}
      // Configuración de física
      d3VelocityDecay={0.3}
      warmupTicks={100}
      // Event handlers
      onNodeClick={n => onNodeInfo?.(n)}
      // Renderizado de nodos
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