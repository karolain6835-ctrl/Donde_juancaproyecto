import {useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import './ModalOperacion.css';

/** Contenedor visual con foco contenido y devolución del foco al cerrar. */
export default function ModalOperacion({title,onClose,busy=false,children}){
 const panel=useRef(null),close=useRef(null),titleId=useId();
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
  return ()=>{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{
  function keydown(e){
   if(e.key==='Escape'){e.preventDefault();if(!busy)onClose();}
   if(e.key==='Tab'){
    const controls=[...(panel.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')||[])].filter(el=>el.getClientRects().length);
    if(!controls.length){e.preventDefault();panel.current?.focus();return;}
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&(document.activeElement===first||!panel.current.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!panel.current.contains(document.activeElement))){e.preventDefault();first.focus();}
   }
  }
  document.addEventListener('keydown',keydown);return ()=>document.removeEventListener('keydown',keydown);
 },[busy,onClose]);
 const content=<div className="operacion-modal-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section className="operacion-modal" ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><header className="operacion-modal-header"><h2 id={titleId}>{title}</h2><button ref={close} type="button" disabled={busy} onClick={onClose} aria-label={`Cerrar ${title.toLocaleLowerCase('es')}`}>×</button></header><div className="operacion-modal-body">{children}</div></section></div>;
 return typeof document==='undefined'?content:createPortal(content,document.body);
}
