import config from './diagram-config.json' with {type:'json'};
import type {MermaidConfig} from 'mermaid';

export const diagramConfig = config as MermaidConfig;

// Change the reading direction, never the graph's nodes, edges, or labels.
export function prepareDiagramSource(source:string) {
  return source.replace(/^(\s*(?:flowchart|graph))\s+(?:LR|RL)\b/m, '$1 TB');
}
