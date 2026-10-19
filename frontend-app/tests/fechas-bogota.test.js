import test from 'node:test';
import process from 'node:process';
import assert from 'node:assert/strict';
import {businessDate,businessDateTime,businessToUTC,businessDayStart,addCalendarDays} from '../src/utils/businessTime.js';
import {formatDate,formatDateTime} from '../src/utils/dateTime.js';
import {diasDashboard,ingresosHoyDashboard} from '../src/services/dashboardService.js';
import {rangoReporte,cajaReporte,ventasReporte} from '../src/services/reportesService.js';
import {fechaLocalCierre,periodoCierre} from '../src/services/cierresCajaService.js';

test('00:05 y 23:55 pertenecen al mismo día de Bogotá en cualquier zona del proceso', () => {
  const oldTZ=process.env.TZ;
  try {
    for(const zone of ['UTC','Asia/Tokyo','America/Bogota','America/Los_Angeles']){
      process.env.TZ=zone;
      for(const [local,utc] of [['2026-10-19T00:05:00','2026-10-19T05:05:00.000Z'],['2026-10-19T23:55:00','2026-10-20T04:55:00.000Z']]){
        const instant=new Date(utc);
        assert.equal(businessToUTC(local).toISOString(),utc);
        assert.equal(businessDateTime(instant),local);
        assert.equal(fechaLocalCierre(instant),local);
        assert.equal(businessDate(instant),'2026-10-19');
        assert.equal(diasDashboard(instant).at(-1),'2026-10-19');
        assert.deepEqual(rangoReporte('hoy','','',instant),{desde:'2026-10-19',hasta:'2026-10-19'});
        assert.match(formatDateTime(utc),/19\/10\/26/);
        assert.match(formatDate(utc),/19\/10\/26/);
      }
      assert.equal(formatDate('2026-10-19'),'19/10/26');
      assert.deepEqual(periodoCierre({fecha_inicio:'2026-10-19T00:00',fecha_fin:'2026-10-20T00:00'}),{
        fecha_inicio:'2026-10-19T05:00:00',fecha_fin:'2026-10-20T05:00:00'
      });
      assert.equal(businessDate(new Date('2026-10-20T04:59:59Z')),'2026-10-19');
      assert.equal(businessDate(new Date('2026-10-20T05:00:00Z')),'2026-10-20');
    }
  }finally{if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ;}
  assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01');
  assert.equal(businessDayStart('2026-10-19').toISOString(),'2026-10-19T05:00:00.000Z');
  for(const value of ['2026-02-30T00:05','2026-10-19T25:00','2026-10-19T00:61'])assert.throws(()=>businessToUTC(value));
});

test('Hoy, ventas y caja consultan el mismo día comercial con fin exclusivo',async()=>{
  const original=globalThis.fetch,urls=[];
  const range={desde:'2026-10-19',hasta:'2026-10-19'};
  try{
    globalThis.fetch=async url=>{urls.push(url);return new Response(JSON.stringify(url.includes('/cierres-caja')
      ?{datos:[],total:0}
      :{datos:[],paginacion:{total:2,totalPaginas:1},resumen:{total_verificado:'100.50',verificados:2,pendientes:0}}));};
    const today=await ingresosHoyDashboard(undefined,new Date('2026-10-20T04:55:00Z'));
    const sales=await ventasReporte(range);
    const cash=await cajaReporte(range,1);
    assert.equal(today.total,'100.50');assert.equal(sales.ventasNetas,'100.50');assert.equal(cash.totalIngresos,'100.50');
    for(const url of urls.filter(u=>u.includes('/pagos?'))){
      const q=new URL(url).searchParams;assert.equal(q.get('desde'),range.desde);assert.equal(q.get('hasta'),range.hasta);
    }
    const q=new URL(urls.find(u=>u.includes('/cierres-caja?'))).searchParams;
    assert.equal(q.get('fecha_inicio'),'2026-10-19T05:00:00');
    assert.equal(q.get('fecha_fin'),'2026-10-20T05:00:00');
  }finally{globalThis.fetch=original;}
});
