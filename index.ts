import express = require('express');
import sql = require('mssql');
import cors = require('cors');
import bcrypt = require('bcryptjs'); // ¡NUEVO! Importamos la herramienta de encriptación

const app = express();
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
app.get('/api/articulos', async (req, res) => {
  try {
    // Usamos INNER JOIN para traer el nombre del autor y de la categoría
    const query = `
      SELECT 
        A.id, 
        A.titulo, 
        A.contenido, 
        C.nombre_categoria AS categoria, 
        U.nombre_usuario AS autor, 
        A.fecha_publicacion
      FROM Articulos A
      INNER JOIN Categorias C ON A.categoria_id = C.id
      INNER JOIN Usuarios U ON A.autor_id = U.id
    `;
    
    const resultado = await sql.query(query);
    
    // Devolvemos los datos ya procesados y listos para el frontend
    res.json(resultado.recordset); 
  } catch (error) {
    console.error('Error al obtener los artículos:', error);
    res.status(500).send('Hubo un error en el servidor al buscar los artículos.');
  }
});

// ¡NUEVA RUTA! Leer un SOLO artículo por su ID
app.get('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params; // Capturamos el ID de la URL
    
    const query = `
      SELECT 
        A.id, 
        A.titulo, 
        A.contenido, 
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

    // ¡LO NUEVO! Ahora enviamos también el ROL al frontend
    res.status(200).json({ 
        mensaje: '¡Inicio de sesión exitoso!', 
        usuario: { 
            id: usuario.id, 
            nombre: usuario.nombre_usuario,
            rol: usuario.rol // Agregamos esta línea
        } 
    });

  } catch (error) {
    // ¡Faltaba esto! El catch para atrapar errores y cerrar el try
    console.error('Error en el login:', error);
    res.status(500).send('Error interno del servidor.');
  }
}); // <-- ¡Y faltaba esto! El cierre de la ruta app.post

// ¡NUEVA RUTA! Eliminar una categoría
app.delete('/api/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = new sql.Request();
        request.input('id', sql.Int, id);

        // ¡OJO AQUÍ! Antes de borrar la categoría, debemos verificar si hay artículos usándola.
        // Si borramos una categoría que está en uso, la base de datos nos dará un error (Restricción de Clave Foránea).
        // Por ahora, asumiremos que solo borras categorías vacías.
        
        await request.query('DELETE FROM Categorias WHERE id = @id');
        res.status(200).send('Categoría eliminada.');
    } catch (error: any) {
        console.error('Error al eliminar categoría:', error);
        // Manejo básico si intentas borrar una categoría en uso
        if (error.number === 547) { 
             return res.status(400).send('No puedes eliminar una categoría que ya tiene artículos asignados.');
        }
        res.status(500).send('Error interno al eliminar categoría.');
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

// Esta tiene que ser SIEMPRE la última parte de tu archivo index.ts
app.listen(puerto, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${puerto}`);
});