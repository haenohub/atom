import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sourceHash} from '../scripts/build-meta.js';
test('build fingerprint changes after source/asset updates even when timestamps are identical',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'aetherwild-build-'));
  try{fs.mkdirSync(path.join(root,'src'));fs.mkdirSync(path.join(root,'public'));const source=path.join(root,'src/main.js');fs.writeFileSync(source,'version one');const stamp=new Date(1000);fs.utimesSync(source,stamp,stamp);const initial=sourceHash(root);assert.equal(initial,sourceHash(root));fs.writeFileSync(source,'version two');fs.utimesSync(source,stamp,stamp);const updated=sourceHash(root);assert.notEqual(initial,updated);fs.writeFileSync(path.join(root,'public/art.png'),'new pixels');assert.notEqual(updated,sourceHash(root));fs.writeFileSync(path.join(root,'README.md'),'documentation only');const docs=sourceHash(root);fs.writeFileSync(path.join(root,'README.md'),'changed documentation');assert.equal(docs,sourceHash(root));}
  finally{fs.rmSync(root,{recursive:true,force:true});}
});
