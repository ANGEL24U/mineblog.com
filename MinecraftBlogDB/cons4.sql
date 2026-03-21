-- Agregamos la columna 'estado', por defecto todos son 'activo'
ALTER TABLE Usuarios ADD estado VARCHAR(20) DEFAULT 'activo';
GO

-- Por si las dudas, nos aseguramos de que los usuarios viejos sean activos
UPDATE Usuarios SET estado = 'activo' WHERE estado IS NULL;
GO