const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.listarResponsables = (req, res) => {
  if (Object.keys(req.query || {}).length) return res.status(400).json({ error: 'Esta consulta no admite filtros.' });
  db.query("SELECT id,nombre,estado FROM usuarios WHERE estado='activo' ORDER BY nombre,id", (error, datos) => {
    if (error) return res.status(500).json({ error: 'No se pudieron consultar los responsables.' });
    return res.json({ datos });
  });
};

const { randomUUID } = require('node:crypto');
const rolesPermitidos = ['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
const columnasSeguras = 'u.id,u.nombre,u.email AS correo,r.nombre AS rol,u.estado';
exports.listarUsuarios = async (req,res) => {
  try {
    const [datos] = await db.promise().query(`SELECT ${columnasSeguras} FROM usuarios u JOIN roles r ON r.id=u.roles_id ORDER BY u.nombre,u.id`);
    return res.json({datos});
  } catch { return res.status(500).json({error:'No fue posible consultar los usuarios.'}); }
};
exports.listarRoles = async (req,res) => {
  try {
    const [datos] = await db.promise().query('SELECT id,nombre FROM roles WHERE nombre IN (?) ORDER BY nombre,id',[rolesPermitidos]);
    return res.json({datos});
  } catch { return res.status(500).json({error:'No fue posible consultar los roles.'}); }
};
// Mantener los campos del contrato existente; el rol siempre se resuelve en BD.
exports.registrarUsuario = async (req,res) => {
  const {nombre,correo,contrasena,roles_id}=req.body||{};
  if(typeof nombre!=='string'||!nombre.trim()||[...nombre.trim()].length>100||
     typeof correo!=='string'||correo.trim().length>150||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())||
     typeof contrasena!=='string'||!contrasena.trim()||Buffer.byteLength(contrasena,'utf8')>72||
     !Number.isSafeInteger(roles_id)||roles_id<=0) {
    return res.status(400).json({error:'Indica nombre, correo v\u00e1lido, rol y contrase\u00f1a (m\u00e1ximo 72 bytes).'});
  }
  try {
    const [[rol]]=await db.promise().query('SELECT id,nombre FROM roles WHERE id=?',[roles_id]);
    if(!rol||!rolesPermitidos.includes(rol.nombre))return res.status(400).json({error:'El rol seleccionado no es v\u00e1lido.'});
    const hash=await bcrypt.hash(contrasena,12),id=randomUUID();
    await db.promise().query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,intentos_fallidos,roles_id) VALUES (?,?,?,?,'activo',0,?)`,[id,nombre.trim(),correo.trim(),hash,rol.id]);
    return res.status(201).json({mensaje:'Usuario creado correctamente.',usuario:{id,nombre:nombre.trim(),correo:correo.trim(),rol:rol.nombre,estado:'activo'}});
  } catch(error) {
    if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Ya existe un usuario con ese correo.'});
    if(error.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({error:'El rol seleccionado ya no existe.'});
    return res.status(500).json({error:'No fue posible crear el usuario.'});
  }
};

// 2. Inicio de sesión real (usuarios y rol de MySQL)
exports.loginUsuario = async (req, res) => {
  const { correo, contrasena } = req.body || {};

  if (typeof correo !== 'string' || !correo.trim() ||
      typeof contrasena !== 'string' || !contrasena || Buffer.byteLength(contrasena, 'utf8') > 72) {
    return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
  }

  const secreto = process.env.JWT_SECRET;
  const vigencia = Number(process.env.JWT_EXPIRES_IN_SECONDS || 3600);
  if (!secreto || Buffer.byteLength(secreto, 'utf8') < 32 ||
      !Number.isSafeInteger(vigencia) || vigencia <= 0) {
    console.error('Configuración JWT ausente o inválida.', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(500).json({ error: 'El inicio de sesión no está configurado correctamente.' });
  }
  try {
    const [usuarios] = await db.promise().query(`
      SELECT u.id, u.nombre, u.email, u.password_hash, u.estado, u.roles_id, r.nombre AS rol
      FROM usuarios u JOIN roles r ON r.id = u.roles_id
      WHERE u.email = ? LIMIT 1
    `, [correo.trim()]);
    const usuario = usuarios[0];
    // Los marcadores de desarrollo no se interpretan como contraseñas en texto plano.
    const hashValido = usuario && /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(usuario.password_hash);
    if (!hashValido || !await bcrypt.compare(contrasena, usuario.password_hash)) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    if (usuario.estado !== 'activo') {
      return res.status(403).json({ error: 'El usuario no está activo.' });
    }
    const token = jwt.sign({ roles_id: usuario.roles_id, rol: usuario.rol }, secreto, {
      algorithm: 'HS256', subject: usuario.id, issuer: 'dondejuanca', expiresIn: vigencia
    });
    // No autenticar si el usuario fue desactivado o su contraseña cambió durante bcrypt.
    const [actualizacion] = await db.promise().query(`
      UPDATE usuarios SET ultimo_acceso = NOW()
      WHERE id = ? AND estado = 'activo' AND BINARY password_hash = BINARY ? AND roles_id = ?
    `, [usuario.id, usuario.password_hash, usuario.roles_id]);
    if (actualizacion.affectedRows !== 1) {
      return res.status(401).json({ error: 'Las credenciales o el estado cambiaron. Intenta nuevamente.' });
    }
    return res.status(200).json({
      mensaje: '¡Inicio de sesión exitoso! Bienvenido al sistema de Donde Juanca. 🔓✨',
      token, token_type: 'Bearer', expires_in: vigencia,
      usuario: {
        id: usuario.id, nombre: usuario.nombre, correo: usuario.email,
        roles_id: usuario.roles_id, rol: usuario.rol
      }
    });
  } catch (error) {
    // No imprimir la consulta ni valores que puedan contener password_hash.
    console.error('Error al iniciar sesión:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
};
// 4. Cambiar estado de usuario (Desactivación / Bloqueo)
exports.cambiarEstadoUsuario = (req, res) => {
  const { id } = req.params;
  const { estado } = req.body || {};

  // Validar que envíen un estado válido
  const estadosPermitidos = ['activo', 'inactivo', 'bloqueado'];

  if (typeof estado !== 'string' || !estadosPermitidos.includes(estado.toLowerCase())) {
    return res.status(400).json({
      ok: false,
      msg: 'Debe proporcionar un estado válido: "activo", "inactivo" o "bloqueado".'
    });
  }

  // 1. Verificar si el usuario existe
  const sqlBuscar = 'SELECT id, nombre, email, estado FROM usuarios WHERE id = ?';

  db.query(sqlBuscar, [id], (err, resultados) => {
    if (err) {
      console.error('Error al consultar usuario:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
      return res.status(500).json({ ok: false, msg: 'Error en el servidor al consultar usuario.' });
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: `No se encontró ningún usuario con el ID ${id}.`
      });
    }

    // 2. Actualizar el estado en la BD
    const sqlActualizar = 'UPDATE usuarios SET estado = ? WHERE id = ?';

    db.query(sqlActualizar, [estado.toLowerCase(), id], (errUpdate) => {
      if (errUpdate) {
        console.error('Error al actualizar estado del usuario:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar el estado del usuario.' });
      }

      return res.status(200).json({
        ok: true,
        msg: `Estado del usuario actualizado exitosamente a "${estado.toLowerCase()}".`,
        data: {
          usuario_id: id,
          nuevo_estado: estado.toLowerCase()
        }
      });
    });
  });
};
