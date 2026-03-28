// script.js - VERSIÓN ULTRA-PAGINADA (10 POR PÁGINA)

async function cargarArticulos(terminoBusqueda = "") {
    try {
        const contenedor = document.getElementById('columna-articulos');
        const controlesPaginacion = document.getElementById('paginacion-controles');

        // LOS ESCUDOS
        if (document.getElementById('formulario-publicar')) return;
        if (document.getElementById('formulario-perfil')) return;
        if (document.getElementById('tarjeta-perfil')) return;
        if (!contenedor) return;

        contenedor.innerHTML = '<p>Cargando artículos...</p>';

        // 1. OBTENEMOS LA PÁGINA ACTUAL DE LA URL
        const urlParams = new URLSearchParams(window.location.search);
        let paginaActual = parseInt(urlParams.get('pagina')) || 1;

        // 2. CONSTRUIMOS LA URL DEL SERVIDOR 
        let fetchUrl = `http://localhost:3000/api/articulos?pagina=${paginaActual}&buscar=${terminoBusqueda}`;

        const respuesta = await fetch(fetchUrl);

        // Seguro contra caídas del servidor
        if (!respuesta.ok) throw new Error("Error del servidor");

        const datos = await respuesta.json();

        const listaArticulos = datos.articulos;
        const infoPaginacion = datos.paginacion;

        contenedor.innerHTML = '';

        // 3. SI NO HAY RESULTADOS
        if (listaArticulos.length === 0) {
            let mensajeError = `No encontramos ningún artículo`;
            if (terminoBusqueda) mensajeError += ` que coincida con <b>"${terminoBusqueda}"</b>.`;

            contenedor.innerHTML = `
                <div class="articulo" style="text-align: center; padding: 30px;">
                    <h2 style="color: #d32f2f;">Sin resultados 😢</h2>
                    <p style="font-size: 22px;">${mensajeError}</p>
                    <button onclick="window.location.href='index.html'" style="margin-top: 15px; background: #388E3C; color: white; border: 2px solid #1B5E20; font-family: 'VT323'; font-size: 20px; cursor: pointer; padding: 5px 15px;">Ver todo</button>
                </div>`;
            if (controlesPaginacion) controlesPaginacion.style.display = 'none';
            return;
        }

        // 4. IMPRIMIMOS LOS ARTÍCULOS
        listaArticulos.forEach(art => {
            let textoPlano = art.contenido.replace(/<[^>]+>/g, '');
            let resumen = textoPlano.substring(0, 150) + '...';

            const html = `
                <div class="articulo">
                    <a href="articulo.html?id=${art.id}" style="text-decoration: none; color: inherit;">
                        <h2 style="color: #0000EE; text-decoration: underline;">${art.titulo}</h2>
                    </a>
                    <span class="categoria">${art.categoria}</span>
                    <p>${resumen}</p>
                    <p><a href="articulo.html?id=${art.id}" style="font-weight: bold; color: #d32f2f;">[Leer artículo completo]</a></p>
                    <p class="autor-fecha">Posteado por: <b><a href="perfil-publico.html?usuario=${art.autor}" style="color: #0000EE; text-decoration: underline;">${art.autor}</a></b> | ${new Date(art.fecha_publicacion).toLocaleDateString()}</p>
                </div>
            `;
            contenedor.innerHTML += html;
        });

        // 5. PINTAMOS LOS BOTONES DE PAGINACIÓN
        if (controlesPaginacion) {
            renderizarControlesPaginacion(infoPaginacion, terminoBusqueda);
        }

    } catch (error) {
        const contenedor = document.getElementById('columna-articulos');
        if (contenedor) contenedor.innerHTML = "<p style='color:red;'>Error: Se perdió la conexión con el servidor.</p>";
    }
}

// FUNCIONES DE PAGINACIÓN
function renderizarControlesPaginacion(info, terminoBusqueda) {
    const controles = document.getElementById('paginacion-controles');
    if (!controles) return;
    controles.innerHTML = '';

    if (info.totalPaginas <= 1) {
        controles.style.display = 'none';
        return;
    }

    controles.style.display = 'block';
    let htmlBotones = '';

    const btnAnteriorDisabled = info.paginaActual === 1 ? 'disabled style="background: #9e9e9e; border-color: #757575; cursor: not-allowed; color: #555;"' : '';
    htmlBotones += `<button onclick="cambiarPagina(${info.paginaActual - 1}, '${terminoBusqueda}')" ${btnAnteriorDisabled} class="btn-paginacion">⏪ Anterior</button>`;

    htmlBotones += `<span style="font-size: 20px; font-weight: bold; margin: 0 10px;">Página ${info.paginaActual} de ${info.totalPaginas}</span>`;

    const btnSiguienteDisabled = info.paginaActual === info.totalPaginas ? 'disabled style="background: #9e9e9e; border-color: #757575; cursor: not-allowed; color: #555;"' : '';
    htmlBotones += `<button onclick="cambiarPagina(${info.paginaActual + 1}, '${terminoBusqueda}')" ${btnSiguienteDisabled} class="btn-paginacion">Siguiente ⏩</button>`;

    controles.innerHTML = htmlBotones;
}

