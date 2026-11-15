const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {setTimeout: delay} = require('node:timers/promises');

test('API real con MariaDB 10.4: salud 200/503/200 y proceso vivo tras corte TCP', {
  skip:process.env.RUN_MYSQL_HEALTH_TESTS !== '1', timeout:20000
}, async () => {
  assert.equal(process.env.DB_HOST,'127.0.0.1');
  assert.match(process.env.DB_NAME,/^dj_v1_regression_[a-f0-9]{32}$/);
  const sockets=new Set();
  const proxy=net.createServer(client=>{
    const upstream=net.connect(Number(process.env.DB_PORT),'127.0.0.1');
    for(const socket of [client,upstream]){
      sockets.add(socket);
      socket.on('close',()=>sockets.delete(socket));
      socket.on('error',()=>{client.destroy();upstream.destroy();});
    }
    client.pipe(upstream).pipe(client);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  const proxyPort=proxy.address().port;
  const reservation=net.createServer();
  await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
  const apiPort=reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,[path.join(__dirname,'../src/index.js')],{
    env:{...process.env,DB_PORT:String(proxyPort),PORT:String(apiPort)},
    windowsHide:true,stdio:['ignore','pipe','pipe']
  });
  let logs='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{logs=(logs+bytes.toString()).slice(-4000);});
  const request=()=>fetch('http://127.0.0.1:'+apiPort+'/api/health',{signal:AbortSignal.timeout(12000)});
  try {
    let ready=false;
    for(let i=0;i<120;i++){
      assert.equal(child.exitCode,null,logs);
      try {const response=await request();if(response.status===200){ready=true;break;}}catch{}
      await delay(25);
    }
    assert.ok(ready,'La API debe iniciar: '+logs);
    const up=await request();assert.equal(up.status,200);
    assert.deepEqual(await up.json(),{status:'ok',api:'up',database:'up'});
    for(const socket of sockets)socket.destroy();
    await new Promise(resolve=>proxy.close(resolve));
    const down=await request();assert.equal(down.status,503);
    assert.deepEqual(await down.json(),{status:'unavailable',api:'up',database:'down'});
    assert.equal(child.exitCode,null,'El corte no debe terminar Node');
    await new Promise(resolve=>proxy.listen(proxyPort,'127.0.0.1',resolve));
    const recovered=await request();assert.equal(recovered.status,200);
    assert.deepEqual(await recovered.json(),{status:'ok',api:'up',database:'up'});
    assert.equal(child.exitCode,null);
    assert.doesNotMatch(logs,/Unhandled 'error'|uncaughtException/);
  } finally {
    if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
    for(const socket of sockets)socket.destroy();
    if(proxy.listening)await new Promise(resolve=>proxy.close(resolve));
  }
});
