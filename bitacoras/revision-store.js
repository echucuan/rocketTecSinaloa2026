(function(root){
  'use strict';

  const DB_NAME='rocket-tec-bitacoras-profesor';
  const DB_VERSION=1;
  const STORE='pendientes';
  const MAX_BYTES=8*1024*1024;

  function copyBuffer(bytes){
    if(bytes instanceof Uint8Array)return bytes.slice().buffer;
    if(bytes instanceof ArrayBuffer)return bytes.slice(0);
    throw Error('No se pudo conservar el archivo original.');
  }

  function makeEntry(input){
    if(!input||!input.record||!input.bytes)throw Error('Primero abre una bitácora válida.');
    const bytes=copyBuffer(input.bytes);
    if(bytes.byteLength>MAX_BYTES)throw Error('El archivo supera 8 MB.');
    const r=input.record;
    return {
      id:r.id,
      folio:r.folio,
      ventana:r.ventana,
      campus:r.campus,
      grupo:String(r.datos.grupo),
      equipo:String(r.datos.equipo),
      nombreEquipo:input.teamName||`Equipo ${r.datos.equipo}`,
      creada:r.creada,
      guardada:new Date().toISOString(),
      fileName:input.fileName||`${r.folio}.zip`,
      fileType:input.fileType||'application/zip',
      bytes
    };
  }

  function openDb(){
    if(!root.indexedDB)return Promise.reject(Error('Este navegador no permite el almacenamiento local requerido.'));
    return new Promise((resolve,reject)=>{
      const request=root.indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:'id'});
          store.createIndex('guardada','guardada');
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('No se pudo abrir la bandeja local.'));
    });
  }

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('No se pudo completar la operación.'));
    });
  }

  async function withStore(mode,operation){
    const db=await openDb();
    try{
      const tx=db.transaction(STORE,mode);
      const completed=new Promise((resolve,reject)=>{
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error('No se pudo completar la operación.'));
        tx.onabort=()=>reject(tx.error||Error('La operación fue cancelada.'));
      });
      const result=await operation(tx.objectStore(STORE));
      await completed;
      return result;
    }finally{db.close();}
  }

  function save(entry){return withStore('readwrite',store=>requestResult(store.put(entry)));}
  function get(id){return withStore('readonly',store=>requestResult(store.get(id)));}
  function remove(id){return withStore('readwrite',store=>requestResult(store.delete(id)));}
  async function list(){
    const entries=await withStore('readonly',store=>requestResult(store.getAll()));
    return entries.sort((a,b)=>String(b.guardada).localeCompare(String(a.guardada)));
  }

  const api={makeEntry,save,get,remove,list,MAX_BYTES};
  root.BitacoraReviewStore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
