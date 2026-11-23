'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const core=require('../bitacoras/core.js');

const source=path.resolve(__dirname,'..');

function record(mass='72'){
  return {
    schema:'rocket-tec-bitacora/1',id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    folio:'ALFA-4-G501-E01-RAAAAAAAA',campus:'Sinaloa',ventana:'ALFA-4',creada:'2026-11-23T16:00:00.000Z',
    datos:{grupo:'501',equipo:'01',fecha:'2026-11-13',hora:'07:45',version:'PLA',masa:mass,motor:'Estes A10-3T',motores_restantes:'7',resultado:'Encendió y salió de la base',trayectoria:'Se desvió lateralmente',recuperacion:'Recuperado completo'},
    foto:null
  };
}

function packageBytes(value){
  return core.zip({'bitacora.json':JSON.stringify(value,null,2),'reporte.html':core.report(value)});
}

function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rocket-publicador-'));
  for(const item of ['scripts','bitacoras','ventanas','assets'])fs.cpSync(path.join(source,item),path.join(root,item),{recursive:true});
  return root;
}

function run(root){return spawnSync(process.execPath,['scripts/publicar-bitacoras.cjs'],{cwd:root,encoding:'utf8'});}

test('publica una vez, omite el ZIP idéntico y rechaza el mismo ID modificado',()=>{
  const root=setup(),input=path.join(root,'bitacoras/entradas');
  try{
    fs.writeFileSync(path.join(input,'vuelo.zip'),packageBytes(record()));
    const first=run(root);assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/1 publicada/);
    const entries=require(path.join(root,'bitacoras/publicadas/registros.js'));
    const published=entries.find(item=>item.id===record().id);
    assert.ok(published);assert.ok(published.archivo_sha256);assert.equal(fs.existsSync(path.join(input,'vuelo.zip')),false);
    const destination=path.dirname(path.join(root,'bitacoras',published.pagina));
    assert.ok(fs.existsSync(path.join(destination,'index.html')));

    fs.copyFileSync(path.join(destination,'entrega-original.zip'),path.join(input,'repetida.zip'));
    const second=run(root);assert.equal(second.status,0,second.stderr);assert.match(second.stdout,/1 duplicada/);
    delete require.cache[require.resolve(path.join(root,'bitacoras/publicadas/registros.js'))];
    assert.equal(require(path.join(root,'bitacoras/publicadas/registros.js')).filter(item=>item.id===record().id).length,1);
    assert.equal(fs.existsSync(path.join(input,'repetida.zip')),false);

    fs.writeFileSync(path.join(input,'conflicto.zip'),packageBytes(record('99')));
    const third=run(root);assert.notEqual(third.status,0);assert.match(third.stderr,/contenido diferente/);
    assert.equal(fs.existsSync(path.join(input,'conflicto.zip')),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
