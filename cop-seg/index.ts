import express = require('express');
import sql = require('mssql');
import cors = require('cors');
import bcrypt = require('bcryptjs'); 
import multer = require('multer'); // ¡NUEVO! Herramienta de subida
import path = require('path'); // ¡NUEVO! Manejo de rutas de Windows
import fs = require('fs'); // ¡NUEVO! Manejo de carpetas del sistema

const app = express();

app.use(express.json());

// --- ¡NUEVA CONFIGURACIÓN DE SUBIDA DE ARCHIVOS (MULTER)! ---

// A. Creamos la carpeta 'uploads' automáticamente si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// B. Configuramos el motor de almacenamiento de Multer
const storage = multer.diskStorage({
  // Decimos dónde guardar el archivo
  destination: (req, file, cb) => {
    cb(null, uploadsDir); 
  },
  // Le cambiamos el nombre para que sea único (ej: usuario-1-123456789.png)
  filename: (req: any, file, cb) => {
    // Usamos el ID del usuario si está en la request, o la fecha actual
    const userId = req.params.id || Date.now();
    const ext = path.extname(file.originalname); // Obtenemos la extensión (.jpg, .png)
    cb(null, `avatar-user-${userId}-${Date.now()}${ext}`);
  }
});

// C. Creamos el filtro para asegurarnos de que solo suban IMÁGENES
const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Aceptado
    } else {
        cb(new Error('❌ Solo se permiten archivos de imagen.'), false); // Rechazado
    }
};

// D. Inicializamos la herramienta con un límite de tamaño (ej. 2MB)
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

// E. ¡MUY IMPORTANTE! Hacemos que la carpeta 'uploads' sea pública
// Esto permite que el navegador pueda ver las fotos subidas (localhost:3000/uploads/foto.png)
app.use('/uploads', express.static(uploadsDir));

const puerto = 3000;

// Permite que Express entienda el JSON que se envía (es como un traductor)
app.use(express.json()); 
app.use(cors()); // Esto es para darle permisos a la web

