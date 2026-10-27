// Run with a local server serving the repository; see README.md.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const base = process.env.TEST_URL || 'http://127.0.0.1:8765/allsuite/';
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#ready').textContent.startsWith('Ready offline'));
  assert.equal(await page.locator('[role=tab]').count(),7);
  const original = JSON.parse(execFileSync('git',['show','f09a27bccf32ec2e04710b17c24cb0557d9e0d6e:itinerary.json'],{cwd:__dirname+'/..',encoding:'utf8'}));
  assert.deepEqual(JSON.parse(fs.readFileSync(__dirname+'/../itinerary.json')),original);
  assert.equal(await page.locator('#booking-list .locked').count(),14);
  for (const width of [320,390,430,768]) {
    await page.setViewportSize({width,height:844});
    for (let day=0;day<7;day++) {
      await page.locator(`#day-${day}`).click();
      assert.match(await page.locator('#heading').textContent(),new RegExp(original[day][0]));
      assert.equal(await page.locator('#schedule .locked').count(), original[day][2].filter(x=>x[1]==='locked').length);
      assert.equal(await page.locator('#schedule .locked button').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `overflow at ${width}, day ${day}`);
      const names = await page.locator('#schedule .locked b').allTextContents();
      const times=names.map(x=>x.match(/\b(\d{1,2}):(\d{2})/)).filter(Boolean).map(x=>+x[1]*60 + +x[2]);
      assert.deepEqual(times,[...times].sort((a,b)=>a-b));
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{localStorage.setItem('allsuite-v3-1-1','Swap');localStorage.setItem('allsuite-v3-1-0','Skip');});
  await page.reload(); await page.locator('#day-1').click();
  assert.equal(await page.locator('[data-key="allsuite-v3-1-1"][data-choice=Swap]').getAttribute('aria-pressed'),'true');
  assert((await page.locator('#schedule .locked').allTextContents()).some(x=>x.includes('Amie Odori')));
  for (const choice of ['Skip','Keep','Swap']) {
    await page.locator(`[data-key="allsuite-v3-1-1"][data-choice=${choice}]`).click();
    await page.reload(); await page.locator('#day-1').click();
    assert.equal(await page.locator(`[data-key="allsuite-v3-1-1"][data-choice=${choice}]`).getAttribute('aria-pressed'),'true');
  }
  assert.match(await page.locator('[data-choice-key="allsuite-v3-1-1"] .activity').textContent(),/HOKUDAI/);
  await page.locator('#day-4').click();
  await page.locator('[data-key="allsuite-food-kitakaro"][data-choice=Skip]').click();
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#heading').textContent.includes('29 Oct'));
  for(let day=0;day<7;day++) await page.locator(`#day-${day}`).click();
  await page.locator('#day-4').click();
  assert.equal(await page.locator('[data-key="allsuite-food-kitakaro"][data-choice=Skip]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#schedule').textContent(),/kimono 10:00–12:00/);
  await page.locator('#day-5').click(); assert.match(await page.locator('#schedule').textContent(),/time not confirmed/);
  await page.locator('#check-cache').click();
  await page.waitForFunction(()=>document.querySelector('#ready').textContent.startsWith('Ready offline'));
  assert.equal(await page.locator('#foods .food').count(),6);
  await page.evaluate(async()=>{const c=await caches.open('allsuite-v4');await c.delete('./itinerary.json');});
  await page.locator('#check-cache').click();
  await page.waitForFunction(()=>document.querySelector('#ready').textContent.startsWith('Not ready ·'));
  await context.setOffline(false); await page.reload();
  await page.locator('#check-cache').click();
  await page.waitForFunction(()=>document.querySelector('#ready').textContent.startsWith('Ready offline'));
  await page.evaluate(()=>{localStorage.setItem('allsuite-v3-1-1','invalid');});
  await page.reload();await page.locator('#day-1').click();
  assert.equal(await page.locator('[data-key="allsuite-v3-1-1"][data-choice=Keep]').getAttribute('aria-pressed'),'true');
  // A full fresh context with denied storage still renders all days.
  const restricted = await browser.newContext();
  await restricted.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};});
  const blocked = await restricted.newPage();await blocked.goto(base);await blocked.locator('#day-1').click();
  await blocked.locator('[data-key="allsuite-v3-1-1"][data-choice=Skip]').click();
  assert.match(await blocked.locator('#save-status').textContent(),/Could not save/);
  await page.locator('#day-0').click();
  if (process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:false});
  assert.deepEqual(errors,[]);
  console.log('PASS: 7 days × 4 mobile/tablet widths, 14 unchanged locks, chronological times, all choice states and migration, offline reload, missing-cache detection/repair, denied storage, no browser errors.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
