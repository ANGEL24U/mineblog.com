-- 1. Creamos la base de datos y la seleccionamos
CREATE DATABASE MinecraftBlogDB;
GO

USE MinecraftBlogDB;
GO

-- 2. Tabla Usuarios
CREATE TABLE Usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena_encriptada VARCHAR(255) NOT NULL,
    fecha_registro DATETIME DEFAULT GETDATE()
);

-- 3. Tabla Categorías
CREATE TABLE Categorias (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL
);

-- 4. Tabla Artículos
CREATE TABLE Articulos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido VARCHAR(MAX) NOT NULL,
    categoria_id INT NOT NULL,
    autor_id INT NOT NULL,
    fecha_publicacion DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Articulo_Categoria FOREIGN KEY (categoria_id) REFERENCES Categorias(id),
    CONSTRAINT FK_Articulo_Usuario FOREIGN KEY (autor_id) REFERENCES Usuarios(id)
);

-- 5. Tabla Comentarios
CREATE TABLE Comentarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    articulo_id INT NOT NULL,
    autor_id INT NOT NULL,
    contenido VARCHAR(500) NOT NULL,
    fecha DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Comentario_Articulo FOREIGN KEY (articulo_id) REFERENCES Articulos(id),
    CONSTRAINT FK_Comentario_Usuario FOREIGN KEY (autor_id) REFERENCES Usuarios(id)
);
GO

-- 6. ¡Inyectamos los primeros datos de prueba!
INSERT INTO Usuarios (nombre_usuario, correo, contrasena_encriptada)
VALUES ('Angel', 'admin@minecraftblog.com', 'mipasswordsecreta123');

INSERT INTO Categorias (nombre_categoria)
VALUES ('Guías y Tutoriales');

INSERT INTO Articulos (titulo, contenido, categoria_id, autor_id)
VALUES (
    'Cómo sobrevivir la primera noche en Minecraft', 
    'Lo primero que debes hacer es talar madera, hacer una mesa de crafteo y construir un refugio de tierra antes de que caiga el sol y aparezcan los creepers...', 
    1, 
    1
);
GO