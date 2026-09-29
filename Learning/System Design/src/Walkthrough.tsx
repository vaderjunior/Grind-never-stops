import {useState} from 'react';
import {ArrowLeft,ArrowRight,RotateCcw} from 'lucide-react';
import {Prose} from './components';
import type {RecordData as D} from './api';

/** An authored worked example, separate from saved exercises and assessment answers. */
export default function Walkthrough({story}:{story:D}) {
 const [active,setActive]=useState(0);
 const steps:D[]=story.steps||[];
 if(!steps.length)return null;
 return <section className="visual-story" aria-label={story.title}>
  <header><p className="eyebrow">WORK THROUGH AN EXAMPLE</p><h3>{story.title}</h3><Prose text={story.intro}/></header>
  <div className="story-step-picker" role="group" aria-label={`Steps in ${story.title}`}>
   {steps.map((step,index)=><button key={index} aria-pressed={active===index} onClick={()=>setActive(index)}><span>{index+1}</span><span>{step.title}</span></button>)}
  </div>
  <div className="story-panels" aria-live="polite" aria-atomic="true">
   {steps.map((step,index)=><div key={index} className="story-panel" hidden={active!==index}>
    <p className="story-position">Step {index+1} of {steps.length}</p><h4>{step.title}</h4>
    <dl className="story-state">{(step.state||[]).map((item:D,j:number)=><div key={j}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    <Prose text={step.explanation}/>
   </div>)}
  </div>
  <div className="story-controls"><button className="button secondary compact" disabled={active===0} onClick={()=>setActive(active-1)}><ArrowLeft size={14}/> Previous</button><span>{active+1} / {steps.length}</span>{active<steps.length-1?<button className="button primary compact" onClick={()=>setActive(active+1)}>Next step <ArrowRight size={14}/></button>:<button className="button secondary compact" onClick={()=>setActive(0)}><RotateCcw size={14}/> Start again</button>}</div>
  <div className="story-takeaway"><strong>What changed?</strong><Prose text={story.takeaway}/></div>
 </section>;
}