window.cambiarPagina = function (nuevaPagina, terminoBusqueda) {
    window.history.pushState({}, '', `index.html?pagina=${nuevaPagina}&buscar=${terminoBusqueda}`);
    cargarArticulos(terminoBusqueda);
    window.scrollTo(0, 0);
}

// Iniciar carga
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
        // Leemos la memoria del navegador
        const usuario = JSON.parse(usuarioGuardado);

        // ¡NUEVO! Detectamos si estamos en la página de perfil
        const esPaginaPerfil = window.location.pathname.includes('perfil.html');

        // Extraemos la foto (ahora apuntando a tu carpeta img/)
        const fotoUsuario = usuario.foto_perfil || 'img/steve.png';

        let htmlPerfil = ``;

        // Si NO estamos en el perfil, dibujamos la foto pequeña
        if (!esPaginaPerfil) {
            htmlPerfil += `
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="${fotoUsuario}" style="width: 80px; height: 80px; border: 3px solid #555; background: #fff; image-rendering: pixelated;">
            </div>`;
        }

        // Agregamos el nombre y el rango (esto siempre se ve)
        htmlPerfil += `
            <p style="margin-bottom: 5px;">Bienvenido, <b>${usuario.nombre}</b></p>
            <p style="margin-top: 0;">Rango: <span class="categoria" style="background: ${usuario.rol === 'admin' ? '#d32f2f' : '#388E3C'}">${usuario.rol.toUpperCase()}</span></p>
            <ul class="sidebar-links">
        `;

        // Si NO estamos en el perfil, mostramos el botón de Editar
        if (!esPaginaPerfil) {
            htmlPerfil += `<li><a href="perfil.html" style="color: #0000EE; font-weight: bold;">⚙️ Editar Mi Perfil</a></li>`;
        }

        // ¡EL BOTÓN SECRETO! Administradores y Escritores tienen acceso al Dashboard
        if (usuario.rol === 'admin') {
            htmlPerfil += `<li><a href="dashboard.html" style="color: #d32f2f; font-weight: bold;">🛠️ Panel de Admin</a></li>`;
        } else if (usuario.rol === 'escritor') {
            htmlPerfil += `<li><a href="dashboard.html" style="color: #388E3C; font-weight: bold;">✍️ Escribir Artículo</a></li>`;
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
        if (!listaAdmin) return;

        // ¡EL PARCHE! Rescatamos los datos del usuario directamente aquí
        const usuarioData = localStorage.getItem('usuarioLogeado');
        if (!usuarioData) return;
        const usuario = JSON.parse(usuarioData);

        try {
            const respuesta = await fetch('http://localhost:3000/api/articulos');
            const articulos = await respuesta.json();

            listaAdmin.innerHTML = ''; // Limpiamos la caja

            let articulosMostrados = 0; // Un contador para saber si pintamos algo en pantalla

            articulos.forEach(art => {
                // VERIFICACIÓN DE PERMISOS: ¿Soy admin o soy el creador de este artículo?
                const soyAdmin = usuario.rol === 'admin';
                const esMio = art.autor === usuario.nombre;

                // Si NO soy admin y NO es mi artículo, lo ignoramos y pasamos al siguiente
                if (!soyAdmin && !esMio) return;

                // Si pasamos el filtro, sumamos 1 al contador e imprimimos el artículo
                articulosMostrados++;

                listaAdmin.innerHTML += `
                        <div style="border-bottom: 1px solid #ccc; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 18px;"><b>${art.titulo}</b> <br><span style="color: #555; font-size: 16px;">(Autor: ${art.autor})</span></span>
                            <div style="display: flex; gap: 5px;">
                                <button onclick="prepararEdicion(${art.id})" style="background: #FF9800; color: white; border: 2px solid #E65100; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 10px;">✏️ Editar</button>
                                <button onclick="eliminarArticulo(${art.id})" style="background: #d32f2f; color: white; border: 2px solid #b71c1c; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 10px;">🗑️ Eliminar</button>
                            </div>
                        </div>
                    `;
            });

            // Si la lista terminó y el contador está en 0, mostramos un mensaje amigable
            if (articulosMostrados === 0) {
                listaAdmin.innerHTML = '<p style="color: #555; font-style: italic; font-size: 20px;">No tienes artículos publicados aún. ¡Anímate a escribir tu primera guía!</p>';
            }

        } catch (error) {
            listaAdmin.innerHTML = '<p style="color: red;">Error al cargar artículos.</p>';
        }
    }

    // Ejecutamos la carga al entrar al panel
    cargarArticulosAdmin();

    // Esta función debe ser "global" para que el botón HTML la encuentre
    window.eliminarArticulo = async function (id) {
        // Un pequeño popup de seguridad antes de borrar
        if (confirm("¿Estás seguro de que quieres eliminar este artículo permanentemente?")) {
            try {
                const respuesta = await fetch(`http://localhost:3000/api/articulos/${id}`, {
                    method: 'DELETE'
                });

                if (respuesta.ok) {
                    alert("✅ Artículo eliminado con éxito.");
                    cargarArticulosAdmin(); // Recargamos la listita
                } else {
                    alert("❌ Error al eliminar el artículo.");
                }
            } catch (error) {
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

        // 1. EL GUARDIA DE RANGOS
        if (usuario.rol !== 'admin' && usuario.rol !== 'escritor') {
            alert("Acceso denegado. Necesitas rango de Escritor o Administrador.");
            window.location.href = 'index.html';
        }

        // 2. IDENTIFICACIÓN EN PANTALLA (¡Esto repara el "Identificando..."!)
        const displayNombre = document.getElementById('admin-nombre-display');
        if (displayNombre) {
            displayNombre.innerHTML = `Operador: <b>${usuario.nombre}</b><br>Rol: <span style="color: ${usuario.rol === 'admin' ? '#d32f2f' : '#388E3C'}; font-weight: bold;">${usuario.rol.toUpperCase()}</span>`;
        }

        // 3. ADAPTACIÓN VISUAL Y SEGURIDAD PARA ESCRITORES
        if (usuario.rol === 'escritor') {
            // Cambiamos los títulos para que el escritor se sienta en su propio espacio
            const headerTitulo = document.querySelector('header h1');
            if (headerTitulo) headerTitulo.innerText = "✍️ PANEL DE ESCRITOR ✍️";

            const sidebarTitulo = document.querySelector('#columna-sidebar h3');
            if (sidebarTitulo) sidebarTitulo.innerText = "👤 Modo Escritor";

            // ¡SEGURIDAD! Ocultamos definitivamente la zona de Usuarios y Categorías
            const zonaAdmin = document.getElementById('zona-admin-exclusiva');
            if (zonaAdmin) zonaAdmin.style.display = 'none';
        }

        // --- Lógica para enviar el artículo a la base de datos ---
        // Variable global para saber si estamos creando (null) o editando (un ID)
        let articuloEnEdicionId = null;

        // --- ¡NUEVA FUNCIÓN! Preparar el formulario para editar ---
        window.prepararEdicion = async function (id) {
            try {
                const respuesta = await fetch(`http://localhost:3000/api/articulos/${id}`);
                const art = await respuesta.json();

                // 1. Rellenamos las cajas de texto con la info de la base de datos
                document.getElementById('post-titulo').value = art.titulo;
                document.getElementById('post-categoria').value = art.categoria_id;

                // Ponemos el texto en el Mini-Word
                if (typeof CKEDITOR !== 'undefined') {
                    CKEDITOR.instances['post-contenido'].setData(art.contenido);
                } else {
                    document.getElementById('post-contenido').value = art.contenido;
                }

                // 2. Cambiamos el estado del sistema a "Modo Edición"
                articuloEnEdicionId = art.id;

                // 3. Cambiamos el aspecto del botón y del título
                const botonForm = document.querySelector('#formulario-publicar button');
                botonForm.innerText = "💾 Actualizar Artículo";
                botonForm.style.background = "#FF9800";
                botonForm.style.borderColor = "#E65100";

                // Subimos la pantalla hacia arriba suavemente para que el usuario vea el formulario
                window.scrollTo({ top: 0, behavior: 'smooth' });

                document.getElementById('mensaje-publicacion').innerText = "Modo edición activado. Modifica y guarda.";
                document.getElementById('mensaje-publicacion').style.color = "#FF9800";

            } catch (error) {
                alert("❌ Error al intentar cargar el artículo para editar.");
            }
        };

        // --- Lógica mejorada para enviar el artículo (Sirve para Crear y Actualizar) ---
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
                mensajePub.innerText = "❌ El contenido no puede estar vacío.";
                return;
            }

            // DECISIÓN INTELIGENTE: ¿Es un POST (Crear) o un PUT (Actualizar)?
            const metodo = articuloEnEdicionId ? 'PUT' : 'POST';
            const url = articuloEnEdicionId
                ? `http://localhost:3000/api/articulos/${articuloEnEdicionId}`
                : 'http://localhost:3000/api/articulos';

            try {
                const respuesta = await fetch(url, {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        titulo: titulo,
                        contenido: contenidoHTML,
                        categoria_id: parseInt(categoria_id),
                        autor_id: usuario.id
                    })
                });

                if (respuesta.ok) {
                    mensajePub.style.color = "green";
                    mensajePub.innerText = articuloEnEdicionId ? "✅ ¡Artículo actualizado!" : "✅ ¡Artículo publicado!";

                    // Limpiamos todo y volvemos a la normalidad
                    document.getElementById('post-titulo').value = "";
                    if (typeof CKEDITOR !== 'undefined') CKEDITOR.instances['post-contenido'].setData('');

                    articuloEnEdicionId = null; // Salimos del modo edición

                    const botonForm = document.querySelector('#formulario-publicar button');
                    botonForm.innerText = "Publicar Artículo al Servidor";
                    botonForm.style.background = "#4CAF50";
                    botonForm.style.borderColor = "#388E3C";

                    // Recargamos la lista de abajo para ver los cambios
                    cargarArticulosAdmin();
                } else {
                    mensajePub.style.color = "red";
                    mensajePub.innerText = "❌ Hubo un error al guardar.";
                }
            } catch (error) {
                mensajePub.style.color = "red";
                mensajePub.innerText = "❌ Error de conexión con el servidor.";
            }
        });
    }
}

