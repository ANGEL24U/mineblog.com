-- 1. Le ponemos la contraseña "diamante123" a Angel, copiando el hash de Steve
UPDATE Usuarios
SET contrasena_encriptada = (SELECT contrasena_encriptada FROM Usuarios WHERE nombre_usuario = 'Steve')
WHERE nombre_usuario = 'Angel';

-- 2. Arreglamos a los usuarios nuevos para que no digan NULL y sean 'usuario'
UPDATE Usuarios 
SET rol = 'usuario' 
WHERE rol IS NULL;