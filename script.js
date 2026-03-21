// script.js
async function cargarArticulos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/articulos'); 
        const articulos = await respuesta.json();
        
        const contenedor = document.getElementById('columna-articulos');
        
        // ¡EL NUEVO ESCUDO PARA EL DASHBOARD!
        // Si detectamos que el formulario de publicar existe en la pantalla, abortamos la función para no borrarlo.
        if (document.getElementById('formulario-publicar')) return; 

        // El escudo anterior para cuando la columna no existe (ej: Login o Registro)
        if (!contenedor) return; 

        contenedor.innerHTML = ''; 

        articulos.forEach(art => {
            // 1. Truco Ninja: Limpiamos las etiquetas HTML para sacar solo el texto puro
            let textoPlano = art.contenido.replace(/<[^>]+>/g, '');
            
            // 2. Cortamos el texto a 150 caracteres para la vista previa
            let resumen = textoPlano.substring(0, 150) + '...';

            // 3. Convertimos el título y agregamos un botón de "Leer más" con el ID del artículo
            const html = `
                <div class="articulo">
                    <a href="articulo.html?id=${art.id}" style="text-decoration: none; color: inherit;">
                        <h2 style="color: #0000EE; text-decoration: underline;">${art.titulo}</h2>
                    </a>
                    <span class="categoria">${art.categoria}</span>
                    <p>${resumen}</p>
                    <p><a href="articulo.html?id=${art.id}" style="font-weight: bold; color: #d32f2f;">[Leer artículo completo]</a></p>
                    <p class="autor-fecha">Posteado por: <b>${art.autor}</b> | ${new Date(art.fecha_publicacion).toLocaleDateString()}</p>
                </div>
            `;
            contenedor.innerHTML += html;
        });

    } catch (error) {
        const contenedor = document.getElementById('columna-articulos');
        if(contenedor) contenedor.innerHTML = "<p>Error: Se perdió la conexión con el servidor.</p>";
    }
}

cargarArticulos();

// --- LÓGICA DE LOGIN ---
// Primero verificamos si el formulario existe en la página actual
const formLogin = document.getElementById('formulario-login');

if (formLogin) {
    formLogin.addEventListener('submit', async (evento) => {
        evento.preventDefault(); 

        const correo = document.getElementById('correo').value;
        const contrasena = document.getElementById('contrasena').value;
        const mensajeError = document.getElementById('mensaje-error');
        
        // Limpiamos errores previos
        mensajeError.innerText = "";

        try {
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena })
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                
                // ¡NUEVO! Guardamos al usuario en la memoria del navegador
                localStorage.setItem('usuarioLogeado', JSON.stringify(datos.usuario));
                
                alert(datos.mensaje + " Bienvenido, " + datos.usuario.nombre);
                window.location.href = 'index.html'; 
            } else {
                // Ahora leerá nuestros mensajes bonitos ("La contraseña no coincide", etc.)
                const error = await respuesta.text();
                mensajeError.innerText = "❌ " + error;
            }
        } catch (error) {
            mensajeError.innerText = "❌ Error de conexión con el servidor maestro.";
        }
    });
}

// --- LÓGICA DE REGISTRO ---
const formRegistro = document.getElementById('formulario-registro');

if (formRegistro) {
    formRegistro.addEventListener('submit', async (evento) => {
        evento.preventDefault(); 

        const nombre_usuario = document.getElementById('reg-usuario').value;
        const correo = document.getElementById('reg-correo').value;
        const contrasena = document.getElementById('reg-contrasena').value;
        const mensajeErrorReg = document.getElementById('mensaje-error-reg');
        
        mensajeErrorReg.innerText = "";

        try {
            // Tocamos la ruta POST de registro de tu API
            const respuesta = await fetch('http://localhost:3000/api/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_usuario, correo, contrasena })
            });

            if (respuesta.ok) {
                alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
                // Si se registra bien, lo mandamos al login para que entre
                window.location.href = 'login.html'; 
            } else {
                // Si el correo ya existe, mostramos el error de SQL
                const error = await respuesta.text();
                mensajeErrorReg.innerText = "❌ " + error;
            }
        } catch (error) {
            mensajeErrorReg.innerText = "❌ Error de conexión con el servidor maestro.";
        }
    });
}

