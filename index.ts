import express = require('express');
import pg = require('pg');
const { Pool } = pg;
import cors = require('cors');
import bcrypt = require('bcryptjs'); 
import multer = require('multer'); 
import path = require('path'); 
import fs = require('fs'); 

const app = express();
app.use(express.json());
app.use(cors());

import dotenv = require('dotenv');
dotenv.config();

// --- CONFIGURACIÓN DE SUBIDA DE ARCHIVOS (MULTER) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); 
  },
  filename: (req: any, file, cb) => {
    const userId = req.params.id || Date.now();
    const ext = path.extname(file.originalname); 
    cb(null, `avatar-user-${userId}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); 
    } else {
        cb(new Error('❌ Solo se permiten archivos de imagen.'), false); 
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } 
});

app.use('/uploads', express.static(uploadsDir));

app.use(express.static(path.join(__dirname, 'public')));

const puerto = 3000;

// --- ¡NUEVA CONFIGURACIÓN DE LA BASE DE DATOS POSTGRESQL! ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect().then(() => {
  console.log("=================================================");
  console.log("          ✅ Conectado al servidor"               );
  console.log("=================================================");
}).catch(err => {
  console.error("❌ Error conectando a PostgreSQL:", err);
});

// --- RUTA ACTUALIZADA! Artículos con BUSCADOR y PAGINACIÓN REAL ---
app.get('/api/articulos', async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = 10;
    const terminoBusqueda = req.query.buscar as string || "";
    const offset = (pagina - 1) * limite;

    let queryBaseCondition = "WHERE 1=1"; 
    const paramsCount: any[] = [];
    const paramsQuery: any[] = [];

    if (terminoBusqueda) {
        paramsCount.push(`%${terminoBusqueda}%`);
        // En Postgres usamos ILIKE para que no importe mayúsculas/minúsculas
        queryBaseCondition += ` AND (A.titulo ILIKE $1 OR A.contenido ILIKE $1 OR C.nombre_categoria ILIKE $1)`;
    }

    const totalCountResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM Articulos A 
        INNER JOIN Categorias C ON A.categoria_id = C.id 
        ${queryBaseCondition}
    `, paramsCount);
    
    const totalArticulos = parseInt(totalCountResult.rows[0].total);
    const totalPaginas = Math.ceil(totalArticulos / limite);

    // Ajustamos los parámetros para el LIMIT y OFFSET
    let paramIndex = paramsCount.length + 1;
    paramsQuery.push(...paramsCount, limite, offset);

    const queryArticulosPaginados = `
        SELECT A.id, A.titulo, A.contenido, C.nombre_categoria AS categoria, U.nombre_usuario AS autor, A.fecha_publicacion
        FROM Articulos A
        INNER JOIN Categorias C ON A.categoria_id = C.id
        INNER JOIN Usuarios U ON A.autor_id = U.id
        ${queryBaseCondition}
        ORDER BY A.fecha_publicacion DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const resultadoArticulos = await pool.query(queryArticulosPaginados, paramsQuery);

    res.json({
        articulos: resultadoArticulos.rows, // En Postgres se usa .rows en vez de .recordset
        paginacion: { paginaActual: pagina, limitePorPagina: limite, totalArticulos: totalArticulos, totalPaginas: totalPaginas }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar artículos con paginación.');
  }
});

// Leer un SOLO artículo por su ID
app.get('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const query = `
      SELECT 
        A.id, A.titulo, A.contenido, A.categoria_id, 
        C.nombre_categoria AS categoria, U.nombre_usuario AS autor, A.fecha_publicacion
      FROM Articulos A
      INNER JOIN Categorias C ON A.categoria_id = C.id
      INNER JOIN Usuarios U ON A.autor_id = U.id
      WHERE A.id = $1
    `;
    const resultado = await pool.query(query, [id]);
    
    if (resultado.rows.length === 0) return res.status(404).send('Artículo no encontrado');
    res.json(resultado.rows[0]); 
  } catch (error) {
    res.status(500).send('Error interno del servidor.');
  }
});

// Crear artículos
app.post('/api/articulos', async (req, res) => {
  try {
    const { titulo, contenido, categoria_id, autor_id } = req.body;
    const query = `INSERT INTO Articulos (titulo, contenido, categoria_id, autor_id) VALUES ($1, $2, $3, $4)`;
    await pool.query(query, [titulo, contenido, categoria_id, autor_id]);
    res.status(201).send('¡Artículo creado con éxito en PostgreSQL!');
  } catch (error) {
    res.status(500).send('Hubo un error al guardar el artículo.');
  }
});

// Actualizar un artículo existente (Modo Edición)
app.put('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, contenido, categoria_id } = req.body;
    
    const query = `
      UPDATE Articulos 
      SET titulo = $1, contenido = $2, categoria_id = $3 
      WHERE id = $4
    `;
    
    await pool.query(query, [titulo, contenido, categoria_id, id]);
    res.status(200).send('Artículo actualizado con éxito en PostgreSQL.');
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).send('Hubo un error interno al actualizar el artículo.');
  }
});

// Registro de usuario
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre_usuario, correo, contrasena } = req.body;
    const salt = await bcrypt.genSalt(10); 
    const contrasenaHash = await bcrypt.hash(contrasena, salt);

    const query = `INSERT INTO Usuarios (nombre_usuario, correo, contrasena_encriptada) VALUES ($1, $2, $3)`;
    await pool.query(query, [nombre_usuario, correo, contrasenaHash]);
    res.status(201).send('¡Bienvenido! Usuario registrado con éxito.');

  } catch (error: any) {
    // 23505 es el código de error de PostgreSQL para "Violación de restricción UNIQUE" (correo repetido)
    if (error.code === '23505') {
      return res.status(400).send('Error: Ese correo electrónico ya está registrado.');
    }
    res.status(500).send('Hubo un error interno al registrar el usuario.');
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    const resultado = await pool.query('SELECT * FROM Usuarios WHERE correo = $1', [correo]);

    if (resultado.rows.length === 0) return res.status(401).send('Usuario no registrado o correo incorrecto.');
    
    const usuario = resultado.rows[0];

    if (usuario.estado === 'baneado') return res.status(403).send('Tu cuenta ha sido suspendida del servidor.');

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_encriptada);
    if (!contrasenaValida) return res.status(401).send('La contraseña no coincide.');

    res.status(200).json({ 
        mensaje: '¡Inicio de sesión exitoso!', 
        usuario: { 
            id: usuario.id, nombre: usuario.nombre_usuario, rol: usuario.rol,
            foto_perfil: usuario.foto_perfil, descripcion: usuario.descripcion 
        } 
    });
  } catch (error) {
    res.status(500).send('Error interno del servidor.');
  }
}); 

// Eliminar un artículo
app.delete('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Articulos WHERE id = $1', [id]);
    res.status(200).send('Artículo eliminado correctamente.');
  } catch (error) {
    res.status(500).send('Error al intentar borrar el artículo.');
  }
});

// Actualizar perfil con foto (Ruta unificada)
app.put('/api/usuarios/:id/perfil', upload.single('foto'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { nombre_usuario, nueva_contrasena, descripcion } = req.body;
    const archivoSubido = req.file;

    let query = `UPDATE Usuarios SET nombre_usuario = $1, descripcion = $2`;
    let valores: any[] = [nombre_usuario, descripcion];
    let contadorParametros = 3;

    if (nueva_contrasena && nueva_contrasena.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const contrasenaHash = await bcrypt.hash(nueva_contrasena, salt);
      valores.push(contrasenaHash);
      query += `, contrasena_encriptada = $${contadorParametros}`;
      contadorParametros++;
    }

    if (archivoSubido) {
        const fotoUrlPublica = `/uploads/${archivoSubido.filename}`;
        valores.push(fotoUrlPublica);
        query += `, foto_perfil = $${contadorParametros}`;
        contadorParametros++;
    }

    query += ` WHERE id = $${contadorParametros}`;
    valores.push(id);

    await pool.query(query, valores);

    const nuevaFotoFinal = archivoSubido ? `/uploads/${archivoSubido.filename}` : null;
    res.status(200).json({ mensaje: 'Perfil actualizado.', nuevaFoto: nuevaFotoFinal });

  } catch (error: any) {
    if (error.code === '23505') return res.status(400).send('Nombre de usuario ocupado.');
    res.status(500).send('Error interno al guardar los cambios.');
  }
});

// Leer todos los usuarios (Admin)
app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query("SELECT id, nombre_usuario, correo, rol, estado FROM Usuarios WHERE nombre_usuario != 'Angel'"); 
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).send('Error al obtener usuarios.');
  }
});

// Cambiar estado del usuario
app.put('/api/usuarios/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; 
    await pool.query('UPDATE Usuarios SET estado = $1 WHERE id = $2', [estado, id]);
    res.status(200).send('Estado del usuario actualizado.');
  } catch (error) {
    res.status(500).send('Error al cambiar el estado del usuario.');
  }
});

// Cambiar rol masivamente
app.put('/api/usuarios/roles', async (req, res) => {
  try {
    const { ids, nuevoRol } = req.body; 

    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('No se seleccionaron usuarios.');

    const idsSeguros = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    const query = `UPDATE Usuarios SET rol = $1 WHERE id IN (${idsSeguros.join(',')})`;
    await pool.query(query, [nuevoRol]);

    res.status(200).send('Roles actualizados correctamente.');
  } catch (error) {
    res.status(500).send('Error interno al cambiar roles.');
  }
});

// --- RUTAS DE CATEGORÍAS ---
app.get('/api/categorias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM Categorias');
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).send('Error al obtener categorías.');
  }
});

app.post('/api/categorias', async (req, res) => {
  try {
    const { nombre_categoria } = req.body;
    await pool.query('INSERT INTO Categorias (nombre_categoria) VALUES ($1)', [nombre_categoria]);
    res.status(201).send('Categoría creada con éxito.');
  } catch (error) {
    res.status(500).send('Error interno al crear categoría.');
  }
});

// Eliminar categoría
app.delete('/api/categorias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Categorias WHERE id = $1', [id]);
    res.status(200).send('Categoría eliminada.');
  } catch (error: any) {
    // Si la categoría ya tiene artículos vinculados, PostgreSQL bloqueará el borrado por seguridad
    if (error.code === '23503') {
        return res.status(400).send('No puedes borrar una categoría que ya tiene artículos.');
    }
    res.status(500).send('Error interno al eliminar categoría.');
  }
});

// --- RUTAS DE COMENTARIOS ---
app.get('/api/articulos/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT C.id, C.contenido, C.fecha_publicacion, U.nombre_usuario AS autor
      FROM Comentarios C
      INNER JOIN Usuarios U ON C.autor_id = U.id
      WHERE C.articulo_id = $1
      ORDER BY C.fecha_publicacion DESC
    `;
    const resultado = await pool.query(query, [id]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).send('Error al cargar comentarios.');
  }
});

