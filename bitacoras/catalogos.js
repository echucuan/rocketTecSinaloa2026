// Transcripción de las carpetas de Teams proporcionadas por el profesor.
// Solo se incluyen los equipos de alumnos; el equipo del profesor no pertenece a estos grupos.
(function(root){
  const names={
    '501':['ROCKET','CIMA','COMANDO ESTELAR','SKYLINE','TEC NOVA'],
    '502':['TECATEX AEROSPACE','WAN HU 67','HAIL MARY','WAFLE','TALE'],
    '503':['IMPULSE-X','OSIRIS','PROXIMA CENTAURI','REGULUS'],
    '504':['SPACE TEC','BLUE LAUNCH','ECLIPSE','ANDROMEDA IV','APOLO 5']
  };
  const groups=Object.fromEntries(Object.entries(names).map(([group,teams])=>[group,[
    ...teams.map((nombre,index)=>{const numero=String(index+1).padStart(2,'0');const ext=group==='504'&&['03','04'].includes(numero)?'jpg':'png';return {numero,nombre,rol:'alumno',logo:`assets/equipos/G${group}-E${numero}.${ext}`};})
  ]]));
  const catalog={grupos:groups,equipo:(group,number)=>groups[group]?.find(team=>team.numero===String(number).padStart(2,'0'))};
  root.ROCKET_CATALOG=catalog;if(typeof module!=='undefined')module.exports=catalog;
})(typeof window!=='undefined'?window:globalThis);
