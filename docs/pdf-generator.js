/* One layout in PDF points drives PDF output and vector print output. No screenshots. */
window.ReportPDF = (() => {
  const W=595.28,H=841.89,M=34.02,CW=W-2*M,BOTTOM=H-M;
  // PDF points: 12 mm margins; keep font sizes and pagination rules unchanged.
  const FONT_SIZE=10.5,LEADING=1.5,LINE=FONT_SIZE*LEADING,MIN_ROW=30;
  const CELL_PAD=6,HEADER=24,CONTENT_TOP=M+36,SECTION_GAP=10,SECTION_TITLE=20;
  const CHOICE_LINE=16,CHOICE_HEIGHT=14;
  const colors={ink:'#263645',accent:'#315b78',grid:'#cfdae2',pale:'#edf3f7',header:'#dce9f1',subtle:'#f6f9fb'};
  const options={grade:['S 策略','A 極重要','B 重要','C 嘗試','D 日常'],necessity:['N 必須','P 非必須'],difficulty:['S 極難','A 困難','B 中等難度','C 低難度','D 極低難度'],result:['S 突破','A 超越','B 完成','C 加強','D 重置'],timing:['S 極速','A 超前','B 平時','C 延遲','D 延誤']};
  const fields=[['grade','分級'],['necessity','必要性'],['deadline','Deadline'],['goal','完成目標'],['resources','需求資源、資金、預算'],['team','執行團隊以及貢獻度'],['difficulty','完成難度'],['progress','目前進度']];
  const NO_TASKS_MESSAGE='目前沒有選擇要匯出的任務，請至少取消一項任務的『本次不匯出』選項。';
  // Preserve original indices for capacity warnings without changing the saved task list.
  const selectTasks=tasks=>tasks.map((task,index)=>({task,index})).filter(({task})=>task.excludeFromExport!==true);
  let fontBytesPromise;
  const date=s=>s?s.replaceAll('-','/'):'';
  const clean=s=>String(s??'').replace(/\r\n?/g,'\n').replace(/\t/g,'    ').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  async function loadFont(){
    // A local script works with file:// too, where fetch() cannot read font files.
    if(!fontBytesPromise)fontBytesPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL('fonts/report-font.js',document.baseURI).href;
      const fail=()=>{script.remove();reject(Error('PDF 中文字型載入失敗。請確認 docs/fonts/report-font.js 存在，並保留完整網站資料夾後重新整理。'));};
      script.onerror=fail;
      script.onload=()=>{try{
        if(typeof window.ReportFontBase64!=='string')throw Error('Invalid font data');
        const raw=atob(window.ReportFontBase64),bytes=new Uint8Array(raw.length);
        for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
        delete window.ReportFontBase64;script.remove();resolve(bytes);
      }catch(e){delete window.ReportFontBase64;fail();}};
      document.head.append(script);
    }).catch(e=>{fontBytesPromise=null;throw e;});
    return fontBytesPromise;
  }
  async function build(state){
    const tasksToExport=selectTasks(state.tasks);
    if(!tasksToExport.length)throw Error(NO_TASKS_MESSAGE);
    if(state.legacySharedNotes?.trim()&&!state.legacyNotesResolved)throw Error('舊版共用備註尚未完成分配。請先將內容分配到適當的本任務備註，再按「已完成分配」後匯出；原文不會自動加入 PDF。');
    if(!window.PDFLib||!window.fontkit)throw Error('PDF 函式庫載入失敗，請確認 vendor 資料夾完整。');
    const doc=await PDFLib.PDFDocument.create();doc.registerFontkit(fontkit);
    // Embed the static TrueType font in full; subsetting this CJK font loses glyphs.
    const font=await doc.embedFont(await loadFont(),{subset:false,features:{locl:false,liga:false,clig:false,ccmp:false,frac:false,numr:false,dnom:false,kern:false}});
    const supported=new Set(font.getCharacterSet());
    const unsupported=new Set();
    const pages=[],errors=[];
    const width=(s,size)=>font.widthOfTextAtSize(s,size);
    function wrap(value,max,size=FONT_SIZE){
      const lines=[];for(const p of clean(value).split('\n')){let line='';for(const ch of p){if(!supported.has(ch.codePointAt(0)))unsupported.add(ch);if(line&&width(line+ch,size)>max){lines.push(line);line='';}line+=ch;}lines.push(line);}return lines;
    }
    function page(){const cmds=[];pages.push(cmds);return cmds;}
    function rect(p,x,y,w,h,fill){p.push({kind:'rect',x,y,w,h,fill,stroke:colors.grid});}
    function text(p,s,x,y,size=FONT_SIZE,color=colors.ink){p.push({kind:'text',s:clean(s),x,y,size,color});}
    function lines(p,list,x,y,size=FONT_SIZE){list.forEach((s,i)=>text(p,s,x,y+i*size*LEADING,size));}
    function title(p,label){text(p,label,(W-width(label,20))/2,M,20,colors.accent);p.push({kind:'line',x:M,y:M+28,x2:W-M,y2:M+28,color:'#8ca9bc',thickness:1.5});}
    function info(p,task){let y=CONTENT_TOP;const ws=[CW*.15,CW*.38,CW*.15,CW*.32];
      for(const row of [['任務名稱',task.name,'回報者',state.personal.reporter],['填寫日期',date(state.personal.fillDate),'回報週別',ReportWeek.range(state.personal.reportWeek)]]){
        const ls=row.map((v,i)=>wrap(v,ws[i]-14));const h=Math.max(27,...ls.map(a=>a.length*LINE+CELL_PAD*2));let x=M;
        row.forEach((v,i)=>{rect(p,x,y,ws[i],h,i%2===0?colors.pale:'#ffffff');lines(p,ls[i],x+7,y+CELL_PAD);x+=ws[i];});y+=h;
      }return y+8;
    }
    function checks(p,key,selected,x,y,max){let dx=0,dy=0;for(const label of options[key]){const size=9.5,w=13+width(label,size)+12;if(dx&&dx+w>max){dx=0;dy+=CHOICE_LINE;}rect(p,x+dx,y+dy+4,6.5,6.5,'#ffffff');if(selected===label[0]){p.push({kind:'line',x:x+dx+1,y:y+dy+7,x2:x+dx+3,y2:y+dy+9,color:colors.accent});p.push({kind:'line',x:x+dx+3,y:y+dy+9,x2:x+dx+6,y2:y+dy+5,color:colors.accent});}text(p,label,x+dx+11,y+dy,size);dx+=w;}return dy+CHOICE_HEIGHT;}
    function checkHeight(key,max){let x=0,h=CHOICE_HEIGHT;for(const label of options[key]){const w=13+width(label,9.5)+12;if(x&&x+w>max){x=0;h+=CHOICE_LINE;}x+=w;}return h;}
    let lastTaskBottom=0;
    tasksToExport.forEach(({task,index})=>{
      const p=page();title(p,'任務績效報告');let y=info(p,task);const ws=[CW*.08,CW*.25,CW*.67];
      let x=M;['項次','項目','內容'].forEach((s,i)=>{rect(p,x,y,ws[i],HEADER,colors.header);text(p,s,x+8,y+CELL_PAD,FONT_SIZE,colors.accent);x+=ws[i];});y+=HEADER;
      fields.forEach(([key,label],i)=>{
        const choice=Boolean(options[key]),content=choice?[]:wrap(key==='deadline'?date(task[key]):task[key],ws[2]-16);
        const labels=wrap(label,ws[1]-16);const pad=choice?CELL_PAD:7;
        const h=Math.max(MIN_ROW,labels.length*LINE+pad*2,choice?checkHeight(key,ws[2]-16)+pad*2:content.length*LINE+pad*2);
        let x=M;ws.forEach((w,j)=>{rect(p,x,y,w,h,j===1?colors.subtle:'#ffffff');x+=w;});
        text(p,String(i+1),M+ws[0]/2-3,y+pad,10.5,colors.accent);lines(p,labels,M+ws[0]+8,y+pad);
        if(choice)checks(p,key,task[key],M+ws[0]+ws[1]+8,y+pad,ws[2]-16);else lines(p,content,M+ws[0]+ws[1]+8,y+pad);
        y+=h;
      });
      y+=8;text(p,'本任務備註（選填）',M+9,y,11,colors.accent);y+=18;
      const noteLines=wrap(task.notes,CW-16),noteHeight=Math.max(MIN_ROW,noteLines.length*LINE+CELL_PAD*2);
      rect(p,M,y,CW,noteHeight,'#fafcfd');lines(p,noteLines,M+8,y+CELL_PAD);y+=noteHeight;
      y+=SECTION_GAP;text(p,'總經理評定（由總經理填寫）',M+9,y,12,colors.accent);y+=SECTION_TITLE;
      const ws2=[CW*.25,CW*.75];x=M;['評定項目','總經理評定（請勾選一項）'].forEach((s,i)=>{rect(p,x,y,ws2[i],HEADER,colors.pale);text(p,s,x+8,y+CELL_PAD);x+=ws2[i];});y+=HEADER;
      [['result','完成評級'],['timing','完成時限']].forEach(([key,label])=>{const h=Math.max(MIN_ROW,checkHeight(key,ws2[1]-16)+CELL_PAD*2);rect(p,M,y,ws2[0],h,colors.subtle);rect(p,M+ws2[0],y,ws2[1],h,'#ffffff');text(p,label,M+8,y+CELL_PAD);checks(p,key,'',M+ws2[0]+8,y+CELL_PAD,ws2[1]-16);y+=h;});
      if(y>BOTTOM)errors.push(`任務 ${index+1}「${task.name||'未命名'}」超過 A4 容量約 ${Math.ceil((y-BOTTOM)/LINE)} 行（包含本任務備註與總經理評定），請縮短本任務備註、任務名稱、回報者或自由文字欄位。`);
      lastTaskBottom=y;
    });
    const extra=['review','suggestions'].map(key=>[key,state.supplement[key]||'']).filter(([,v])=>v.trim());
    if(extra.length){let p=pages[pages.length-1],y=lastTaskBottom+SECTION_GAP;
      // Keep the shared supplement on the final task page whenever there is room.
      if(y+SECTION_TITLE+MIN_ROW>BOTTOM){p=page();title(p,'整體回饋（選填）');y=CONTENT_TOP;}
      else{text(p,'整體回饋（選填）',M+9,y,12,colors.accent);y+=SECTION_TITLE;}
      const labelWidth=CW*.25;
      for(const [key,value] of extra){const label={review:'自我檢討',suggestions:'對公司的建議'}[key];const list=wrap(value,CW-labelWidth-16);
        let at=0;while(at<list.length){if(y+MIN_ROW>BOTTOM){p=page();title(p,'整體回饋（續）');y=CONTENT_TOP;}
          const count=Math.max(1,Math.floor((BOTTOM-y-CELL_PAD*2)/LINE));const chunk=list.slice(at,at+count);const h=Math.max(MIN_ROW,chunk.length*LINE+CELL_PAD*2);
          rect(p,M,y,labelWidth,h,colors.subtle);rect(p,M+labelWidth,y,CW-labelWidth,h,'#fafcfd');
          text(p,label+(at?'（續）':''),M+8,y+CELL_PAD,FONT_SIZE,colors.accent);lines(p,chunk,M+labelWidth+8,y+CELL_PAD);y+=h;at+=chunk.length;
        }
      }
    }
    if(unsupported.size)errors.push(`字型不支援以下字元：${[...unsupported].slice(0,20).join(' ')}。請替換這些字元後再匯出（例如將 emoji 改為文字）。`);
    if(errors.length)throw Error(errors.join('\n'));
    const rgb=hex=>PDFLib.rgb(...hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255));
    for(const commands of pages){const p=doc.addPage([W,H]);for(const c of commands){if(c.kind==='text'&&c.s)p.drawText(c.s,{x:c.x,y:H-c.y-c.size,size:c.size,font,color:rgb(c.color)});else if(c.kind==='rect')p.drawRectangle({x:c.x,y:H-c.y-c.h,width:c.w,height:c.h,color:rgb(c.fill),borderColor:rgb(c.stroke),borderWidth:.55});else if(c.kind==='line')p.drawLine({start:{x:c.x,y:H-c.y},end:{x:c.x2,y:H-c.y2},color:rgb(c.color),thickness:c.thickness||.8});}}
    doc.setTitle('任務績效報告');doc.setCreator('任務績效填寫系統');
    const bytes=await doc.save();
    const html=pages.map(p=>`<div class="print-page"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${p.map(c=>c.kind==='text'?`<text x="${c.x}" y="${c.y+c.size}" font-family="ReportTC" font-weight="400" font-size="${c.size}" fill="${c.color}">${escape(c.s)}</text>`:c.kind==='rect'?`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${c.fill}" stroke="${c.stroke}" stroke-width=".55"/>`:`<line x1="${c.x}" y1="${c.y}" x2="${c.x2}" y2="${c.y2}" stroke="${c.color}" stroke-width="${c.thickness||.8}"/>`).join('')}</svg></div>`).join('');
    return {bytes,html,pageCount:pages.length,taskCount:tasksToExport.length};
  }
  return {build,selectTasks,NO_TASKS_MESSAGE,options,fields};
})();
