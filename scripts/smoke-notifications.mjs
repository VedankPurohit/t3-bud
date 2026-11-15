// Run after pnpm build. Uses a disposable profile and the real native Electron windows.
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import electron from 'electron';
import {_electron} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile=await mkdtemp(join(tmpdir(),'t3-notifications-'));
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
    const state=globalThis.fixtureState={
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
  await orb.evaluate(({x,y})=>window.companion.move({x,y,settled:true}),{x:area.x+area.width/2,y:area.y+6});
  await orb.locator('.companion-orb').press('Enter');
  await panel.getByRole('button',{name:'Preview notification',exact:true}).waitFor();
  await app.evaluate(({BrowserWindow})=>{
    const rows=Array.from({length:4},(_,i)=>({threadId:'thread-'+i,projectId:'fixture',title:'Completed '+i,
      status:'completed',providerInstanceId:'fixture',driverKind:'codex',
      createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',latestRunCompletedAt:'2026-11-15T00:00:00Z'}));
    globalThis.fixtureState.inbox=rows;
    globalThis.fixtureState.inboxTotal=rows.length;
    for(const win of BrowserWindow.getAllWindows()) win.webContents.send('companion:state',globalThis.fixtureState);
  });
  await panel.getByRole('button',{name:'Preview notification',exact:true}).click();
  await panel.getByRole('button',{name:'Review updates',exact:true}).click();
  assert.equal(await panel.getByRole('listitem').count(),4);
  await panel.getByRole('button',{name:'Dismiss Completed 0',exact:true}).click();
  await panel.waitForFunction(()=>!document.querySelector('[aria-label="Dismiss Completed 0"]'));
  assert.equal(await panel.getByRole('listitem').count(),3);
  // Exercise the timeout fallback used when hidden windows omit transition-end events.
  await panel.evaluate(()=>document.addEventListener('transitionend',event=>event.stopImmediatePropagation(),true));
  await panel.getByRole('button',{name:'Clear all',exact:true}).click();
  await app.evaluate(({BrowserWindow})=>{
    const state=globalThis.fixtureState;
    state.inbox=[...state.inbox,{...state.inbox[0],threadId:'arrived-during-close',title:'New arrival',
      latestRunCompletedAt:'2026-11-15T01:00:00Z',updatedAt:'2026-11-15T01:00:00Z'}];
    state.inboxTotal=state.inbox.length;
    for(const win of BrowserWindow.getAllWindows()) win.webContents.send('companion:state',state);
  });
  await panel.waitForFunction(()=>!document.querySelector('[aria-label="Dismiss Completed 1"]'));
  assert.equal(await panel.getByRole('listitem').count(),1,'a new arrival must stay expanded after the old batch closes');
  assert.equal(await panel.getByRole('button',{name:'Dismiss New arrival',exact:true}).count(),1);
  await panel.getByRole('button',{name:'Clear all',exact:true}).click();
  await panel.locator('.companion-notice-stack').waitFor({state:'detached'});
  assert.equal(await panel.getByRole('listitem').count(),0);
  assert.equal(await panel.locator('.companion-notice-stack').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Passed native notification grouping, review, individual dismissal, batch-close race, and clear all.');
} finally { await app?.close(); await rm(profile,{recursive:true,force:true}); }