// Configuración de la base de datos
const dbConfig = {
  user: 'sa',
  password: 'xc3v_183',
  server: 'localhost', 
  database: 'MinecraftBlogDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Conectamos a la base de datos justo cuando arranca el servidor
sql.connect(dbConfig).then(() => {
  console.log("==========================================");
  console.log("✅ Conectado a SQL Server exitosamente");
  console.log("==========================================");
}).catch(err => {
  console.error("❌ Error conectando a la base de datos:", err);
});

// Ruta de leer artículos (GET) - CON JOINs
// --- RUTA ACTUALIZADA! Artículos con BUSCADOR y PAGINACIÓN REAL (10 por página) ---
// --- RUTA ACTUALIZADA! Artículos con BUSCADOR, PAGINACIÓN REAL y JOINs corregidos ---
app.get('/api/articulos', async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = 10;
    const terminoBusqueda = req.query.buscar as string || "";
    const offset = (pagina - 1) * limite;

    const request = new sql.Request();
    request.input('limite', sql.Int, limite);
    request.input('offset', sql.Int, offset);

    // ¡AQUÍ ESTABA EL ERROR! Filtro base neutro, sin columnas fantasma
    let queryBaseCondition = "WHERE 1=1"; 

    if (terminoBusqueda) {
        request.input('busqueda', sql.VarChar, `%${terminoBusqueda}%`);
        queryBaseCondition += ` AND (A.titulo LIKE @busqueda OR A.contenido LIKE @busqueda OR C.nombre_categoria LIKE @busqueda)`;
    }

    const totalCountResult = await request.query(`
        SELECT COUNT(*) as total 
        FROM Articulos A 
        INNER JOIN Categorias C ON A.categoria_id = C.id 
        ${queryBaseCondition}
    `);
    const totalArticulos = totalCountResult.recordset[0].total;
    const totalPaginas = Math.ceil(totalArticulos / limite);

    const queryArticulosPaginados = `
        SELECT A.id, A.titulo, A.contenido, C.nombre_categoria AS categoria, U.nombre_usuario AS autor, A.fecha_publicacion
        FROM Articulos A
        INNER JOIN Categorias C ON A.categoria_id = C.id
        INNER JOIN Usuarios U ON A.autor_id = U.id
        ${queryBaseCondition}
        ORDER BY A.fecha_publicacion DESC
        OFFSET @offset ROWS
        FETCH NEXT @limite ROWS ONLY
    `;
    const resultadoArticulos = await request.query(queryArticulosPaginados);

    res.json({
        articulos: resultadoArticulos.recordset,
        paginacion: { paginaActual: pagina, limitePorPagina: limite, totalArticulos: totalArticulos, totalPaginas: totalPaginas }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar artículos con paginación.');
  }
});

// ¡NUEVA RUTA! Leer un SOLO artículo por su ID
app.get('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params; // Capturamos el ID de la URL
    
    // AQUÍ ESTABA EL ERROR: Faltaba el FROM, los JOIN y el WHERE
    const query = `
      SELECT 
        A.id, 
        A.titulo, 
        A.contenido, 
        A.categoria_id, 
        C.nombre_categoria AS categoria, 
        U.nombre_usuario AS autor, 
        A.fecha_publicacion
      FROM Articulos A
      INNER JOIN Categorias C ON A.categoria_id = C.id
      INNER JOIN Usuarios U ON A.autor_id = U.id
      WHERE A.id = @id
    `;
    
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    const resultado = await request.query(query);
    
    // Si no encuentra el artículo, devolvemos un error 404
    if (resultado.recordset.length === 0) {
      return res.status(404).send('Artículo no encontrado');
    }
    
    // Devolvemos el artículo exacto (el primero y único de la lista)
    res.json(resultado.recordset[0]); 
  } catch (error) {
    console.error('Error al obtener el artículo individual:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

// RUTA PARA CREAR ARTÍCULOS (POST)
app.post('/api/articulos', async (req, res) => {
  try {
    const { titulo, contenido, categoria_id, autor_id } = req.body;

    const request = new sql.Request();
    request.input('titulo', sql.VarChar, titulo);
    request.input('contenido', sql.VarChar, contenido);
    request.input('categoria_id', sql.Int, categoria_id);
    request.input('autor_id', sql.Int, autor_id);

    const query = `
      INSERT INTO Articulos (titulo, contenido, categoria_id, autor_id)
      VALUES (@titulo, @contenido, @categoria_id, @autor_id)
    `;

    await request.query(query);
    res.status(201).send('¡Artículo creado con éxito en SQL Server!');
  } catch (error) {
    console.error('Error al crear el artículo:', error);
    res.status(500).send('Hubo un error al guardar el artículo.');
  }
});

// Registro de un nuevo usuario
app.post('/api/registro', async (req, res) => {
  try {
    // 1. Recibimos los datos del nuevo usuario desde el Frontend
    const { nombre_usuario, correo, contrasena } = req.body;

    // 2. Generamos la encriptación (El "salt" le agrega ruido aleatorio para más seguridad)
    const salt = await bcrypt.genSalt(10); 
    const contrasenaHash = await bcrypt.hash(contrasena, salt);

    // 3. Preparamos la consulta para la base de datos
    const request = new sql.Request();
    request.input('nombre_usuario', sql.VarChar, nombre_usuario);
    request.input('correo', sql.VarChar, correo);
    
    // OJO: Guardamos la contraseña encriptada, NUNCA la original
    request.input('contrasena_encriptada', sql.VarChar, contrasenaHash);

    const query = `
      INSERT INTO Usuarios (nombre_usuario, correo, contrasena_encriptada)
      VALUES (@nombre_usuario, @correo, @contrasena_encriptada)
    `;

    // 4. Ejecutamos el guardado
    await request.query(query);
    
    res.status(201).send('¡Bienvenido! Usuario registrado con éxito.');

  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    
    // Si el error es el número 2627 en SQL Server, significa que el correo ya existe (UNIQUE)
    if (error.number === 2627) {
      return res.status(400).send('Error: Ese correo electrónico ya está registrado.');
    }
    
    res.status(500).send('Hubo un error interno al registrar el usuario.');
  }
});

// RUTA DE LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    const request = new sql.Request();
    request.input('correo', sql.VarChar, correo);
    
    const resultado = await request.query('SELECT * FROM Usuarios WHERE correo = @correo');

    // Validación 1: El correo no existe
    if (resultado.recordset.length === 0) {
      return res.status(401).send('Usuario no registrado o correo incorrecto.');
    }

    const usuario = resultado.recordset[0];

    // ¡NUEVO FILTRO POLICIAL! Revisamos si está baneado
    if (usuario.estado === 'baneado') {
      return res.status(403).send('Tu cuenta ha sido suspendida del servidor.');
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_encriptada);

    // Validación 2: La contraseña no hace match
    if (!contrasenaValida) {
      return res.status(401).send('La contraseña no coincide.');
    }

    // ¡LO NUEVO! Enviamos también la descripción
    res.status(200).json({ 
        mensaje: '¡Inicio de sesión exitoso!', 
        usuario: { 
            id: usuario.id, 
            nombre: usuario.nombre_usuario,
            rol: usuario.rol,
            foto_perfil: usuario.foto_perfil,
            descripcion: usuario.descripcion // <-- Añadimos esto
        } 
    });

  } catch (error) {
    // ¡Faltaba esto! El catch para atrapar errores y cerrar el try
    console.error('Error en el login:', error);
    res.status(500).send('Error interno del servidor.');
  }
}); // <-- ¡Y faltaba esto! El cierre de la ruta app.post

