import { useEffect, useRef, memo, useMemo, useCallback } from 'react';
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
  const animationTimeoutRefs = useRef(new Set());
  const animationFrameRef = useRef(null);
  const batchUpdateRef = useRef(null);
  
  // Colores inspirados en Intensamente e Intensamente 2
  const emotionColors = {
    in_fear: '#A100A1',
    in_anger: '#FF0000',
    in_anticip: '#FF6200',
    in_trust: '#00CED1',
    in_surprise: '#FF69B4',
    in_sadness: '#4682B4',
    in_disgust: '#00FF00',
    in_joy: '#FFFF00'
  };

  // Determinar si estamos en modo propagación y el tamaño
  const isInPropagationMode = highlightedLinks.length > 0;
  const isLargePropagation = highlightedLinks.length > 50;
  const isExtensivePropagation = highlightedLinks.length > 200;

  // Configuración dinámica basada en el tamaño de la propagación
  const getAnimationConfig = useCallback(() => {
    if (isExtensivePropagation) {
      return {
        ANIMATION_DELAY: 150, // Más lento para ver la secuencia
        ANIMATION_DURATION: 400,
        BATCH_SIZE: 1, // Un enlace a la vez
        VISIBILITY_DURATION: 800,
        REFRESH_THROTTLE: 50 // Throttle más agresivo
      };
    } else if (isLargePropagation) {
      return {
        ANIMATION_DELAY: 4000,
        ANIMATION_DURATION: 4000,
        BATCH_SIZE: 1,
        VISIBILITY_DURATION: 4000,
        REFRESH_THROTTLE: 33
      };
    } else {
      return {
        ANIMATION_DELAY: 4000, // Más lento para propagaciones pequeñas
        ANIMATION_DURATION: 4200,
        BATCH_SIZE: 1,
        VISIBILITY_DURATION: 4500,
        REFRESH_THROTTLE: 16
      };
    }
  }, [isExtensivePropagation, isLargePropagation]);

  // Filtrar datos para mostrar solo nodos y enlaces involucrados en la propagación
  const filteredData = useMemo(() => {
    if (!isInPropagationMode) {
      return data;
    }

    const involvedNodeIds = new Set();
    const linkMap = new Map();
    
    data.links.forEach(link => {
      const sourceId = link.source.id ? String(link.source.id) : String(link.source);
      const targetId = link.target.id ? String(link.target.id) : String(link.target);
      const key1 = `${sourceId}-${targetId}`;
      const key2 = `${targetId}-${sourceId}`;
      linkMap.set(key1, link);
      linkMap.set(key2, link);
    });

    const involvedLinks = new Set();

    highlightedLinks.forEach(highlight => {
      const sourceId = String(highlight.source);
      const targetId = String(highlight.target);
      involvedNodeIds.add(sourceId);
      involvedNodeIds.add(targetId);

      const key1 = `${sourceId}-${targetId}`;
      const key2 = `${targetId}-${sourceId}`;
      
      const originalLink = linkMap.get(key1) || linkMap.get(key2);
      if (originalLink) {
        involvedLinks.add(originalLink);
      }
    });

    const filteredNodes = data.nodes.filter(node => 
      involvedNodeIds.has(String(node.id))
    );

    const filteredLinksArray = Array.from(involvedLinks);

    console.log(`Modo propagación activado:`, {
      totalNodes: data.nodes.length,
      filteredNodes: filteredNodes.length,
      totalLinks: data.links.length,
      filteredLinks: filteredLinksArray.length,
      highlightedLinks: highlightedLinks.length,
      isLarge: isLargePropagation,
      isExtensive: isExtensivePropagation
    });

    return {
      nodes: filteredNodes,
      links: filteredLinksArray
    };
  }, [data, highlightedLinks, isInPropagationMode, isLargePropagation, isExtensivePropagation]);

  // Cache para texturas de gradiente con limpieza automática
  const textureCache = useRef(new Map());
  const textureCacheCleanup = useRef(null);

  // Limpiar cache de texturas periódicamente
  const scheduleTextureCacheCleanup = useCallback(() => {
    if (textureCacheCleanup.current) {
      clearTimeout(textureCacheCleanup.current);
    }
    
    textureCacheCleanup.current = setTimeout(() => {
      if (textureCache.current.size > 100) { // Mantener solo las últimas 100 texturas
        const entries = Array.from(textureCache.current.entries());
        const toKeep = entries.slice(-50); // Mantener solo las últimas 50
        
        textureCache.current.clear();
        toKeep.forEach(([key, value]) => {
          textureCache.current.set(key, value);
        });
      }
    }, 30000); // Limpiar cada 30 segundos
  }, []);

  // Crear textura de gradiente con cache optimizado
  const createGradientTexture = useCallback((colors, weights) => {
    const key = JSON.stringify({ colors, weights });
    if (textureCache.current.has(key)) {
      return textureCache.current.get(key);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128; // Reducido de 256 para mejor rendimiento
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
    context.fillRect(0, 0, 128, 1);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Optimizar filtros
    texture.magFilter = THREE.LinearFilter;
    
    textureCache.current.set(key, texture);
    scheduleTextureCacheCleanup();
    return texture;
  }, [scheduleTextureCacheCleanup]);

  // Obtener color del nodo (memoizado por performance)
  const getNodeColor = useCallback((node) => {
    const emotions = [
      node.in_fear || 0, node.in_anger || 0, node.in_anticip || 0, node.in_trust || 0,
      node.in_surprise || 0, node.in_sadness || 0, node.in_disgust || 0, node.in_joy || 0
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
  }, [createGradientTexture, emotionColors]);

  // Función de refresh throttled para mejor rendimiento
  const throttledRefresh = useCallback(() => {
    if (batchUpdateRef.current) {
      return;
    }
    
    const config = getAnimationConfig();
    batchUpdateRef.current = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.refresh();
      }
      batchUpdateRef.current = null;
    }, config.REFRESH_THROTTLE);
  }, [getAnimationConfig]);

  // Centra la red al cargar o cambiar datos filtrados
  useEffect(() => {
    if (!isTransitioning.current && fgRef.current) {
      const delay = isExtensivePropagation ? 300 : 200; // Delay reducido
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 100);
        }
      }, delay);
    }
  }, [filteredData.nodes, filteredData.links, isExtensivePropagation]);

  // Forzar refresco inicial (optimizado)
  useEffect(() => {
    if (fgRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => {
        if (fgRef.current) {
          fgRef.current.refresh();
        }
      });
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Enfoca al nodo destacado
  useEffect(() => {
    if (!highlightId || !fgRef.current || !filteredData.nodes.length || isTransitioning.current) return;

    const node = filteredData.nodes.find(n => n.id === highlightId);
    if (!node) {
      console.warn('Node not found:', highlightId);
      return;
    }

    const focusNode = () => {
      isTransitioning.current = true;
      const { x = 0, y = 0, z = 0 } = node;
      const bounds = calculateGraphBounds(filteredData.nodes);
      const graphSize = Math.max(bounds.maxDistance, 10);
      const distance = graphSize * 1.5;

      fgRef.current.cameraPosition(
        { x: x + distance, y: y + distance * 0.5, z },
        { x, y, z },
        1500
      );

      node.__flashUntil = Date.now() + 9000;
      throttledRefresh();

      setTimeout(() => {
        node.__flashUntil = 0;
        throttledRefresh();
        isTransitioning.current = false;
      }, 9000);
    };

    setTimeout(focusNode, 100);
  }, [highlightId, filteredData.nodes, throttledRefresh]);

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

  // Calcular límites del grafo (optimizado)
  const calculateGraphBounds = useCallback((nodes) => {
    if (!nodes.length) return { maxDistance: 10 };
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const x = node.x || 0;
      const y = node.y || 0;
      const z = node.z || 0;
      
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    
    return {
      maxDistance: Math.max(maxX - minX, maxY - minY, maxZ - minZ)
    };
  }, []);

  // Limpiar todos los timeouts activos
  const clearAllTimeouts = useCallback(() => {
    animationTimeoutRefs.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    animationTimeoutRefs.current.clear();
    
    if (batchUpdateRef.current) {
      clearTimeout(batchUpdateRef.current);
      batchUpdateRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Limpiar animaciones previas
  const cleanupAnimation = useCallback(() => {
    clearAllTimeouts();
    
    // Limpiar propiedades de animación de forma más eficiente
    const links = filteredData.links;
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      link.__isHighlighted = false;
      link.__isPermanentlyHighlighted = false;
      link.__isCurrentlyAnimating = false;
    }

    throttledRefresh();
  }, [filteredData.links, clearAllTimeouts, throttledRefresh]);

  // Animación secuencial optimizada (UNO POR UNO)
  useEffect(() => {
    cleanupAnimation();

    if (!fgRef.current || !highlightedLinks.length || !filteredData.links.length) {
      return;
    }

    const config = getAnimationConfig();
    console.log('Iniciando animación secuencial optimizada:', {
      highlightedLinks: highlightedLinks.length,
      config,
      isExtensive: isExtensivePropagation
    });

    // Resetear todos los enlaces de forma más eficiente
    const links = filteredData.links;
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      link.__isHighlighted = false;
      link.__isPermanentlyHighlighted = false;
      link.__isCurrentlyAnimating = false;
    }

    // Crear un mapa de enlaces para búsqueda O(1)
    const linkMap = new Map();
    links.forEach(link => {
      const sourceId = link.source.id ? String(link.source.id) : String(link.source);
      const targetId = link.target.id ? String(link.target.id) : String(link.target);
      const key1 = `${sourceId}-${targetId}`;
      const key2 = `${targetId}-${sourceId}`;
      linkMap.set(key1, link);
      linkMap.set(key2, link);
    });

    // Ordenar enlaces por timeStep
    const sortedHighlightedLinks = [...highlightedLinks].sort((a, b) => a.timeStep - b.timeStep);
    
    // Función para animar un enlace específico (UNO POR UNO)
    const animateLink = (highlight, index) => {
      const sourceId = String(highlight.source);
      const targetId = String(highlight.target);

      // Buscar el enlace correspondiente usando el mapa optimizado
      const key1 = `${sourceId}-${targetId}`;
      const key2 = `${targetId}-${sourceId}`;
      const linkObj = linkMap.get(key1) || linkMap.get(key2);

      if (!linkObj) {
        console.warn(`Enlace no encontrado: ${sourceId} -> ${targetId}`);
        return;
      }

      // Marcar como animándose actualmente
      linkObj.__isCurrentlyAnimating = true;
      linkObj.__isHighlighted = true;

      console.log(`Animando enlace ${index + 1}/${sortedHighlightedLinks.length}: ${sourceId} -> ${targetId}`);

      // Refrescar para mostrar la animación (throttled)
      throttledRefresh();

      // Programar el fin de la animación actual y marcar como permanente
      const animationEndTimeout = setTimeout(() => {
        if (linkObj) {
          linkObj.__isCurrentlyAnimating = false;
          linkObj.__isPermanentlyHighlighted = true;
          
          throttledRefresh();
        }
        animationTimeoutRefs.current.delete(animationEndTimeout);
      }, config.ANIMATION_DURATION);

      animationTimeoutRefs.current.add(animationEndTimeout);
    };

    // Programar cada animación secuencialmente (UNO POR UNO)
    sortedHighlightedLinks.forEach((highlight, index) => {
      const delay = index * config.ANIMATION_DELAY;
      
      const animationTimeout = setTimeout(() => {
        animateLink(highlight, index);
        animationTimeoutRefs.current.delete(animationTimeout);
      }, delay);

      animationTimeoutRefs.current.add(animationTimeout);
    });

    // Programar limpieza final
    const totalDuration = sortedHighlightedLinks.length * config.ANIMATION_DELAY + config.ANIMATION_DURATION;
    const finalTimeout = setTimeout(() => {
      console.log('Animación secuencial completada');
      animationTimeoutRefs.current.delete(finalTimeout);
    }, totalDuration);

    animationTimeoutRefs.current.add(finalTimeout);

    return () => {
      cleanupAnimation();
    };
  }, [highlightedLinks, filteredData.links, isExtensivePropagation, isLargePropagation, 
      cleanupAnimation, getAnimationConfig, throttledRefresh]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      textureCache.current.clear();
      if (textureCacheCleanup.current) {
        clearTimeout(textureCacheCleanup.current);
      }
    };
  }, [clearAllTimeouts]);

  // Memoizar geometrías para mejor rendimiento
  const sphereGeometry = useMemo(() => {
    return isExtensivePropagation 
      ? new THREE.SphereGeometry(6, 8, 8) // Menos detalles para propagaciones extensas
      : new THREE.SphereGeometry(6, 16, 16);
  }, [isExtensivePropagation]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={filteredData}
      backgroundColor="#111"
      // Configuración de enlaces
      linkOpacity={0.9}
      linkWidth={link => {
        if (link.__isCurrentlyAnimating) {
          return 2.5; // Más ancho durante la animación
        } else if (link.__isPermanentlyHighlighted) {
          return 2.0; // Ancho permanente
        }
        return 0.8; // Ancho normal
      }}
      linkColor={link => {
        if (link.__isCurrentlyAnimating) {
          return '#00ffff'; // Cian brillante durante la animación
        } else if (link.__isPermanentlyHighlighted) {
          return '#aaff00'; // Verde fosforescente permanente
        }
        return '#FFFFFF'; // Blanco normal
      }}
      // Configuración de flechas
      linkDirectionalArrowLength={5}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={link => {
        if (link.__isCurrentlyAnimating) {
          return '#00ffff'; // Cian brillante durante la animación
        } else if (link.__isPermanentlyHighlighted) {
          return '#aaff00'; // Verde fosforescente permanente
        }
        return '#FFFFFF'; // Blanco normal
      }}
      linkDirectionalArrowResolution={isExtensivePropagation ? 4 : 8} // Menos resolución para mejor rendimiento
      // Configuración de física optimizada
      d3VelocityDecay={isExtensivePropagation ? 0.4 : 0.3} // Más rápido para propagaciones grandes
      warmupTicks={isExtensivePropagation ? 20 : 100} // Menos ticks para mejor rendimiento
      cooldownTicks={isExtensivePropagation ? 20 : 100}
      // Event handlers
      onNodeClick={onNodeInfo}
      // Renderizado de nodos optimizado
      nodeThreeObject={node => {
        const group = new THREE.Group();

        const color = Date.now() < (node.__flashUntil || 0)
          ? '#8a411d'
          : getNodeColor(node).texture;

        const material = new THREE.MeshBasicMaterial({
          map: color instanceof THREE.Texture ? color : null,
          color: color instanceof THREE.Texture ? null : color,
          transparent: true,
          opacity: getNodeColor(node).opacity
        });

        const sphere = new THREE.Mesh(sphereGeometry, material);
        group.add(sphere);

        const label = new SpriteText(String(node.id));
        label.color = 'white';
        label.textHeight = isExtensivePropagation ? 2.5 : 3; // Texto más pequeño para mejor rendimiento
        label.material.depthWrite = false;
        label.material.depthTest = false;
        group.add(label);

        return group;
      }}
    />
  );
}

export default memo(Graph3D);