// --- LÓGICA DE SESIÓN (Memoria del navegador) ---
function verificarSesion() {
    // Buscamos la caja del perfil en el HTML
    const infoUsuarioDiv = document.getElementById('info-usuario');
    
    // Si no estamos en el index.html, la función se detiene aquí
    if (!infoUsuarioDiv) return; 

    // Leemos la memoria del navegador
    const usuarioGuardado = localStorage.getItem('usuarioLogeado');

    if (usuarioGuardado) {
        // Convertimos el texto guardado de vuelta a un objeto de JavaScript
        const usuario = JSON.parse(usuarioGuardado);
        
        // Armamos el HTML con los datos del usuario
        let htmlPerfil = `
            <p style="margin-bottom: 5px;">Bienvenido, <b>${usuario.nombre}</b></p>
            <p style="margin-top: 0;">Rango: <span class="categoria" style="background: ${usuario.rol === 'admin' ? '#d32f2f' : '#388E3C'}">${usuario.rol.toUpperCase()}</span></p>
            <ul class="sidebar-links">
        `;

        // ¡EL BOTÓN SECRETO! Solo aparece si eres administrador
        if (usuario.rol === 'admin') {
            htmlPerfil += `<li><a href="dashboard.html" style="color: #d32f2f; font-weight: bold;">⚙️ Panel de Admin</a></li>`;
        }

        htmlPerfil += `
                <li><a href="#" id="btn-logout" style="color: #555;">Cerrar Sesión</a></li>
            </ul>
        `;

        // Inyectamos el nuevo HTML en la pantalla
        infoUsuarioDiv.innerHTML = htmlPerfil;

        // Le damos la orden al botón de cerrar sesión para que borre la memoria
        document.getElementById('btn-logout').addEventListener('click', (evento) => {
            evento.preventDefault();
            localStorage.removeItem('usuarioLogeado'); // Borramos la memoria
            window.location.reload(); // Recargamos la página para que los cambios se vean
        });
    }
}

// Ejecutamos la función apenas cargue el archivo JS
verificarSesion();

// --- LÓGICA DEL PANEL DE ADMINISTRACIÓN (DASHBOARD) ---
const formPublicar = document.getElementById('formulario-publicar');

if (formPublicar) {
    const usuarioGuardado = localStorage.getItem('usuarioLogeado');

    // --- Lógica de Gestión: Cargar y Eliminar Artículos ---
        async function cargarArticulosAdmin() {
            const listaAdmin = document.getElementById('admin-lista-articulos');
            if(!listaAdmin) return;

            try {
                const respuesta = await fetch('http://localhost:3000/api/articulos');
                const articulos = await respuesta.json();
                
                listaAdmin.innerHTML = ''; // Limpiamos la caja
                
                articulos.forEach(art => {
                    listaAdmin.innerHTML += `
                        <div style="border-bottom: 1px solid #ccc; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 18px;"><b>${art.titulo}</b> <br><span style="color: #555; font-size: 16px;">(Autor: ${art.autor})</span></span>
                            <button onclick="eliminarArticulo(${art.id})" style="background: #d32f2f; color: white; border: 2px solid #b71c1c; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 10px;">🗑️ Eliminar</button>
                        </div>
                    `;
                });
            } catch(error) {
                listaAdmin.innerHTML = '<p style="color: red;">Error al cargar artículos.</p>';
            }
        }
        
        // Ejecutamos la carga al entrar al panel
        cargarArticulosAdmin();

        // Esta función debe ser "global" para que el botón HTML la encuentre
        window.eliminarArticulo = async function(id) {
            // Un pequeño popup de seguridad antes de borrar
            if(confirm("¿Estás seguro de que quieres eliminar este artículo permanentemente?")) {
                try {
                    const respuesta = await fetch(`http://localhost:3000/api/articulos/${id}`, {
                        method: 'DELETE'
                    });
                    
                    if(respuesta.ok) {
                        alert("✅ Artículo eliminado con éxito.");
                        cargarArticulosAdmin(); // Recargamos la listita
                    } else {
                        alert("❌ Error al eliminar el artículo.");
                    }
                } catch(error) {
                    alert("❌ Error de conexión con el servidor.");
                }
            }
        }
    
    // EL GUARDIA: Verificamos si hay alguien logeado
    if (!usuarioGuardado) {
        alert("Acceso denegado. Debes iniciar sesión.");
        window.location.href = 'login.html';
    } else {
        const usuario = JSON.parse(usuarioGuardado);
        
        // EL GUARDIA: Verificamos si es un administrador
        if (usuario.rol !== 'admin') {
            alert("Acceso denegado. Esta zona es solo para administradores.");
            window.location.href = 'index.html';
        } else {
            // Si pasó la seguridad, mostramos su nombre en la derecha
            document.getElementById('admin-nombre-display').innerText = "Operador: " + usuario.nombre;
        }

        // --- Lógica para enviar el artículo a la base de datos ---
        formPublicar.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const titulo = document.getElementById('post-titulo').value;
            const categoria_id = document.getElementById('post-categoria').value;
            const mensajePub = document.getElementById('mensaje-publicacion');
            
            // ¡NUEVO! Leemos el contenido desde el Mini-Word en lugar del textarea normal
            let contenidoHTML = "";
            if (typeof CKEDITOR !== 'undefined') {
                contenidoHTML = CKEDITOR.instances['post-contenido'].getData();
            } else {
                contenidoHTML = document.getElementById('post-contenido').value;
            }

            // Validación: Evitar publicar artículos vacíos
            if (contenidoHTML.trim() === "") {
                mensajePub.style.color = "red";
                mensajePub.innerText = "❌ El contenido del artículo no puede estar vacío.";
                return;
            }

            try {
                const respuesta = await fetch('http://localhost:3000/api/articulos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        titulo: titulo, 
                        contenido: contenidoHTML, // Enviamos el HTML formateado
                        categoria_id: parseInt(categoria_id), 
                        autor_id: usuario.id 
                    })
                });

                if (respuesta.ok) {
                    mensajePub.style.color = "green";
                    mensajePub.innerText = "✅ ¡Artículo publicado con éxito en la Base de Datos!";
                    
                    // Limpiamos el formulario y el Mini-Word
                    document.getElementById('post-titulo').value = "";
                    if (typeof CKEDITOR !== 'undefined') {
                        CKEDITOR.instances['post-contenido'].setData('');
                    }
                } else {
                    mensajePub.style.color = "red";
                    mensajePub.innerText = "❌ Hubo un error al guardar el artículo.";
                }
            } catch (error) {
                mensajePub.style.color = "red";
                mensajePub.innerText = "❌ Error de conexión con el servidor.";
            }
        });
    }
}

