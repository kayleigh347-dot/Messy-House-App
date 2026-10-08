const pad=value=>String(value).padStart(2,'0');
export const localDateKey=value=>{
 const date=value instanceof Date?value:new Date(value);
 return Number.isFinite(+date)?`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`:'';
};

export function calendarMonthRange(month=new Date()){
 const first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);
 start.setDate(start.getDate()-start.getDay());start.setHours(0,0,0,0);
 const end=new Date(start);end.setDate(end.getDate()+41);end.setHours(23,59,59,999);
 return {start,end};
}