// --- LÓGICA DE LECTURA DE ARTÍCULO INDIVIDUAL Y COMENTARIOS ---
async function cargarArticuloCompleto() {
    const contenedorArticulo = document.getElementById('vista-articulo-completo');
    if (!contenedorArticulo) return;

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

        // Revisamos si hay alguien logeado para mostrarle la caja de escribir
        const usuarioGuardado = localStorage.getItem('usuarioLogeado');
        let formComentarioHTML = `<p style="color: #d32f2f; font-weight: bold;">Debes iniciar sesión para comentar.</p>`;

        if (usuarioGuardado) {
            formComentarioHTML = `
                <form id="formulario-comentario" style="margin-top: 15px;">
                    <textarea id="texto-comentario" rows="3" placeholder="Escribe tu comentario aquí..." required style="width: 100%; padding: 8px; font-family: 'VT323', monospace; font-size: 18px; resize: vertical; box-sizing: border-box;"></textarea>
                    <button type="submit" style="margin-top: 5px; background: #4CAF50; color: white; border: 2px solid #388E3C; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 15px;">Enviar Comentario</button>
                </form>
            `;
        }

        // Inyectamos el artículo Y la nueva estructura de comentarios debajo
        contenedorArticulo.innerHTML = `
            <div class="articulo">
                <h1 style="font-size: 32px; border-bottom: 2px dashed #ccc; padding-bottom: 10px;">${art.titulo}</h1>
                <span class="categoria">${art.categoria}</span>
                <p class="autor-fecha" style="margin-top: 10px;">Escrito por <b><a href="perfil-publico.html?usuario=${art.autor}" style="color: #0000EE; text-decoration: underline;">${art.autor}</a></b> el ${new Date(art.fecha_publicacion).toLocaleDateString()}</p>
                <div class="contenido-formateado" style="margin-top: 25px; font-size: 22px;">
                    ${art.contenido}
                </div>
            </div>

            <div class="articulo" style="background: #e0e0e0; margin-top: 20px;">
                <h3 style="border-bottom: 2px dashed #888; padding-bottom: 5px; margin-top: 0;">💬 Comentarios</h3>
                ${formComentarioHTML}
                <div id="lista-comentarios" style="margin-top: 20px;">
                    <p>Cargando comentarios...</p>
                </div>
            </div>
        `;

        // Activamos la carga de comentarios y el formulario
        cargarComentarios(id);
        activarFormularioComentario(id);

    } catch (error) {
        contenedorArticulo.innerHTML = `<div class="articulo"><h2 style="color: red;">Error 404: El artículo no existe.</h2></div>`;
    }
}

