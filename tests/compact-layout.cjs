// Run "before" before editing the generator, then "after" with the same fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const base=process.env.TEST_NODE_MODULES||path.join(__dirname,'../node_modules');
const {chromium}=require(path.join(base,'playwright'));
const mode=process.argv[2]||'after',out=path.join(__dirname,'output');fs.mkdirSync(out,{recursive:true});
const norm=s=>s.normalize('NFKC').replace(/[‒–—]/g,'-').replace(/\s/g,'');
const task=i=>({id:'compact-'+i,name:'合成排版測試任務'+i,grade:'A',necessity:'N',deadline:'2026-11-06',goal:'完成資料整理與核對。\n確認交付內容符合需求。',resources:'使用現有設備，無新增預算。',team:'測試同事獨立執行。',difficulty:'B',progress:'本週已完成第一階段。\n下週持續檢查與整理。',notes:'第'+i+'項任務獨立備註，English 123。'});
const feedback={review:'希望更注意時間安排。',suggestions:'資料科學化。'};
const report=(tasks,supplement={review:'',suggestions:''})=>({version:3,personal:{reporter:'合成測試同事',fillDate:'2026-10-27',reportWeek:'2026-W44'},tasks,active:0,supplement,legacySharedNotes:'',legacyNotesResolved:false});
(async()=>{
 const {getDocument}=await import(pathToFileURL(path.join(base,'pdfjs-dist/legacy/build/pdf.mjs')).href);
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({acceptDownloads:true});const results={mode,cases:{}};
 if(mode==='before')await page.route('**/pdf-generator.js',r=>{
  // The historical generator predates the additive export-selection API used by the UI.
  const compatibility="\nReportPDF.selectTasks=tasks=>tasks.map((task,index)=>({task,index})).filter(({task})=>task.excludeFromExport!==true);\nconst historicalBuild=ReportPDF.build;ReportPDF.build=async state=>({...await historicalBuild(state),taskCount:state.tasks.length});\n";
  return r.fulfill({body:fs.readFileSync(path.join(out,'compact-before-generator.js'),'utf8')+compatibility,contentType:'text/javascript'});
 });
 try{
  await page.goto('http://127.0.0.1:4173/docs/');
  async function parse(file){const doc=await getDocument({data:new Uint8Array(fs.readFileSync(file))}).promise;const texts=[],anchors=[];const margin=mode==='before'?42.52:34.02;
   for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),c=await p.getTextContent();assert(Math.abs(p.view[2]-595.28)<1&&Math.abs(p.view[3]-841.89)<1);texts.push(norm(c.items.map(x=>x.str).join('')));
    for(const t of c.items){assert(t.transform[4]>=margin-.2&&t.transform[4]+t.width<=595.28-margin+.2,[i,t.str,'horizontal']);assert(t.transform[5]>=margin-.2&&t.transform[5]+t.height<=841.89-margin+.2,[i,t.str,'vertical']);}
    anchors.push(c.items.filter(t=>['任務績效報告','本任務備註（選填）','總經理評定（由總經理填寫）','整體回饋（選填）',feedback.review,feedback.suggestions].includes(t.str)).map(t=>({text:t.str,x:t.transform[4],y:t.transform[5],size:t.height})));
   }await doc.destroy();return {texts,anchors};
  }
  async function generate(name,state){
   await page.evaluate(s=>localStorage.setItem('task-performance:v1',JSON.stringify(s)),state);await page.reload();const original=await page.evaluate(()=>localStorage.getItem('task-performance:v1'));
   await page.evaluate(()=>{const build=ReportPDF.build;ReportPDF.build=async s=>{const r=await build(s);window.__layout=r.html;return r;};});
   const event=page.waitForEvent('download',{timeout:30000});await page.locator('#download').click();const download=await event,file=path.join(out,`compact-${mode}-${name}.pdf`);await download.saveAs(file);
   const parsed=await parse(file);const geometry=await page.evaluate(()=>{const root=document.createElement('div');root.innerHTML=window.__layout;return [...root.querySelectorAll('svg')].map(svg=>{const rects=[...svg.querySelectorAll('rect')].map(r=>Object.fromEntries(['x','y','width','height'].map(a=>[a,Number(r.getAttribute(a))])));return {left:Math.min(...rects.map(r=>r.x)),width:Math.max(...rects.map(r=>r.width)),bottom:Math.max(...rects.map(r=>r.y+r.height))};});});
   assert.equal(await page.evaluate(()=>localStorage.getItem('task-performance:v1')),original);results.cases[name]={pages:parsed.texts.length,geometry,anchors:parsed.anchors};return {...parsed,file};
  }
  let r=await generate('single',report([task(1)]));assert.equal(r.texts.length,1);assert(r.texts[0].includes(norm(task(1).notes)));assert(r.anchors[0].some(t=>t.text==='任務績效報告'&&Math.abs(t.size-20)<.01));
  r=await generate('three-feedback',report([task(1),task(2),task(3)],feedback));
  for(let i=0;i<3;i++){assert(r.texts[i].includes(norm(task(i+1).notes)));assert(r.texts[i].includes('總經理評定')&&r.texts[i].includes('C延遲')&&r.texts[i].includes('D延誤'));}
  assert.equal(r.texts.join('').split(norm(feedback.review)).length,2);assert.equal(r.texts.join('').split(norm(feedback.suggestions)).length,2);
  if(mode==='after'){assert.equal(r.texts.length,3);assert(r.texts[2].includes(norm(feedback.review))&&r.texts[2].includes(norm(feedback.suggestions)));}
  // Use the exact preview PDF bytes, not a screenshot or a second independent layout.
  await page.locator('#preview').click();await page.locator('#preview-dialog').waitFor({state:'visible'});assert.match(await page.locator('#pdf-preview').getAttribute('src'),/^blob:/);await page.locator('#close-preview').click();
  await page.evaluate(()=>{window.__printed=false;window.print=()=>window.__printed=true;});await page.locator('#print').click();await page.waitForFunction(()=>window.__printed);await page.emulateMedia({media:'print'});const print=path.join(out,`compact-${mode}-print.pdf`);await page.pdf({path:print,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});const printed=await parse(print);assert.deepEqual(printed.texts,r.texts);
  const direct=r.anchors.flat(),printAnchors=printed.anchors.flat();assert.equal(printAnchors.length,direct.length);for(let i=0;i<direct.length;i++){assert.equal(norm(direct[i].text),norm(printAnchors[i].text));assert(Math.abs(direct[i].x-printAnchors[i].x)<1.2&&Math.abs(direct[i].y-printAnchors[i].y)<1.2);}
  results.printMatches=true;console.log('PASS '+mode+': 單任務、三任務、指定兩項回饋、預覽、列印文字及主要座標一致');
  const minimal={...task(1),goal:'',resources:'',team:'',progress:'',notes:'獨立備註。'};
  let low=0,high=60;while(low+1<high){const n=Math.floor((low+high)/2),state=report([{...minimal,goal:Array.from({length:n},(_,i)=>'容量測試第'+(i+1)+'行').join('\n')}]);const fits=await page.evaluate(async s=>{try{return(await ReportPDF.build(s)).pageCount===1;}catch(e){if(!e.message.includes('超過 A4'))throw e;return false;}},state);if(fits)low=n;else high=n;}
  results.goalLineCapacity=low;console.log('PASS '+mode+': 單一自由欄位最多 '+low+' 行（其他欄位與備註固定）');
  if(mode==='after'){
   const wrapText='較長自由文字含繁體中文與English123，應自動換行並保留最後內容。'.repeat(10)+'最後一段保留。';r=await generate('wrapped',report([{...minimal,goal:wrapText}]));assert.equal(r.texts.length,1);assert(r.texts[0].includes(norm(wrapText)));console.log('PASS after: 較多自由文字換行且完整保留');
   r=await generate('boundary-feedback',report([{...minimal,goal:Array.from({length:12},(_,i)=>'容量測試第'+(i+1)+'行').join('\n')}],feedback));results.boundarySplit=r.texts.length===2&&r.texts[0].includes(norm(feedback.review))&&!r.texts[0].includes(norm(feedback.suggestions))&&r.texts[1].includes(norm(feedback.suggestions));console.log('OBSERVED boundary split: '+results.boundarySplit);
   await page.locator('#task-notes').fill('超長備註。'.repeat(1000));let downloads=0;page.on('download',()=>downloads++);await page.evaluate(()=>window.__printed=false);for(const id of ['preview','download','print']){await page.locator('#'+id).click();await page.waitForFunction(()=>!document.body.classList.contains('busy'));assert.match(await page.locator('#feedback').textContent(),/任務 1.*超過 A4/);}assert.equal(downloads,0);assert.equal(await page.evaluate(()=>window.__printed),false);console.log('PASS after: 超頁一致阻止預覽、下載與列印');
   const baseline=path.join(out,'compact-before-results.json');if(fs.existsSync(baseline)){const before=JSON.parse(fs.readFileSync(baseline));results.comparison={singleBottomBefore:before.cases.single.geometry[0].bottom,singleBottomAfter:results.cases.single.geometry[0].bottom,capacityBefore:before.goalLineCapacity,capacityAfter:low,threeFeedbackPagesBefore:before.cases['three-feedback'].pages,threeFeedbackPagesAfter:results.cases['three-feedback'].pages};console.log(JSON.stringify(results.comparison));}
  }
  fs.writeFileSync(path.join(out,`compact-${mode}-results.json`),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
