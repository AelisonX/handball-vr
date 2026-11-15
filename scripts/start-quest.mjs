import {readFile,appendFile,mkdir} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {X509Certificate,createPrivateKey,createPublicKey} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRelay} from '../server/relay.mjs';

const tlsRoot=new URL('../../work/handball-tls/',import.meta.url);
await mkdir(tlsRoot,{recursive:true});
async function log(message){console.log(message);await appendFile(new URL('startup.log',tlsRoot),`${new Date().toISOString()} ${message}\n`);}
let app;
try {
 const entries=Object.entries(networkInterfaces()).sort(([a],[b])=>Number(/wi-?fi|wireless/i.test(b))-Number(/wi-?fi|wireless/i.test(a)));
 const host=process.env.HANDBALL_LAN_IP||entries.flatMap(([,items])=>items??[]).find(x=>x.family==='IPv4'&&!x.internal&&!x.address.startsWith('169.254.'))?.address;
 if(!host)throw Error('No local IPv4 address found. Connect this PC to Wi-Fi.');
 const cert=await readFile(new URL('cert.pem',tlsRoot)),key=await readFile(new URL('key.pem',tlsRoot)),certificate=new X509Certificate(cert);
 if(!certificate.checkIP(host)||Date.parse(certificate.validTo)<=Date.now())throw Error('The local certificate needs refreshing for this Wi-Fi address. Run scripts/start-quest.ps1 with PowerShell 7.');
 const actual=createPublicKey(createPrivateKey(key)).export({type:'spki',format:'der'});
 if(!actual.equals(certificate.publicKey.export({type:'spki',format:'der'})))throw Error('Local certificate and private key do not match.');
 await readFile(new URL('../dist/index.html',import.meta.url));
 app=createRelay({host,port:8444,tls:{cert,key},root:fileURLToPath(new URL('../dist/',import.meta.url))});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(8444,host,resolve);});
 await log(`RUNNING: https://${host}:8444/`);
 console.log('Keep this window open. Ctrl+C stops Handball.');
 console.log('Use the same Wi-Fi on Quest. This is a local, self-signed HTTPS certificate.');
 console.log('Room/signaling service: this same server, /multiplayer.');
 process.once('SIGINT',()=>{console.log('Stopping Handball.');void app.close().finally(()=>process.exit(0));});
}catch(error){
 await log(`START FAILED: ${error.message}`);
 console.error('The server is NOT running. Keep this error visible for diagnosis.');
 if(app)await app.close().catch(()=>{});
 process.exit(1);
}