// Cargar la lista de comentarios
async function cargarComentarios(articuloId) {
    const lista = document.getElementById('lista-comentarios');
    if (!lista) return;

    const usuarioGuardado = localStorage.getItem('usuarioLogeado');
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const esAdmin = usuario && usuario.rol === 'admin';

    try {
        const respuesta = await fetch(`http://localhost:3000/api/articulos/${articuloId}/comentarios`);
        const comentarios = await respuesta.json();

        lista.innerHTML = '';

        if (comentarios.length === 0) {
            lista.innerHTML = '<p style="color: #666; font-style: italic;">Sé el primero en comentar.</p>';
            return;
        }

        comentarios.forEach(com => {
            // ¡NUEVA LÓGICA DE PERMISOS!
            // Verificamos si el usuario actual es el dueño exacto de este comentario
            const esMiComentario = usuario && usuario.nombre === com.autor;

            let botonBorrar = '';
            // El botón aparece SI eres admin O SI es tu propio comentario
            if (esAdmin || esMiComentario) {
                botonBorrar = `<button onclick="borrarComentario(${com.id}, ${articuloId})" style="float: right; background: #d32f2f; color: white; border: 1px solid #b71c1c; cursor: pointer; font-size: 14px; padding: 2px 5px;">🗑️ Borrar</button>`;
            }

            lista.innerHTML += `
                <div style="background: #fff; border: 1px solid #aaa; padding: 10px; margin-bottom: 10px;">
                    ${botonBorrar}
                    <p style="margin: 0; font-weight: bold;"><a href="perfil-publico.html?usuario=${com.autor}" style="color: #1B5E20; text-decoration: underline;">${com.autor}</a> <span style="color: #888; font-weight: normal; font-size: 16px;">- ${new Date(com.fecha_publicacion).toLocaleString()}</span></p>
                    <p style="margin: 5px 0 0 0; font-size: 20px;">${com.contenido}</p>
                </div>
            `;
        });
    } catch (error) {
        lista.innerHTML = '<p style="color: red;">Error al cargar comentarios.</p>';
    }
}

