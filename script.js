// script.js
async function cargarArticulos() {
    try {
        const respuesta = await fetch('https://potential-invention-r4qj7rvwp9c97p-3000.app.github.dev/api/articulos'); //En caso de ejecutar esta linea localmente, copiar y pegar lo siguiente: https://localhost:3000/api/articulos 
        const articulos = await respuesta.json();
        
        const contenedor = document.getElementById('columna-articulos');
        contenedor.innerHTML = ''; 

        articulos.forEach(art => {
            const html = `
                <div class="articulo">
                    <h2>${art.titulo}</h2>
                    <span class="categoria">${art.categoria}</span>
                    <p>${art.contenido}</p>
                    <p class="autor-fecha">Posteado por: <b>${art.autor}</b> | ${new Date(art.fecha_publicacion).toLocaleDateString()}</p>
                </div>
            `;
            contenedor.innerHTML += html;
        });

    } catch (error) {
        document.getElementById('columna-articulos').innerHTML = "<p>Error: Se perdió la conexión con el servidor.</p>";
    }
}

cargarArticulos();