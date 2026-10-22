/* ISO weeks start on Monday. UTC arithmetic avoids daylight-saving shifts. */
window.ReportWeek = (() => {
  const day=86400000;
  function fromDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';
    const d=new Date(`${value}T00:00:00Z`);
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)return '';
    d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
    const year=d.getUTCFullYear(),first=new Date(`${String(year).padStart(4,'0')}-01-01T00:00:00Z`);
    const week=Math.ceil(((d-first)/day+1)/7);
    return `${String(year).padStart(4,'0')}-W${String(week).padStart(2,'0')}`;
  }
  function start(value){
    if(!/^\d{4}-W\d{2}$/.test(value||''))return null;
    const [year,w]=value.split('-W'),week=Number(w);
    if(Number(year)<1||week<1||week>53)return null;
    const d=new Date(`${year}-01-04T00:00:00Z`);
    d.setUTCDate(d.getUTCDate()+1-(d.getUTCDay()||7)+(week-1)*7);
    return fromDate(d.toISOString().slice(0,10))===value?d:null;
  }
  function range(value){const d=start(value);if(!d)return '';const first=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);return `${first.replaceAll('-','/')}–${d.toISOString().slice(0,10).replaceAll('-','/')}`;}
  function monday(value){return start(value)?.toISOString().slice(0,10)||'';}
  return {fromDate,range,monday};
})();
