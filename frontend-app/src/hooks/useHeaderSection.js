import { useContext, useState } from 'react';
import { UNSAFE_LocationContext } from 'react-router-dom';

/** Abre la pesta?a solicitada por la cabecera sin cambiar las rutas p?blicas. */
export function useHeaderSection(initial, allowed) {
 const location=useContext(UNSAFE_LocationContext)?.location;
 const key=location?.key;
 const requested=location?.state?.headerSection;
 const destination=allowed.includes(requested)?requested:initial;
 const [selection,setSelection]=useState({key,value:destination});
 const value=selection.key===key?selection.value:destination;
 return [value, value=>setSelection({key,value})];
}
