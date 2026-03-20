import express = require('express');
import sql = require('mssql');
import cors = require('cors'); // 1. IMPORTAMOS CORS AQUÍ ARRIBA

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

// ¡NUEVA RUTA (POST)! Para CREAR un artículo nuevo
app.post('/api/articulos', async (req, res) => {
  try {
    // 1. Extraemos los datos que nos envía Thunder Client
    const { titulo, contenido, categoria_id, autor_id } = req.body;

    // 2. Preparamos la consulta SQL de forma segura (evitando inyecciones SQL)
    const request = new sql.Request();
    request.input('titulo', sql.VarChar, titulo);
    request.input('contenido', sql.VarChar, contenido);
    request.input('categoria_id', sql.Int, categoria_id);
    request.input('autor_id', sql.Int, autor_id);

    const query = `
      INSERT INTO Articulos (titulo, contenido, categoria_id, autor_id)
      VALUES (@titulo, @contenido, @categoria_id, @autor_id)
    `;

    // 3. Ejecutamos la inserción en la base de datos
    await request.query(query);
    
    // 4. Respondemos que todo salió bien (Código 201 significa "Creado")
    res.status(201).send('¡Artículo creado con éxito en SQL Server!');
  } catch (error) {
    console.error('Error al crear el artículo:', error);
    res.status(500).send('Hubo un error al guardar el artículo.');
  }
});

app.listen(puerto, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${puerto}`);
});