// Activar el botón de enviar
function activarFormularioComentario(articuloId) {
    const form = document.getElementById('formulario-comentario');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contenido = document.getElementById('texto-comentario').value;
        const usuario = JSON.parse(localStorage.getItem('usuarioLogeado'));

        try {
            const respuesta = await fetch('http://localhost:3000/api/comentarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articulo_id: parseInt(articuloId), autor_id: usuario.id, contenido: contenido })
            });

            if (respuesta.ok) {
                document.getElementById('texto-comentario').value = ''; // Limpiamos la caja
                cargarComentarios(articuloId); // Recargamos la lista
            } else {
                alert("Error al publicar el comentario.");
            }
        } catch (error) {
            alert("Error de conexión.");
        }
    });
}

// Función global para que el Admin borre comentarios
window.borrarComentario = async function (id, articuloId) {
    if (confirm("¿Seguro que deseas eliminar este comentario?")) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/comentarios/${id}`, { method: 'DELETE' });
            if (respuesta.ok) {
                cargarComentarios(articuloId); // Recargamos para que desaparezca
            } else {
                alert("Error al borrar.");
            }
        } catch (error) {
            alert("Error de conexión.");
        }
    }
}

// Ejecutamos la carga inicial (si estamos en articulo.html)
cargarArticuloCompleto();

// --- Lógica de Gestión: Cargar Usuarios con Checkboxes ---
async function cargarUsuariosAdmin() {
    const listaUsuarios = document.getElementById('admin-lista-usuarios');
    if (!listaUsuarios) return;

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
                            <div>
                                <input type="checkbox" class="chk-usuario" value="${user.id}" style="transform: scale(1.5); margin-right: 10px;">
                                <span style="font-size: 18px; color: ${colorNombre}"><b>${user.nombre_usuario}</b> (${user.correo}) - Rol: <b>${user.rol || 'usuario'}</b></span>
                            </div>
                            <button onclick="cambiarEstadoUsuario(${user.id}, '${nuevoEstado}')" style="background: ${colorBoton}; color: white; border: 2px solid #000; cursor: pointer; font-family: 'VT323'; font-size: 18px; padding: 5px 10px;">${textoBoton}</button>
                        </div>
                    `;
        });
    } catch (error) {
        listaUsuarios.innerHTML = '<p style="color: red;">Error al cargar usuarios.</p>';
    }
}

