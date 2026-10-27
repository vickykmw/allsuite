const {chromium} = require('playwright');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
(async()=>{
  let legacy=true;
  const root=__dirname+'/..';
  const files=execFileSync('git',['ls-tree','--name-only','f09a27bccf32ec2e04710b17c24cb0557d9e0d6e'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  const old=Object.fromEntries(files.map(file=>[file,execFileSync('git',['show',`f09a27bccf32ec2e04710b17c24cb0557d9e0d6e:${file}`],{cwd:root})]));
  const server=http.createServer((req,res)=>{
    const file=req.url.split('?')[0].replace(/^\/allsuite\//,'')||'index.html';
    if(!/^[a-z0-9.-]+$/i.test(file)){res.writeHead(404);return res.end();}
    try{
      const body=legacy?old[file]:fs.readFileSync(root+'/'+file);
      if(!body) throw new Error('missing');
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/allsuite/`);
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    await page.evaluate(async()=>{localStorage.setItem('allsuite-v3-1-1','Skip');await caches.open('another-app');});
    legacy=false;
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await page.waitForFunction(async()=> (await navigator.serviceWorker.getRegistration()).active?.state === 'activated' && (await caches.keys()).includes('allsuite-v5') && !(await caches.keys()).includes('allsuite-v3'));
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#ready').textContent.startsWith('Ready offline'));
    assert(await page.evaluate(async()=>(await caches.keys()).includes('another-app')));
    await page.locator('#day-1').click();
    assert.equal(await page.locator('[data-key="allsuite-v3-1-1"][data-choice=Skip]').getAttribute('aria-pressed'),'true');
    await page.context().setOffline(true);await page.reload();
    await page.locator('#day-6').click();assert.match(await page.locator('#schedule').textContent(),/Scheduled departure · New Chitose Airport \(CTS\) · 16:00 JST/);
    console.log('PASS: existing v3 installation upgrades to v5, retains choices and unrelated caches, and reloads offline under /allsuite/.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