// ¡NUEVA RUTA! Eliminar un artículo por su ID
app.delete('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    
    // Ejecutamos la orden de borrado en SQL Server
    await request.query('DELETE FROM Articulos WHERE id = @id');
    
    res.status(200).send('Artículo eliminado correctamente.');
  } catch (error) {
    console.error('Error al eliminar artículo:', error);
    res.status(500).send('Error al intentar borrar el artículo.');
  }
});

// ¡NUEVA RUTA! Actualizar un artículo existente (PUT)
// ¡RUTA ACTUALIZADA! Ahora acepta subida de archivo único con el nombre 'foto'
app.put('/api/usuarios/:id/perfil', upload.single('foto'), async (req: any, res) => {
  try {
    const { id } = req.params;
    // 1. Recibimos la descripción del frontend
    const { nombre_usuario, nueva_contrasena, descripcion } = req.body;

    const archivoSubido = req.file;
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    request.input('nombre_usuario', sql.VarChar, nombre_usuario);

    // 2. Añadimos la descripción como parámetro
    request.input('descripcion', sql.VarChar, descripcion);

    // 3. Modificamos la consulta base para incluir la descripción
    let query = `UPDATE Usuarios SET nombre_usuario = @nombre_usuario, descripcion = @descripcion`;

    // 🛡️ SEGURIDAD: Contraseña
    if (nueva_contrasena && nueva_contrasena.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const contrasenaHash = await bcrypt.hash(nueva_contrasena, salt);
      request.input('contrasena_encriptada', sql.VarChar, contrasenaHash);
      query += `, contrasena_encriptada = @contrasena_encriptada`;
    }

    // 🖼️ ¡LA NUEVA FOTO!
    if (archivoSubido) {
        // Guardamos en la base de datos la URL pública del archivo (ej: /uploads/avatar-user-1...jpg)
        const fotoUrlPublica = `/uploads/${archivoSubido.filename}`;
        request.input('foto_perfil', sql.VarChar, fotoUrlPublica);
        query += `, foto_perfil = @foto_perfil`;
    }

    query += ` WHERE id = @id`;

    await request.query(query);

    // Si todo salió bien, respondemos con la nueva URL de la foto para que el frontend se actualice
    const nuevaFotoFinal = archivoSubido ? `/uploads/${archivoSubido.filename}` : null;
    res.status(200).json({ mensaje: 'Perfil actualizado.', nuevaFoto: nuevaFotoFinal });

  } catch (error: any) {
    console.error('Error al actualizar perfil con foto:', error);
    if (error.number === 2627) return res.status(400).send('Nombre de usuario ocupado.');
    res.status(500).send('Error interno al guardar los cambios.');
  }
});

// ¡NUEVA RUTA! Leer todos los usuarios (Para el panel de Admin)
app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await sql.query("SELECT id, nombre_usuario, correo, rol, estado FROM Usuarios WHERE nombre_usuario != 'Angel'"); // Excluimos tu propia cuenta para que no te banees a ti mismo por accidente
    res.json(resultado.recordset);
  } catch (error) {
    res.status(500).send('Error al obtener usuarios.');
  }
});

// ¡NUEVA RUTA! Cambiar estado del usuario (Banear/Reactivar)
app.put('/api/usuarios/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // Recibe 'activo' o 'baneado'
    
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    request.input('estado', sql.VarChar, estado);
    
    await request.query('UPDATE Usuarios SET estado = @estado WHERE id = @id');
    res.status(200).send('Estado del usuario actualizado.');
  } catch (error) {
    res.status(500).send('Error al cambiar el estado del usuario.');
  }
});

// ¡NUEVA RUTA! Cambiar rol masivamente
app.put('/api/usuarios/roles', async (req, res) => {
  try {
    const { ids, nuevoRol } = req.body; // Recibimos una lista de IDs y el rol deseado

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).send('No se seleccionaron usuarios.');
    }

    // Seguridad: Nos aseguramos de que los IDs sean números reales para evitar inyecciones SQL
    const idsSeguros = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    // Ejecutamos una actualización masiva usando la cláusula "IN" de SQL
    const query = `UPDATE Usuarios SET rol = '${nuevoRol}' WHERE id IN (${idsSeguros.join(',')})`;
    await sql.query(query);

    res.status(200).send('Roles actualizados correctamente.');
  } catch (error) {
    console.error('Error al actualizar roles:', error);
    res.status(500).send('Error interno al cambiar roles.');
  }
});

// --- RUTAS DE CATEGORÍAS ---

// Leer todas las categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const resultado = await sql.query('SELECT * FROM Categorias');
    res.json(resultado.recordset);
  } catch (error) {
    res.status(500).send('Error al obtener categorías.');
  }
});

