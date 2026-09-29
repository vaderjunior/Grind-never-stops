// Development-only QA harness using the real reader component and styles.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Diagram} from '../src/components';
import '../src/styles.css';
import '../src/illustrated.css';
import '../src/diagrams.css';
const root=createRoot(document.getElementById('root')!);let key=0;
(window as any).showDiagram=(diagram:any)=>root.render(<main className="guide-body" style={{width:'min(900px, calc(100% - 32px))',margin:'16px auto'}}><Diagram key={++key} diagram={diagram}/></main>);
