import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parts=['Jiahao Knowledge Card Table — runtime third-party notices\n'];
for(const name of ['react','react-dom','scheduler']){
  const dir=path.join(root,'node_modules',name);
  const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  parts.push(`${name} ${pkg.version}\n${fs.readFileSync(path.join(dir,'LICENSE'),'utf8')}`);
}
fs.writeFileSync(path.join(root,'public','THIRD-PARTY-NOTICES.txt'),parts.join('\n\n------------------------------\n\n'));
fs.copyFileSync(path.join(root,'LICENSE'),path.join(root,'public','LICENSE.txt'));
console.log('Included complete runtime licenses.');