// --- LÓGICA DE LECTURA DE ARTÍCULO INDIVIDUAL ---
async function cargarArticuloCompleto() {
    const contenedorArticulo = document.getElementById('vista-articulo-completo');
    
    // Si no estamos en articulo.html, abortamos
    if (!contenedorArticulo) return;

    // Extraemos el ?id=X de la barra de direcciones del navegador
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        contenedorArticulo.innerHTML = `<div class="articulo"><h2>Error: Artículo no especificado.</h2></div>`;
        return;
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/articulos/${id}`);
        
        if (!respuesta.ok) throw new Error("No encontrado");
        
        const art = await respuesta.json();
        
        // Aquí SÍ inyectamos el art.contenido crudo, para que el navegador renderice las fotos y negritas
        contenedorArticulo.innerHTML = `
            <div class="articulo">
                <h1 style="font-size: 32px; border-bottom: 2px dashed #ccc; padding-bottom: 10px;">${art.titulo}</h1>
                <span class="categoria">${art.categoria}</span>
                <p class="autor-fecha" style="margin-top: 10px;">Escrito por <b>${art.autor}</b> el ${new Date(art.fecha_publicacion).toLocaleDateString()}</p>
                
                <div class="contenido-formateado" style="margin-top: 25px; font-size: 22px;">
                    ${art.contenido}
                </div>
            </div>
        `;
    } catch (error) {
        contenedorArticulo.innerHTML = `<div class="articulo"><h2 style="color: red;">Error 404: El artículo que buscas no existe o fue eliminado.</h2></div>`;
    }
}

cargarArticuloCompleto();

// Lógica de Gestión: Cargar y Banear Usuarios ---
        async function cargarUsuariosAdmin() {
            const listaUsuarios = document.getElementById('admin-lista-usuarios');
            if(!listaUsuarios) return;

            try {
                const respuesta = await fetch('http://localhost:3000/api/usuarios');
                const usuarios = await respuesta.json();
                
                listaUsuarios.innerHTML = ''; 
                
                usuarios.forEach(user => {
                    // Si está baneado, el botón dirá "Reactivar" (verde). Si está activo, dirá "Banear" (negro).
                    const esBaneado = user.estado === 'baneado';
                    const colorBoton = esBaneado ? '#4CAF50' : '#222';
                    const textoBoton = esBaneado ? '✅ Reactivar' : '🔨 Banear';
                    const nuevoEstado = esBaneado ? 'activo' : 'baneado';
                    const colorNombre = esBaneado ? 'red; text-decoration: line-through;' : 'black;';

                    listaUsuarios.innerHTML += `
                        <div style="border-bottom: 1px solid #ccc; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 18px; color: ${colorNombre}"><b>${user.nombre_usuario}</b> (${user.correo}) - Rol: ${user.rol || 'usuario'}</span>
                            <button onclick="cambiarEstadoUsuario(${user.id}, '${nuevoEstado}')" style="background: ${colorBoton}; color: white; border: 2px solid #000; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 10px;">${textoBoton}</button>
                        </div>
                    `;
                });
            } catch(error) {
                listaUsuarios.innerHTML = '<p style="color: red;">Error al cargar usuarios.</p>';
            }
        }

        cargarUsuariosAdmin(); // Ejecutamos la carga

        // Función global para el botón de banear/reactivar
        window.cambiarEstadoUsuario = async function(id, nuevoEstado) {
            if(confirm(`¿Seguro que quieres cambiar el estado de este usuario a ${nuevoEstado.toUpperCase()}?`)) {
                try {
                    const respuesta = await fetch(`http://localhost:3000/api/usuarios/${id}/estado`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: nuevoEstado })
                    });
                    
                    if(respuesta.ok) {
                        cargarUsuariosAdmin(); // Recargamos la lista visualmente
                    } else {
                        alert("❌ Error al actualizar el usuario.");
                    }
                } catch(error) {
                    alert("❌ Error de conexión.");
                }
            }
        }

        // --- Lógica de Gestión: Categorías Dinámicas (Mejorada) ---
        async function cargarCategorias() {
            const selectCategoria = document.getElementById('post-categoria');
            const listaCategoriasVisual = document.getElementById('admin-lista-categorias'); // La nueva caja

            if(!selectCategoria) return;

            try {
                const respuesta = await fetch('http://localhost:3000/api/categorias');
                const categorias = await respuesta.json();

                // 1. Llenamos el menú desplegable (como antes)
                selectCategoria.innerHTML = ''; 
                categorias.forEach(cat => {
                    selectCategoria.innerHTML += `<option value="${cat.id}">${cat.nombre_categoria}</option>`;
                });

                // 2. ¡NUEVO! Llenamos la lista visual con el botón de borrar
                if(listaCategoriasVisual) {
                    listaCategoriasVisual.innerHTML = '';
                    categorias.forEach(cat => {
                        listaCategoriasVisual.innerHTML += `
                            <div style="border-bottom: 1px solid #eee; padding: 5px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span>🏷️ ${cat.nombre_categoria}</span>
                                <button onclick="eliminarCategoria(${cat.id})" style="background: #d32f2f; color: white; border: 1px solid #b71c1c; cursor: pointer; font-size: 14px; padding: 2px 5px;">Borrar</button>
                            </div>
                        `;
                    });
                }

            } catch(error) {
                console.error("Error al cargar las categorías.");
                if(listaCategoriasVisual) listaCategoriasVisual.innerHTML = '<p style="color:red;">Error cargando lista.</p>';
            }
        }
        
        // Ejecutamos la carga al entrar
        cargarCategorias();

        // ¡NUEVA FUNCIÓN! El botón para borrar la categoría
        window.eliminarCategoria = async function(id) {
            if(confirm("¿Seguro que deseas eliminar esta categoría? Si tiene artículos, no podrás hacerlo.")) {
                try {
                    const respuesta = await fetch(`http://localhost:3000/api/categorias/${id}`, {
                        method: 'DELETE'
                    });
                    
                    if(respuesta.ok) {
                        cargarCategorias(); // Recargamos la lista y el menú desplegable
                    } else {
                        const mensajeError = await respuesta.text();
                        alert("❌ " + mensajeError);
                    }
                } catch(error) {
                    alert("❌ Error de conexión al intentar borrar.");
                }
            }
        }

        // Lógica para el botón de crear nueva categoría
        const formCategoria = document.getElementById('formulario-categoria');
        if(formCategoria) {
            formCategoria.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                const nombre_categoria = document.getElementById('nueva-categoria').value;
                const mensajeCat = document.getElementById('mensaje-categoria');

                try {
                    const respuesta = await fetch('http://localhost:3000/api/categorias', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre_categoria })
                    });

                    if(respuesta.ok) {
                        mensajeCat.style.color = "green";
                        mensajeCat.innerText = "✅ Categoría añadida exitosamente.";
                        document.getElementById('nueva-categoria').value = ""; // Limpiamos la cajita
                        
                        // ¡MAGIA! Recargamos el menú desplegable de arriba para que aparezca la nueva
                        cargarCategorias(); 
                    } else {
                        mensajeCat.style.color = "red";
                        mensajeCat.innerText = "❌ Error al añadir la categoría.";
                    }
                } catch(error) {
                    mensajeCat.style.color = "red";
                    mensajeCat.innerText = "❌ Error de conexión con el servidor.";
                }
            });
        }