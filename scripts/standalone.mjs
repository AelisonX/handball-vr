import {readFile,writeFile,readdir} from 'node:fs/promises';
const files=await readdir(new URL('../dist/assets/',import.meta.url));
const js=files.find(f=>f.endsWith('.js')),css=files.find(f=>f.endsWith('.css'));
if(!js||!css)throw Error('Run npm run build first.');
const code=(await readFile(new URL('../dist/assets/'+js,import.meta.url),'utf8')).replaceAll('</script','<\\/script');
const style=await readFile(new URL('../dist/assets/'+css,import.meta.url),'utf8');
await writeFile(new URL('../handball-desktop.html',import.meta.url),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Handball VR — Desktop Playtest</title><style>${style}</style></head><body><div id="app"></div><script type="module">${code}</script></body></html>`);
console.log('Created handball-desktop.html for a server-free PC playtest.');
