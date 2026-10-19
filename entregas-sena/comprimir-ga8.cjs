const fs=require('node:fs'),p=require('node:path'),z=require('node:zlib'),c=require('node:crypto');
const name='GA8-220501096-AA1-EV01_Donde_Juanca_Codigo_Integrado',base=p.join(__dirname,name);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p.join(d,e.name)):[p.join(d,e.name)]);
const table=Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i>>>1)^((i&1)?0xedb88320:0);return i>>>0});
function crc(b){let n=0xffffffff;for(const x of b)n=table[(n^x)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
const chunks=[],central=[];let offset=0;const files=walk(base);
for(const f of files){const data=fs.readFileSync(f),def=z.deflateRawSync(data),filename=Buffer.from(name+'/'+p.relative(base,f).replaceAll('\\','/')),checksum=crc(data),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(0x5d53,12);h.writeUInt32LE(checksum,14);h.writeUInt32LE(def.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(filename.length,26);
const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x800,8);ch.writeUInt16LE(8,10);ch.writeUInt16LE(0x5d53,14);ch.writeUInt32LE(checksum,16);ch.writeUInt32LE(def.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(filename.length,28);ch.writeUInt32LE(offset,42);central.push(ch,filename);chunks.push(h,filename,def);offset+=h.length+filename.length+def.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...chunks,directory,end]),dest=p.join(__dirname,name+'.zip');fs.writeFileSync(dest,zip);
console.log(JSON.stringify({zip:dest,archivos:files.length,bytes:zip.length,sha256:c.createHash('sha256').update(zip).digest('hex')}));
