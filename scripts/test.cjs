const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(path.join(root,'tests')).filter(p=>p.endsWith('.test.cjs')).sort().map(p=>path.join(root,'tests',p));
if(!files.length)throw new Error('No se encontraron pruebas: la validación no puede aprobarse.');
const result=spawnSync(process.execPath,['--test','--test-isolation=none',...files],{cwd:root,stdio:'inherit'});
process.exit(result.status??1);
