const mysql = require('mysql2');
const { randomUUID } = require('node:crypto');
const { ejecutor } = require('../services/identidadService');
const { sesionActiva } = require('../services/sesionesMesaService');
const { validar, asignar, fallo } = require('../services/divisionesService');
const db = require('../config/db');
const { centavos } = require('../services/liquidacionService');
async function transaccion(req,res,operation){
 const actor=ejecutor(req,res);if(!actor)return;
 let c;
 try{c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();const r=await operation(c,actor);await c.commit();return res.status(r.status).json({exito:true,data:r.data});}
 catch(e){if(c)await c.rollback();console.error('Division:',e.message);return res.status(e.status||(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code)?409:500)).json({error:e.status?e.message:'No se pudo procesar la division. Reintenta con la misma clave.'});}
 finally{if(c)await c.end();}
}
const iniciarSesionDivision=(req,res)=>transaccion(req,res,async(c,actor)=>{
 const {mesas_id,modalidad}=req.body||{};
 if(typeof mesas_id!=='string'||!mesas_id.trim()||modalidad!=='items')throw fallo(400,'Indica mesa y modalidad items; otras modalidades aun no estan disponibles.');
 const [[mesa]]=await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE',[mesas_id]);
 if(!mesa)throw fallo(404,'La mesa no existe.');
 const visita=await sesionActiva(c,mesas_id);if(!visita)throw fallo(409,'La mesa no tiene una visita activa.');
 const id=randomUUID();await c.query('INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id,sesion_mesa_id) VALUES (?,?,?,?,?)',[id,modalidad,actor,mesas_id,visita.id]);
 return {status:201,data:{id,modalidad,usuarios_id:actor,mesas_id,sesion_mesa_id:visita.id}};
});
const asignarItemsACliente=(req,res)=>{
 const actor=ejecutor(req,res);if(!actor)return;
 let body,key=req.get?.('Idempotency-Key');try{body=validar(req.body,key);}catch(e){return res.status(e.status||400).json({error:e.message});}
 return transaccion(req,res,c=>asignar(c,req.params.id,body,key,actor));
};


// ==========================================
// 3. CONSULTAR RESUMEN DE LA SESIÓN DE DIVISIÓN
// ==========================================
const obtenerResumenDivision = (req, res) => {
  const { id: sesion_division_id } = req.params;

  // 1. Obtener la información básica de la sesión
  const querySesion = `
    SELECT s.id, s.sesion_mesa_id, s.modalidad, s.mesas_id, s.usuarios_id, s.creado_en, m.numero AS numero_mesa
    FROM sesiones_division_cuentas s
    LEFT JOIN mesas m ON s.mesas_id = m.id
    WHERE s.id = ?
  `;

  db.query(querySesion, [sesion_division_id], (errSesion, resSesion) => {
    if (errSesion) {
      console.error('❌ Error al consultar la sesión:', errSesion.message);
      return res.status(500).json({ error: 'Error al consultar la sesión.', detalles: errSesion.message });
    }

    if (resSesion.length === 0) {
      return res.status(404).json({ error: 'La sesión de división no existe.' });
    }

    const sesion = resSesion[0];

    // 2. Obtener los participantes y sus ítems asignados
    const queryDetalle = `
      SELECT 
        p.id AS participante_id,
        p.jugadores_id,
        p.nombre_cliente,
        p.total_asignado,
        p.estado,
        d.id AS detalle_id,
        d.pedido_item_id,
        d.cantidad_asignada,
        d.subtotal
      FROM division_participantes p
      LEFT JOIN division_items_detalle d ON p.id = d.participante_id
      WHERE p.sesion_division_id = ?
      ORDER BY p.creado_en ASC
    `;

    db.query(queryDetalle, [sesion_division_id], (errDetalle, resDetalle) => {
      if (errDetalle) {
        console.error('❌ Error al consultar participantes e ítems:', errDetalle.message);
        return res.status(500).json({ error: 'Error al consultar detalle de división.', detalles: errDetalle.message });
      }

      // Agrupar los ítems bajo cada participante
      const participantesMap = {};
      let granTotal = 0n;

      resDetalle.forEach(fila => {
        if (!participantesMap[fila.participante_id]) {
          participantesMap[fila.participante_id] = {
            id: fila.participante_id,
            jugadores_id: fila.jugadores_id,
            nombre_cliente: fila.nombre_cliente,
            total_asignado: Number(fila.total_asignado || 0),
            estado: fila.estado,
            items: []
          };
          granTotal += centavos(fila.total_asignado || 0);
        }

        if (fila.detalle_id) {
          participantesMap[fila.participante_id].items.push({
            detalle_id: fila.detalle_id,
            pedido_item_id: fila.pedido_item_id,
            cantidad: fila.cantidad_asignada,
            subtotal: Number(fila.subtotal || 0)
          });
        }
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Resumen de la división obtenido correctamente 🍕',
        data: {
          sesion: {
            id: sesion.id,
            sesion_mesa_id: sesion.sesion_mesa_id,
            modalidad: sesion.modalidad,
            mesas_id: sesion.mesas_id,
            numero_mesa: sesion.numero_mesa,
            usuarios_id: sesion.usuarios_id,
            creado_en: sesion.creado_en
          },
          total_acumulado: Number(`${granTotal/100n}.${String(granTotal%100n).padStart(2,'0')}`),
          participantes: Object.values(participantesMap)
        }
      });
    });
  });
};

module.exports = {
  iniciarSesionDivision,
  asignarItemsACliente,
  obtenerResumenDivision
};