// ¡LA NUEVA FUNCIÓN MULTI-SELECCIÓN!
window.aplicarRolMasivo = async function () {
    // Buscamos todas las casillas que el administrador haya marcado
    const checkboxes = document.querySelectorAll('.chk-usuario:checked');
    const idsSeleccionados = Array.from(checkboxes).map(chk => chk.value);
    const nuevoRol = document.getElementById('select-rol-masivo').value;

    if (idsSeleccionados.length === 0) {
        alert("⚠️ Por favor, selecciona al menos un usuario de la lista.");
        return;
    }

    if (confirm(`¿Ascender a los ${idsSeleccionados.length} usuarios seleccionados al rol de ${nuevoRol.toUpperCase()}?`)) {
        try {
            const respuesta = await fetch('http://localhost:3000/api/usuarios/roles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsSeleccionados, nuevoRol: nuevoRol })
            });

            if (respuesta.ok) {
                alert("✅ Roles actualizados con éxito.");
                cargarUsuariosAdmin(); // Recargamos para ver los cambios
            } else {
                alert("❌ Hubo un error al aplicar los roles.");
            }
        } catch (error) {
            alert("❌ Error de conexión con el servidor.");
        }
    }
}

cargarUsuariosAdmin(); // Ejecutamos la carga

// Función global para el botón de banear/reactivar
window.cambiarEstadoUsuario = async function (id, nuevoEstado) {
    if (confirm(`¿Seguro que quieres cambiar el estado de este usuario a ${nuevoEstado.toUpperCase()}?`)) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/usuarios/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (respuesta.ok) {
                cargarUsuariosAdmin(); // Recargamos la lista visualmente
            } else {
                alert("❌ Error al actualizar el usuario.");
            }
        } catch (error) {
            alert("❌ Error de conexión.");
        }
    }
}

// --- Lógica de Gestión: Categorías Dinámicas (Mejorada) ---
async function cargarCategorias() {
    const selectCategoria = document.getElementById('post-categoria');
    const listaCategoriasVisual = document.getElementById('admin-lista-categorias'); // La nueva caja

    if (!selectCategoria) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/categorias');
        const categorias = await respuesta.json();

        // 1. Llenamos el menú desplegable (como antes)
        selectCategoria.innerHTML = '';
        categorias.forEach(cat => {
            selectCategoria.innerHTML += `<option value="${cat.id}">${cat.nombre_categoria}</option>`;
        });

        // 2. ¡NUEVO! Llenamos la lista visual con el botón de borrar
        if (listaCategoriasVisual) {
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

    } catch (error) {
        console.error("Error al cargar las categorías.");
        if (listaCategoriasVisual) listaCategoriasVisual.innerHTML = '<p style="color:red;">Error cargando lista.</p>';
    }
}

// Ejecutamos la carga al entrar
cargarCategorias();

