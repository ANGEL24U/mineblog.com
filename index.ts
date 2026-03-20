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

// ¡NUEVA RUTA! Registro de un nuevo usuario
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

// Esta tiene que ser SIEMPRE la última parte de tu archivo index.ts
app.listen(puerto, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${3000}`);
});