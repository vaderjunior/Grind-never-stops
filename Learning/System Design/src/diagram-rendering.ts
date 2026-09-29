import mermaid from 'mermaid';
import {diagramConfig,prepareDiagramSource} from '../shared/diagrams';

mermaid.initialize(diagramConfig);

export async function renderStudyDiagram(id:string,source:string) {
  const result=await mermaid.render(id,prepareDiagramSource(source));
  const document=new DOMParser().parseFromString(result.svg,'image/svg+xml');
  const svg=document.documentElement;
  const [, , width,height]=(svg.getAttribute('viewBox')||'0 0 640 400').split(/[\s,]+/).map(Number);
  const labels=[...new Set(Array.from(svg.querySelectorAll('text')).map(text=>{
    // Mermaid wraps SVG text into sibling tspans. Retain the spaces between lines.
    const lines=Array.from(text.children);
    return (lines.length?lines.map(line=>line.textContent).join(' '):text.textContent||'').replace(/\s+/g,' ').trim();
  }).filter(Boolean))];
  return {svg:result.svg,width,height,labels};
}