// ¡NUEVA FUNCIÓN! El botón para borrar la categoría
window.eliminarCategoria = async function (id) {
    if (confirm("¿Seguro que deseas eliminar esta categoría? Si tiene artículos, no podrás hacerlo.")) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/categorias/${id}`, {
                method: 'DELETE'
            });

            if (respuesta.ok) {
                cargarCategorias(); // Recargamos la lista y el menú desplegable
            } else {
                const mensajeError = await respuesta.text();
                alert("❌ " + mensajeError);
            }
        } catch (error) {
            alert("❌ Error de conexión al intentar borrar.");
        }
    }
}

// Lógica para el botón de crear nueva categoría
const formCategoria = document.getElementById('formulario-categoria');
if (formCategoria) {
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

            if (respuesta.ok) {
                mensajeCat.style.color = "green";
                mensajeCat.innerText = "✅ Categoría añadida exitosamente.";
                document.getElementById('nueva-categoria').value = ""; // Limpiamos la cajita

                // ¡MAGIA! Recargamos el menú desplegable de arriba para que aparezca la nueva
                cargarCategorias();
            } else {
                mensajeCat.style.color = "red";
                mensajeCat.innerText = "❌ Error al añadir la categoría.";
            }
        } catch (error) {
            mensajeCat.style.color = "red";
            mensajeCat.innerText = "❌ Error de conexión con el servidor.";
        }
    });
}

// --- LÓGICA DEL BUSCADOR EN EL MENÚ PRINCIPAL ---
const btnBuscar = document.getElementById('btn-buscar');
const inputBusqueda = document.getElementById('input-busqueda');

if (btnBuscar && inputBusqueda) {
    // Buscar al hacer clic en el botón con el mouse
    btnBuscar.addEventListener('click', () => {
        const termino = inputBusqueda.value.trim();
        cargarArticulos(termino);
    });

    // Buscar automáticamente si el usuario presiona la tecla "Enter"
    inputBusqueda.addEventListener('keypress', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault(); // Evitamos que la página salte
            const termino = inputBusqueda.value.trim();
            cargarArticulos(termino);
        }
    });
}

// --- LÓGICA DE LA PÁGINA DE PERFIL (VERSIÓN SUBIDA DE ARCHIVO REAL) ---
const formPerfil = document.getElementById('formulario-perfil');

if (formPerfil) {
    const usuarioGuardado = localStorage.getItem('usuarioLogeado');

    if (!usuarioGuardado) {
        alert("Debes iniciar sesión para ver tu perfil.");
        window.location.href = 'login.html';
    } else {
        const usuario = JSON.parse(usuarioGuardado);

        // A. Carga inicial de datos
        document.getElementById('perfil-nombre').value = usuario.nombre;
        // ¡NUEVO! Cargamos la descripción
        document.getElementById('perfil-descripcion').value = usuario.descripcion || '';
        // Ahora cargamos la foto directamente de la base de datos (con la URL que nos de el backend)
        const fotoActual = usuario.foto_perfil || 'img/steve.png';

        // ¡OJO! Si la foto empieza con '/uploads/', debemos sumarle el servidor (localhost:3000)
        const urlFotoCompleta = fotoActual.startsWith('/uploads/') ? `http://localhost:3000${fotoActual}` : fotoActual;
        document.getElementById('preview-avatar').src = urlFotoCompleta;

        // B. Lógica del Botón y el Input de Archivo invisible
        const btnCambiarFoto = document.getElementById('btn-cambiar-foto');
        const inputArchivo = document.getElementById('input-foto-archivo');

        if (btnCambiarFoto && inputArchivo) {
            // 1. Al hacer clic en el botón naranja, "apretamos" el input invisible
            btnCambiarFoto.addEventListener('click', () => {
                inputArchivo.click();
            });

            // 2. Cuando el usuario selecciona un archivo en su PC
            inputArchivo.addEventListener('change', (evento) => {
                const archivo = evento.target.files[0];
                if (archivo) {
                    // Previsualizamos la imagen localmente antes de subirla
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        document.getElementById('preview-avatar').src = e.target.result;
                    };
                    reader.readAsDataURL(archivo);
                }
            });
        }

        // C. Al darle a "Guardar Cambios"
        formPerfil.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const nuevoNombre = document.getElementById('perfil-nombre').value;
            const nuevaContrasena = document.getElementById('perfil-contrasena').value;
            // ¡NUEVO! Capturamos lo que escribió en la caja
            const nuevaDescripcion = document.getElementById('perfil-descripcion').value;
            const mensaje = document.getElementById('mensaje-perfil');

            // ¡LA MAGIA! Creamos un objeto FormData en lugar de un JSON normal
            const datosEnviar = new FormData();
            datosEnviar.append('nombre_usuario', nuevoNombre);
            datosEnviar.append('nueva_contrasena', nuevaContrasena);
            datosEnviar.append('descripcion', nuevaDescripcion); // <-- ¡Añadimos esto al paquete!

            // Añadimos el archivo real si el usuario seleccionó uno
            if (inputArchivo.files[0]) {
                datosEnviar.append('foto', inputArchivo.files[0]);
            }

            try {
                mensaje.innerText = "Subiendo y guardando...";
                mensaje.style.color = "blue";

                // Enviamos el FormData. ¡NOTA IMPORTANTE! Fetch pone el Header 'multipart/form-data' automáticamente, no lo escribas tú.
                const respuesta = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}/perfil`, {
                    method: 'PUT',
                    body: datosEnviar // Enviamos el FormData directamente
                });

                if (respuesta.ok) {
                    const data = await respuesta.json(); // Obtenemos la respuesta JSON del servidor

                    mensaje.style.color = "green";
                    mensaje.innerText = "✅ Perfil actualizado con éxito.";

                    // Actualizamos la memoria del navegador con los nuevos datos
                    usuario.nombre = nuevoNombre;
                    usuario.descripcion = nuevaDescripcion; // <-- ¡Añadimos esto!

                    // Si el servidor nos devolvió una nueva URL de foto, la guardamos
                    if (data.nuevaFoto) {
                        usuario.foto_perfil = data.nuevaFoto;
                    }
                    localStorage.setItem('usuarioLogeado', JSON.stringify(usuario));

                    document.getElementById('perfil-contrasena').value = '';

                    // Recargamos el menú lateral para que la foto pequeña se actualice
                    verificarSesion();
                } else {
                    const errorText = await respuesta.text();
                    mensaje.style.color = "red";
                    mensaje.innerText = "❌ " + errorText;
                }
            } catch (error) {
                mensaje.style.color = "red";
                mensaje.innerText = "❌ Error de conexión con el servidor.";
            }
        });
    }
}

// --- LÓGICA DE LA PÁGINA DE PERFIL PÚBLICO (perfil-publico.html) ---
async function cargarPerfilPublico() {
    const tarjetaPerfil = document.getElementById('tarjeta-perfil');
    if (!tarjetaPerfil) return;

    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuarioURL = urlParams.get('usuario');

    if (!nombreUsuarioURL) {
        document.getElementById('mensaje-error-perfil').style.display = 'block';
        return;
    }

    try {
        // 1. CARGAMOS DATOS DEL PERFIL (Igual que antes)
        const respuesta = await fetch(`http://localhost:3000/api/usuarios/publico/${nombreUsuarioURL}`);
        if (!respuesta.ok) throw new Error("No encontrado");
        const perfil = await respuesta.json();

        const urlFotoCompleta = (perfil.foto_perfil && perfil.foto_perfil.startsWith('/uploads/'))
            ? `http://localhost:3000${perfil.foto_perfil}`
            : (perfil.foto_perfil || 'img/steve.png');

        document.getElementById('pub-foto').src = urlFotoCompleta;
        document.getElementById('pub-nombre').innerText = perfil.nombre_usuario;
        document.getElementById('pub-descripcion').innerText = perfil.descripcion || "Este usuario aún no ha escrito su biografía.";

        const spanRol = document.getElementById('pub-rol');
        spanRol.innerText = perfil.rol.toUpperCase();
        spanRol.style.background = perfil.rol === 'admin' ? '#d32f2f' : '#388E3C';

        // 2. ¡NUEVO! CARGAMOS ARTÍCULOS ESCRITOS POR EL USUARIO
        const listaArticulos = document.getElementById('lista-articulos-perfil');
        try {
            const resArticulos = await fetch(`http://localhost:3000/api/articulos/usuario/${nombreUsuarioURL}`);
            const articulos = await resArticulos.json();

            listaArticulos.innerHTML = ''; // Limpiamos "Cargando..."

            if (articulos.length === 0) {
                listaArticulos.innerHTML = '<p style="color: #555; font-style: italic;">Este usuario aún no ha publicado ninguna guía.</p>';
            } else {
                articulos.forEach(art => {
                    listaArticulos.innerHTML += `
                        <div style="border-bottom: 1px dashed #ccc; padding: 5px 0;">
                            <a href="articulo.html?id=${art.id}" style="color: #0000EE; font-size: 20px; font-weight: bold; text-decoration: underline;">
                                ${art.titulo}
                            </a>
                            <br><small style="color: #666;">Publicado el: ${new Date(art.fecha_publicacion).toLocaleDateString()}</small>
                        </div>
                    `;
                });
            }
        } catch (e) { listaArticulos.innerHTML = '<p style="color: red;">Error al cargar artículos.</p>'; }

        // Muestramos la tarjeta
        tarjetaPerfil.style.display = 'block';

        // 3. Lógica de Moderación (Solo para Administradores - Igual que antes)
        const usuarioGuardado = localStorage.getItem('usuarioLogeado');
        if (usuarioGuardado) {
            const miUsuario = JSON.parse(usuarioGuardado);
            if (miUsuario.rol === 'admin' && miUsuario.nombre !== perfil.nombre_usuario) {
                const zonaModeracion = document.getElementById('zona-moderacion');
                const btnBan = document.getElementById('btn-ban-publico');
                zonaModeracion.style.display = 'block';
                const esBaneado = perfil.estado === 'baneado';
                btnBan.innerText = esBaneado ? '✅ Reactivar Cuenta' : '🔨 Banear del Blog';
                btnBan.style.background = esBaneado ? '#4CAF50' : '#222';
                btnBan.addEventListener('click', async () => {
                    const nuevoEstado = esBaneado ? 'activo' : 'baneado';
                    if (confirm(`¿Seguro que quieres bamear/reactivar a ${perfil.nombre_usuario}?`)) {
                        try {
                            const resBan = await fetch(`http://localhost:3000/api/usuarios/${perfil.id}/estado`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ estado: nuevoEstado })
                            });
                            if (resBan.ok) location.reload();
                        } catch (e) { alert("Error de conexión."); }
                    }
                });
            }
        }
    } catch (error) { document.getElementById('mensaje-error-perfil').style.display = 'block'; }
}

cargarPerfilPublico();