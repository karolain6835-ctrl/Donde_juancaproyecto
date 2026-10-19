import {useContext,useState} from 'react';
import {UNSAFE_LocationContext} from 'react-router-dom';

/** Abre el formulario solicitado y permite cerrarlo sin reabrirlo al renderizar. */
export function useQuickAction(action, permitted) {
 const location=useContext(UNSAFE_LocationContext)?.location;
 const key=location?.key;
 const requested=permitted && location?.state?.quickAction===action;
 const [selection,setSelection]=useState({key,value:Boolean(requested)});
 return [selection.key===key?selection.value:Boolean(requested),value=>setSelection({key,value})];
}
