// Run after pnpm build. Uses a disposable profile and the real native Electron windows.
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import electron from 'electron';
import {_electron} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile=await mkdtemp(join(tmpdir(),'t3-native-placement-'));
let app;
try {
  const env={...process.env,T3_COMPANION_USER_DATA:profile};
  delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL;
  app=await _electron.launch({executablePath:electron,args:[root],env,timeout:30000});
  const first=await app.firstWindow();
  await first.waitForLoadState('domcontentloaded');
  const pages=app.windows();
  const errors=[];
  for(const page of pages) page.on('pageerror',error=>errors.push(error.message));
  await Promise.all(pages.map(page=>page.waitForLoadState('domcontentloaded')));
  const orb=pages.find(page=>page.url().includes('surface=mascot')) ?? first;
  const panel=pages.find(page=>!page.url().includes('surface=mascot')) ?? first;
  await orb.locator('.companion-orb').waitFor();
  const area=await app.evaluate(({screen})=>{
    globalThis.testCursor={x:-10000,y:-10000};
    screen.getCursorScreenPoint=()=>globalThis.testCursor;
    return screen.getPrimaryDisplay().workArea;
  });
  // Keep backend state deterministic. No message is sent and no pairing is used.
  await app.evaluate(({ipcMain, BrowserWindow})=>{
    const state={
      connection:{state:'connected',serverUrl:'http://fixture'}, environmentId:'fixture',
      inbox:[],working:[],snoozed:[],settled:[],inboxTotal:0,synchronized:true,
      syncedAt:new Date().toISOString(),
      projects:[{id:'fixture',title:'Fixture',workspaceRoot:'/tmp/fixture',projectIcon:{kind:'monogram',text:'F',color:'blue'}}],
      providers:[{providerInstanceId:'fixture',driverKind:'codex',displayName:'Fixture',available:true,
        models:[{id:'test',label:'Test model',options:[{id:'reasoningEffort',values:['low','medium','high'],default:'medium'}]}]}],
    };
    ipcMain.removeHandler('companion:get-state');
    ipcMain.handle('companion:get-state',()=>state);
    for(const win of BrowserWindow.getAllWindows()) {
      const send=win.webContents.send.bind(win.webContents);
      win.webContents.send=(channel,...args)=>send(channel,...(channel==='companion:state'?[state]:args));
      win.webContents.send('companion:state',state);
    }
  });
  for (const x of [area.x+46, area.x+area.width/2, area.x+area.width-46]) {
    for (const y of [area.y+6, area.y+area.height-74]) {
      await app.evaluate(({BrowserWindow})=>{
        globalThis.testCursor={x:-10000,y:-10000};
        for (const win of BrowserWindow.getAllWindows())
          if (!win.webContents.getURL().includes('surface=mascot')) win.webContents.send('companion:fold');
      });
      await orb.evaluate(({x,y})=>window.companion.move({x,y,settled:true}),{x,y});
      await orb.waitForTimeout(400);
      await orb.evaluate(()=>{
        window.positions=[]; window.recording=true;
        const frame=()=>{
          if (!window.recording) return;
          const bounds=document.querySelector('.companion-orb').getBoundingClientRect();
          window.positions.push({x:Math.round(screenX+bounds.x+bounds.width/2),y:Math.round(screenY+bounds.y),width:innerWidth,height:innerHeight});
          requestAnimationFrame(frame);
        }; requestAnimationFrame(frame);
      });
      await app.evaluate((_electron,cursor)=>{globalThis.testCursor=cursor;},{x,y:y+30});
      await orb.waitForTimeout(400);
      await orb.locator('.companion-orb').press('Enter');
      await panel.locator('.panel-in').first().waitFor({state:'visible'});
      await orb.waitForTimeout(350);
      const opened=await orb.evaluate(()=>{
        const r=document.querySelector('.companion-orb').getBoundingClientRect();
        return {x:Math.round(screenX+r.x+r.width/2),y:Math.round(screenY+r.y)};
      });
      assert.deepEqual(opened,{x,y},'opening the full panel must keep the mascot at its screen anchor');
      const full=await panel.locator('.panel-in').first().boundingBox();
      const viewport=await panel.evaluate(()=>({width:innerWidth,height:innerHeight}));
      assert(full && full.x>=0 && full.y>=0 && full.x+full.width<=viewport.width &&
        full.y+full.height<=viewport.height,'the full panel must fit in its window');
      await orb.locator('.companion-orb').press('Enter');
      await panel.locator('.panel-in').first().waitFor({state:'hidden'});
      await panel.locator('.companion-controls[data-visible="true"]').waitFor();
      await panel.getByRole('button',{name:'New thread',exact:true}).click();
      await panel.locator('.quick-thread').waitFor();
      await panel.getByRole('button',{name:'Choose model',exact:true}).click();
      await panel.locator('[data-popup-open]').waitFor();
      await panel.waitForTimeout(300);
      const picker=await panel.locator('[data-popup-open]').boundingBox();
      const quickViewport=await panel.evaluate(()=>({width:innerWidth,height:innerHeight}));
      assert(picker && picker.y>=0 && picker.y+picker.height<=quickViewport.height,
        `model picker must fit above or below the composer: ${JSON.stringify({picker,quickViewport})}`);
      await orb.locator('.companion-orb').press('Enter');
      await panel.locator('.quick-thread').waitFor({state:'hidden'});
      await orb.locator('.companion-orb').press('Enter');
      await panel.getByRole('button',{name:'Preview notification',exact:true}).click();
      await panel.locator('.companion-notice').waitFor();
      await app.evaluate(()=>{globalThis.testCursor={x:-10000,y:-10000};});
      await panel.locator('.companion-notice-close').click();
      await orb.waitForTimeout(500);
      await app.evaluate(({screen})=>{
        screen.emit('display-metrics-changed',{},screen.getPrimaryDisplay(),['workArea']);
      });
      await app.evaluate((_electron,cursor)=>{globalThis.testCursor=cursor;},{x,y:y+30});
      await panel.locator('.companion-controls[data-visible="true"]').waitFor({timeout:2000});
      const frames=await orb.evaluate(()=>{window.recording=false;return window.positions;});
      assert(frames.length>3,'expected animation-frame samples');
      assert.deepEqual(frames.filter(p=>p.x!==x || p.y!==y || p.width!==92 || p.height!==74),[],
        'mascot must stay anchored in a fixed viewport on every transition frame');
      console.log(`Passed native full panel, composer, picker and notification frames at ${x}, ${y}`);
    }
  }
  assert.deepEqual(errors,[],'native renderers must not throw during transitions');
} finally { await app?.close(); await rm(profile,{recursive:true,force:true}); }
