import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Lee un CSV y devuelve un array [{ source, target }, …]
export function readCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: res => resolve(res.data),
      error: err => reject(err)
    });
  });
}

// Lee un XLSX y devuelve un array de filas (objetos)
export async function readXlsx(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet);
}

// Combina enlaces + atributos → { nodes, links } para ForceGraph
export function buildGraph(linksRaw, attrsRaw, idKey = 'user_name') {
  const attrMap = new Map();
  attrsRaw.forEach((row, index) => {
    const id = String(row[idKey] ?? row.id ?? row.ID ?? '').trim();
    if (id) {
      attrMap.set(id, row);
    } else {
      console.warn(`Fila ${index} en XLSX sin ID válido:`, row);
    }
  });

  const nodes = [];
  const seen = new Set();

  linksRaw.forEach(({ source, target }, index) => {
    const src = String(source).trim();
    const tgt = String(target).trim();

    if (!src || !tgt) {
      console.warn(`Enlace inválido en CSV (índice ${index}):`, { source, target });
      return;
    }

    if (!seen.has(src)) {
      const attrs = attrMap.get(src) || {};
      nodes.push({
        id: src,
        cluster: attrs.cluster,
        in_fear: Number(attrs.in_fear) || 0,
        in_anger: Number(attrs.in_anger) || 0,
        in_anticip: Number(attrs.in_anticip) || 0,
        in_trust: Number(attrs.in_trust) || 0,
        in_surprise: Number(attrs.in_surprise) || 0,
        in_sadness: Number(attrs.in_sadness) || 0,
        in_disgust: Number(attrs.in_disgust) || 0,
        in_joy: Number(attrs.in_joy) || 0
      });
      seen.add(src);
      if (!attrMap.has(src)) {
        console.warn(`Nodo ${src} no encontrado en atributos XLSX`);
      }
    }
    if (!seen.has(tgt)) {
      const attrs = attrMap.get(tgt) || {};
      nodes.push({
        id: tgt,
        cluster: attrs.cluster,
        in_fear: Number(attrs.in_fear) || 0,
        in_anger: Number(attrs.in_anger) || 0,
        in_anticip: Number(attrs.in_anticip) || 0,
        in_trust: Number(attrs.in_trust) || 0,
        in_surprise: Number(attrs.in_surprise) || 0,
        in_sadness: Number(attrs.in_sadness) || 0,
        in_disgust: Number(attrs.in_disgust) || 0,
        in_joy: Number(attrs.in_joy) || 0
      });
      seen.add(tgt);
      if (!attrMap.has(tgt)) {
        console.warn(`Nodo ${tgt} no encontrado en atributos XLSX`);
      }
    }
  });

  const links = linksRaw
    .filter(l => String(l.source).trim() && String(l.target).trim())
    .map(l => ({
      source: String(l.source).trim(),
      target: String(l.target).trim()
    }));

  console.log('Grafo construido:', {
    nodes: nodes.length,
    links: links.length,
    sampleNode: nodes[0] || 'No nodes',
  });

  return { nodes, links };
}