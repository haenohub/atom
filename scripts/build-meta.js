import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function sourceHash(root){
  const files=['index.html','package.json','package-lock.json','vite.config.js','scripts/build-meta.js'];
  const visit=relative=>{const dir=path.join(root,relative);if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=relative+'/'+entry.name;if(entry.isDirectory())visit(name);else if(entry.isFile())files.push(name);}};
  visit('src');visit('public');const hash=crypto.createHash('sha256');
  for(const file of files.sort())if(fs.existsSync(path.join(root,file))){hash.update(file);hash.update('\0');hash.update(fs.readFileSync(path.join(root,file)));hash.update('\0');}
  return hash.digest('hex');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=process.cwd(),file=path.join(root,'dist/build-meta.json'),current=sourceHash(root);
  if(process.argv.includes('--write')){fs.writeFileSync(file,JSON.stringify({version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,sourceHash:current},null,2)+'\n');console.log('Build fingerprint saved.');}
  else {let stored=null;try{stored=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}process.exitCode=stored?.sourceHash===current?0:1;}
}
