(() => {
  'use strict';
  const KEY='task-performance:v1',BACKUP_KEY='task-performance:backup:before-v3',VERSION=3,$=id=>document.getElementById(id);
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const blankTask=()=>({id:crypto.randomUUID(),name:'',grade:'',necessity:'',deadline:'',goal:'',resources:'',team:'',difficulty:'',progress:'',notes:''});
  const fresh=()=>({version:VERSION,personal:{reporter:'',fillDate:today(),reportWeek:ReportWeek.fromDate(today())},tasks:[blankTask()],active:0,supplement:{review:'',suggestions:''},legacySharedNotes:'',legacyNotesResolved:false});
  let state=fresh(),storageBlocked=false,previewURL,revision=0;
  function read(){try{const raw=localStorage.getItem(KEY);if(!raw)return;const saved=JSON.parse(raw);if(![1,2,VERSION].includes(saved.version)||!Array.isArray(saved.tasks)||!saved.tasks.length)throw Error('資料版本或結構無法辨識');
    const normalize=(base,source)=>Object.fromEntries(Object.keys(base).map(k=>[k,typeof source?.[k]==='string'?source[k]:base[k]]));
    state={version:VERSION,personal:normalize(state.personal,saved.personal),supplement:normalize(state.supplement,saved.supplement),tasks:saved.tasks.map(t=>{const n=normalize(blankTask(),t);n.id=n.id||crypto.randomUUID();for(const k of ['grade','necessity','difficulty'])if(!ReportPDF.options[k].some(o=>o[0]===n[k]))n[k]='';return n;}),active:Math.max(0,Math.min(saved.tasks.length-1,Number.isInteger(saved.active)?saved.active:0)),legacySharedNotes:typeof saved.legacySharedNotes==='string'?saved.legacySharedNotes:(typeof saved.supplement?.notes==='string'?saved.supplement.notes:''),legacyNotesResolved:saved.version===VERSION&&saved.legacyNotesResolved===true};
    if(saved.version===1)state.personal.reportWeek=ReportWeek.fromDate(saved.personal?.reportDate)||ReportWeek.fromDate(today());
    if(saved.version<VERSION){
      // Back up the exact original before the first v3 write. Never replace an earlier backup.
      try{if(localStorage.getItem(BACKUP_KEY)===null)localStorage.setItem(BACKUP_KEY,raw);}
      catch(e){storageBlocked=true;$('save-status').textContent='舊草稿已讀取，遷移尚未儲存';feedback('無法建立舊草稿備份，已暫停自動儲存以保留原資料。請勿關閉本頁；確認瀏覽器儲存空間或設定後，重新整理再試。',true);return;}
      if(!save())return;
    }
    $('save-status').textContent=saved.version<VERSION?'已恢復草稿並完成資料遷移':'已恢復自動儲存資料';
  }catch(e){storageBlocked=true;$('save-status').textContent='無法恢復資料，原資料保留';feedback('無法讀取儲存資料。為避免覆蓋，已暫停自動儲存；請先備份瀏覽器資料，或使用「清除所有資料」重新開始。',true);}}
  function save(){revision++;delete document.body.dataset.printReady;$('print-root').replaceChildren();if(storageBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='已自動儲存';return true;}catch(e){$('save-status').textContent='儲存失敗，請勿關閉頁面';feedback('瀏覽器無法儲存資料（空間不足或隱私設定限制）。內容仍保留於本頁，請先匯出 PDF，避免關閉頁面。',true);return false;}}
  function feedback(message,error=false){$('feedback').textContent=message;$('feedback').classList.toggle('error',error);}
  const current=()=>state.tasks[state.active];
  function tabs(){const root=$('tabs');root.replaceChildren();state.tasks.forEach((t,i)=>{const b=document.createElement('button');b.id=`tab-${i}`;b.setAttribute('role','tab');b.setAttribute('aria-controls','task-panel');b.setAttribute('aria-selected',String(i===state.active));b.tabIndex=i===state.active?0:-1;b.textContent=t.name.trim()?`任務 ${i+1} · ${t.name}`:`任務 ${i+1}`;b.title=b.textContent;b.onclick=()=>{state.active=i;save();renderTask();};b.onkeydown=e=>{let next=i;if(e.key==='ArrowRight')next=(i+1)%state.tasks.length;else if(e.key==='ArrowLeft')next=(i+state.tasks.length-1)%state.tasks.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=state.tasks.length-1;else return;e.preventDefault();state.active=next;save();renderTask();$(`tab-${next}`).focus();};root.append(b);});$('task-count').textContent=`共 ${state.tasks.length} 項任務 · 資料儲存於此瀏覽器`;$('delete-task').disabled=state.tasks.length===1;$('task-panel').setAttribute('aria-labelledby',`tab-${state.active}`);}
  function renderTask(){tabs();$('task-heading').textContent=`任務 ${state.active+1} · 填寫內容`;$('task-name').value=current().name;
    const root=$('task-fields');root.replaceChildren();const placeholders={goal:'請填寫自己評估的預期成果與具體完成標準',resources:'無需求請填「無」，有需求請具體說明',team:'請填寫參與人員及各自貢獻；個人任務可填獨立執行',progress:'請簡述截至本週已完成的內容、當前狀態與後續待辦'};
    ReportPDF.fields.forEach(([key,label],i)=>{const outer=document.createElement('div');outer.className='field';if(ReportPDF.options[key]){const fs=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`${i+1}. ${label}`;fs.append(legend);const choices=document.createElement('div');choices.className='choices';for(const item of ReportPDF.options[key]){const l=document.createElement('label');l.className='choice';const input=document.createElement('input');input.type='radio';input.name=key;input.value=item[0];input.checked=current()[key]===item[0];input.onchange=()=>{current()[key]=input.value;save();};l.append(input,document.createTextNode(item));choices.append(l);}fs.append(choices);outer.append(fs);}else{const l=document.createElement('label');l.htmlFor=`field-${key}`;l.textContent=`${i+1}. ${label}`;const input=document.createElement(key==='deadline'?'input':'textarea');input.id=`field-${key}`;input.value=current()[key];if(key==='deadline'){input.type='date';input.className='date-field';}else{input.rows=3;input.placeholder=placeholders[key];}input.oninput=()=>{current()[key]=input.value;save();};outer.append(l,input);}root.append(outer);});
    const notesField=document.createElement('div');notesField.className='field';
    const notesLabel=document.createElement('label');notesLabel.htmlFor='task-notes';notesLabel.textContent='本任務備註（選填）';
    const notesInput=document.createElement('textarea');notesInput.id='task-notes';notesInput.rows=3;notesInput.placeholder='如有與這項任務相關的補充，可填寫於此；如無可留空';notesInput.value=current().notes;
    notesInput.oninput=()=>{current().notes=notesInput.value;save();};notesField.append(notesLabel,notesInput);root.append(notesField);
  }
  function updateWeek(){const value=state.personal.reportWeek;$('report-week-range').textContent=ReportWeek.range(value)?`${ReportWeek.range(value)}（週一至週日）`:'請選擇回報週別';$('reportWeekDate').value=ReportWeek.monday(value);}
  function renderLegacyNotes(){
    $('legacy-notes-card').hidden=!state.legacySharedNotes.trim();$('legacy-shared-notes').value=state.legacySharedNotes;
    $('legacy-notes-status').textContent=state.legacyNotesResolved?'已確認分配，原文保留':'待分配後匯出';$('resolve-legacy-notes').disabled=state.legacyNotesResolved;
  }
  function render(){updateWeek();renderLegacyNotes();for(const key of Object.keys(state.personal))$(key).value=state.personal[key];for(const key of Object.keys(state.supplement))$(`supplement-${key}`).value=state.supplement[key];renderTask();}
  for(const [key,label] of Object.entries({review:'自我檢討',suggestions:'對公司的建議'})){const div=document.createElement('div');div.className='field';const l=document.createElement('label');l.htmlFor=`supplement-${key}`;l.textContent=label;const input=document.createElement('textarea');input.id=l.htmlFor;input.rows=3;input.placeholder='如無可留空';input.oninput=()=>{state.supplement[key]=input.value;save();};div.append(l,input);$('supplement-fields').append(div);}
  read();render();
  for(const key of Object.keys(state.personal))$(key).oninput=()=>{state.personal[key]=$(key).value;if(key==='reportWeek')updateWeek();save();};
  if($('reportWeek').type!=='week'){$('reportWeek').hidden=true;$('week-fallback-label').hidden=false;}
  $('reportWeekDate').oninput=()=>{state.personal.reportWeek=ReportWeek.fromDate($('reportWeekDate').value);$('reportWeek').value=state.personal.reportWeek;updateWeek();save();};
  $('task-name').oninput=()=>{current().name=$('task-name').value;save();tabs();};
  $('add-task').onclick=()=>{state.tasks.push(blankTask());state.active=state.tasks.length-1;save();renderTask();$('task-name').focus();};
  $('copy-task').onclick=()=>{state.tasks.push({...current(),id:crypto.randomUUID()});state.active=state.tasks.length-1;save();renderTask();feedback('已完整複製任務內容及本任務備註。個人基本資料與整體回饋仍共用。');$('task-name').focus();};
  $('delete-task').onclick=()=>{if(state.tasks.length===1)return;if(!confirm(`確定刪除任務 ${state.active+1}「${current().name||'未命名'}」？此動作無法復原。`))return;state.tasks.splice(state.active,1);state.active=Math.min(state.active,state.tasks.length-1);save();renderTask();feedback('已刪除任務。');};
  $('resolve-legacy-notes').onclick=()=>{if(!confirm('確認已將需要保留的舊版共用備註分配到適當任務？舊備註原文會繼續保留供查閱，但不會重複輸出到 PDF。'))return;state.legacyNotesResolved=true;const saved=save();renderLegacyNotes();if(saved)feedback('已確認分配舊備註，可以匯出 PDF。舊備註原文仍保留。');};
  $('clear-all').onclick=()=>{if(!confirm('確定清除所有個人資料、任務備註、整體回饋、舊版共用備註與遷移備份？此動作無法復原。'))return;try{localStorage.removeItem(BACKUP_KEY);localStorage.removeItem(KEY);storageBlocked=false;state=fresh();save();render();feedback('已清除所有資料，保留一項空白任務。');}catch(e){feedback('瀏覽器拒絕清除資料，請檢查隱私設定。',true);}};
  function download(bytes){
    const name=Array.from(state.personal.reporter.trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'_')).slice(0,60).join('').replace(/[.\s]+$/g,'')||'未填姓名';
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');
    a.href=url;a.download=`${name}的任務績效報告_${state.personal.reportWeek||ReportWeek.fromDate(today())}.pdf`;
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function output(mode){document.body.classList.add('busy');feedback('正在檢查 A4 容量並產生 PDF，首次載入中文字型可能需要幾秒鐘…');const start=revision;try{
      if(!ReportWeek.range(state.personal.reportWeek))throw Error('請先選擇有效的回報週別。');
      const snapshot=JSON.parse(JSON.stringify(state));const result=await ReportPDF.build(snapshot);
      if(start!==revision)throw Error('產生期間資料已變更，請重新點擊匯出以使用最新內容。');
      if(mode==='download')download(result.bytes);
      if(mode==='preview'){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));$('pdf-preview').src=previewURL;$('preview-link').href=previewURL;$('preview-dialog').showModal();}
      if(mode==='print'){$('print-root').innerHTML=result.html;await document.fonts.load('10.5px ReportTC');document.body.dataset.printReady='true';window.print();}
      feedback(`已完成容量檢查，共 ${result.pageCount} 頁（${snapshot.tasks.length} 項任務）。${mode==='download'?'PDF 已開始下載。':''}`);
    }catch(e){feedback(e.message||'PDF 產生失敗，請重試。',true);}finally{document.body.classList.remove('busy');}}
  $('preview').onclick=()=>output('preview');$('download').onclick=()=>output('download');$('print').onclick=()=>output('print');$('close-preview').onclick=()=>$('preview-dialog').close();
  // Native Ctrl+P cannot await font/layout validation. Block stale output and direct users to the validated print action.
  window.addEventListener('beforeprint',()=>{if(document.body.dataset.printReady!=='true')$('print-root').textContent='請取消列印，回到網站點擊「列印／另存 PDF」，先完成 A4 容量檢查。';});
  window.addEventListener('afterprint',()=>{delete document.body.dataset.printReady;$('print-root').replaceChildren();});
  window.addEventListener('storage',e=>{if(e.key===KEY)feedback('此瀏覽器的另一個分頁已變更儲存資料。請勿同時編輯多個分頁；如需讀取其最新資料，請重新整理本頁。',true);});
})();
