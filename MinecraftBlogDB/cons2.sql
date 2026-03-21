-- 1. Agregamos la columna 'rol' (por defecto todos serán 'usuario')
ALTER TABLE Usuarios ADD rol VARCHAR(20) DEFAULT 'usuario';
GO

-- 2. Te ascendemos a ti al rango de Administrador
UPDATE Usuarios SET rol = 'admin' WHERE nombre_usuario = 'Angel';
GO