// Crear una nueva categoría
app.post('/api/categorias', async (req, res) => {
  try {
    const { nombre_categoria } = req.body;
    const request = new sql.Request();
    request.input('nombre_categoria', sql.VarChar, nombre_categoria);
    
    await request.query('INSERT INTO Categorias (nombre_categoria) VALUES (@nombre_categoria)');
    res.status(201).send('Categoría creada con éxito.');
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).send('Error interno al crear categoría.');
  }
});

// --- RUTAS DE COMENTARIOS ---

// 1. Leer comentarios de un artículo específico
app.get('/api/articulos/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT C.id, C.contenido, C.fecha_publicacion, U.nombre_usuario AS autor
      FROM Comentarios C
      INNER JOIN Usuarios U ON C.autor_id = U.id
      WHERE C.articulo_id = @id
      ORDER BY C.fecha_publicacion DESC
    `;
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    const resultado = await request.query(query);
    res.json(resultado.recordset);
  } catch (error) {
    res.status(500).send('Error al cargar comentarios.');
  }
});

// 2. Publicar un comentario nuevo
app.post('/api/comentarios', async (req, res) => {
  try {
    const { articulo_id, autor_id, contenido } = req.body;
    const request = new sql.Request();
    request.input('articulo_id', sql.Int, articulo_id);
    request.input('autor_id', sql.Int, autor_id);
    request.input('contenido', sql.VarChar, contenido);
    
    await request.query('INSERT INTO Comentarios (articulo_id, autor_id, contenido) VALUES (@articulo_id, @autor_id, @contenido)');
    res.status(201).send('Comentario publicado.');
  } catch (error) {
    res.status(500).send('Error al publicar el comentario.');
  }
});

// 3. Eliminar comentario (Moderación Admin)
app.delete('/api/comentarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    await request.query('DELETE FROM Comentarios WHERE id = @id');
    res.status(200).send('Comentario eliminado.');
  } catch (error) {
    res.status(500).send('Error al eliminar comentario.');
  }
});

// ¡NUEVA RUTA! Actualizar datos del Perfil
app.put('/api/usuarios/:id/perfil', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_usuario, nueva_contrasena, foto_perfil } = req.body;

    const request = new sql.Request();
    request.input('id', sql.Int, id);
    request.input('nombre_usuario', sql.VarChar, nombre_usuario);
    request.input('foto_perfil', sql.VarChar, foto_perfil);

    // Armamos la consulta base
    let query = `UPDATE Usuarios SET nombre_usuario = @nombre_usuario, foto_perfil = @foto_perfil`;

    // Si el usuario escribió una contraseña nueva, la encriptamos y la sumamos a la actualización
    if (nueva_contrasena && nueva_contrasena.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const contrasenaHash = await bcrypt.hash(nueva_contrasena, salt);
      request.input('contrasena_encriptada', sql.VarChar, contrasenaHash);
      query += `, contrasena_encriptada = @contrasena_encriptada`;
    }

    query += ` WHERE id = @id`;

    await request.query(query);
    res.status(200).send('Perfil actualizado correctamente.');
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    // Error 2627: Alguien más ya tiene ese nombre de usuario
    if (error.number === 2627) {
      return res.status(400).send('Ese nombre de usuario ya está ocupado.');
    }
    res.status(500).send('Error interno al guardar los cambios.');
  }
});

// ¡NUEVA RUTA! Obtener los datos públicos de un usuario para su "Tarjeta de Presentación"
// ¡Ruta pública ACTUALIZADA para incluir ID y estado!
app.get('/api/usuarios/publico/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        const request = new sql.Request();
        request.input('nombre', sql.VarChar, nombre);
        
        const resultado = await request.query(`
            SELECT id, nombre_usuario, rol, foto_perfil, descripcion, estado 
            FROM Usuarios 
            WHERE nombre_usuario = @nombre
        `);
        
        if (resultado.recordset.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }
        
        res.json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).send('Error al cargar el perfil público.');
    }
});

// ¡Ruta corregida! Obtener los artículos ESCRITOS por un usuario específico
app.get('/api/articulos/usuario/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        const request = new sql.Request();
        request.input('nombre', sql.VarChar, nombre);
        
        // ¡Corregido! Ahora busca por el ID del usuario correctamente
        const query = `
            SELECT A.id, A.titulo, A.fecha_publicacion 
            FROM Articulos A
            INNER JOIN Usuarios U ON A.autor_id = U.id
            WHERE U.nombre_usuario = @nombre
            ORDER BY A.fecha_publicacion DESC
        `;
        
        const resultado = await request.query(query);
        res.json(resultado.recordset); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar artículos del usuario.');
    }
});

// Esta tiene que ser SIEMPRE la última parte de tu archivo index.ts
app.listen(puerto, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${puerto}`);
});