app.post('/api/comentarios', async (req, res) => {
  try {
    const { articulo_id, autor_id, contenido } = req.body;
    await pool.query('INSERT INTO Comentarios (articulo_id, autor_id, contenido) VALUES ($1, $2, $3)', [articulo_id, autor_id, contenido]);
    res.status(201).send('Comentario publicado.');
  } catch (error) {
    res.status(500).send('Error al publicar el comentario.');
  }
});

app.delete('/api/comentarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Comentarios WHERE id = $1', [id]);
    res.status(200).send('Comentario eliminado.');
  } catch (error) {
    res.status(500).send('Error al eliminar comentario.');
  }
});

// Obtener datos públicos de un usuario
app.get('/api/usuarios/publico/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        const resultado = await pool.query(`
            SELECT id, nombre_usuario, rol, foto_perfil, descripcion, estado 
            FROM Usuarios 
            WHERE nombre_usuario = $1
        `, [nombre]);
        
        if (resultado.rows.length === 0) return res.status(404).send('Usuario no encontrado');
        res.json(resultado.rows[0]);
    } catch (error) {
        res.status(500).send('Error al cargar el perfil público.');
    }
});

// Obtener artículos ESCRITOS por un usuario
app.get('/api/articulos/usuario/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        const query = `
            SELECT A.id, A.titulo, A.fecha_publicacion 
            FROM Articulos A
            INNER JOIN Usuarios U ON A.autor_id = U.id
            WHERE U.nombre_usuario = $1
            ORDER BY A.fecha_publicacion DESC
        `;
        const resultado = await pool.query(query, [nombre]);
        res.json(resultado.rows); 
    } catch (error) {
        res.status(500).send('Error al cargar artículos del usuario.');
    }
});

// 1. RUTA PARA LEER ROLES
app.get('/api/roles', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM Roles ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).send('Error al obtener roles.');
  }
});

// 2. RUTA PARA CREAR ROL Y ASIGNAR PERMISOS
app.post('/api/roles', async (req, res) => {
  try {
    const { nombre, permisos } = req.body;
    
    // Insertamos el rol y obtenemos su ID
    const nuevoRol = await pool.query('INSERT INTO Roles (nombre_rol) VALUES ($1) RETURNING id', [nombre]);
    const rolId = nuevoRol.rows[0].id;

    // Asignamos cada permiso seleccionado al nuevo rol
    for (const nomPermiso of permisos) {
        await pool.query(`
            INSERT INTO Roles_Permisos (rol_id, permiso_id)
            SELECT $1, id FROM Permisos WHERE nombre_permiso = $2
        `, [rolId, nomPermiso]);
    }

    res.status(201).send('Rol creado con permisos.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear rol maestro.');
  }
});

app.listen(puerto, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${puerto}`);
});