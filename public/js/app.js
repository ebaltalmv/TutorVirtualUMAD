// Referencias a la interfaz de usuario
const inputPregunta = document.getElementById('input-pregunta');
const btnEnviar = document.getElementById('btn-enviar');
const areaChat = document.getElementById('area-chat');
const avatarImg = document.getElementById('avatar');
const toggleVoz = document.getElementById('toggle-voz');

// Variables de estado del sistema
// usuarioActual: Almacena los datos de la sesión actual (nombre, correo, carrera)
let usuarioActual = null;
// vozActivada: Determina si se reproducirá el audio a través de SpeechSynthesis
let vozActivada = true;
// procesando: Bandera para evitar múltiples envíos simultáneos
let procesando = false;
// chatIdActual: Identifica la conversación activa para agrupar mensajes
let chatIdActual = null;

// Configuración de Eventos UI
btnEnviar.addEventListener('click', procesarPregunta);
inputPregunta.addEventListener('keypress', (e) => { if (e.key === 'Enter') procesarPregunta(); });

toggleVoz.addEventListener('change', (e) => {
    vozActivada = e.target.checked;
    if (!vozActivada && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
});

/// <summary>
/// Genera un identificador único tipo UUID v4 para cada conversación.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function generarChatId() {
    return 'chat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/// <summary>
/// Oculta el panel de login y muestra el panel de registro de nuevo usuario.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function mostrarRegistro() {
    document.getElementById('panel-login').style.display = 'none';
    document.getElementById('panel-registro').style.display = 'block';
    document.getElementById('mensaje-auth').innerText = '';
}

/// <summary>
/// Oculta el panel de registro y muestra el panel de inicio de sesión.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function mostrarLogin() {
    document.getElementById('panel-registro').style.display = 'none';
    document.getElementById('panel-login').style.display = 'block';
    document.getElementById('mensaje-auth').innerText = '';
}

/// <summary>
/// Valida mediante Expresión Regular que el correo pertenezca al dominio de la UMAD.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function esCorreoValidoUMAD(correo) {
    const regex = /^[a-zA-Z0-9._%+-]+@umad\.edu\.mx$/;
    return regex.test(correo);
}

/// <summary>
/// Procesa el registro de un alumno conectándose a la base de datos local SQLite.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
async function registrar() {
    const nombre = document.getElementById('reg-nombre').value;
    const correo = document.getElementById('reg-correo').value;
    const password = document.getElementById('reg-pass').value;
    const carrera = document.getElementById('reg-carrera').value;

    if (!esCorreoValidoUMAD(correo)) {
        document.getElementById('mensaje-auth').innerText = "Debes usar un correo @umad.edu.mx";
        return;
    }
    if (!nombre || !password) {
        document.getElementById('mensaje-auth').innerText = "Llena todos los campos.";
        return;
    }

    try {
        const respuesta = await fetch('/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, password, carrera })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            iniciarAppChat({ nombre, correo, carrera });
        } else {
            document.getElementById('mensaje-auth').innerText = datos.error || "Error al registrar.";
        }
    } catch (error) {
        document.getElementById('mensaje-auth').innerText = "Error de conexión con el servidor.";
    }
}

/// <summary>
/// Inicia la sesión del usuario validando contra la API en el backend.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
async function iniciarSesion() {
    const correo = document.getElementById('login-correo').value;
    const password = document.getElementById('login-pass').value;

    if (!correo || !password) {
        document.getElementById('mensaje-auth').innerText = "Ingresa tus credenciales.";
        return;
    }

    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            iniciarAppChat(datos.usuario);
        } else {
            document.getElementById('mensaje-auth').innerText = datos.error || "Credenciales incorrectas.";
        }
    } catch (error) {
        document.getElementById('mensaje-auth').innerText = "Error de conexión con el servidor.";
    }
}

/// <summary>
/// Configura la UI para mostrar el panel principal y carga el historial automáticamente.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.1</version>
/// <modification>08/05/2026</modification>
function iniciarAppChat(usuario) {
    usuarioActual = usuario;
    document.getElementById('seccion-auth').style.display = 'none';
    document.getElementById('seccion-app').style.display = 'flex';

    document.getElementById('info-nombre').innerText = usuario.nombre;
    document.getElementById('info-carrera').innerText = usuario.carrera;

    nuevoChat(); // Genera la bienvenida en el chat principal
    cargarHistorialUI(); // Llena la barra lateral con chats anteriores
}

/// <summary>
/// Construye dinámicamente el mensaje de bienvenida y lo inyecta en el área principal.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function renderizarBienvenida() {
    areaChat.innerHTML = `
        <div id="pantalla-bienvenida" class="pantalla-bienvenida">
            <h1 class="saludo-gradiente" id="saludo-dinamico">✨ Hola, ${usuarioActual ? usuarioActual.nombre : ''}.</h1>
            <h2 class="subtitulo-bienvenida">¿En qué te puedo ayudar hoy?</h2>
            
            <div class="chips-container">
                <button class="chip" onclick="usarSugerencia('Explícame un concepto clave de mi carrera')">💡 Explicar concepto clave</button>
                <button class="chip" onclick="usarSugerencia('Ayúdame a organizar mi plan de estudio para exámenes')">📅 Organizar plan de estudio</button>
                <button class="chip" onclick="usarSugerencia('¿Cuáles son las áreas de especialización de mi carrera?')">🎯 Áreas de especialización</button>
                <button class="chip" onclick="usarSugerencia('Dame un ejercicio de práctica nivel intermedio')">✍️ Ejercicio de práctica</button>
            </div>
        </div>
    `;
}

/// <summary>
/// Llena el input con la sugerencia seleccionada del chip y ejecuta la consulta.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function usarSugerencia(texto) {
    inputPregunta.value = texto;
    procesarPregunta();
}

/// <summary>
/// Limpia el área de chat, genera un nuevo chatId y devuelve la pantalla de bienvenida.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>2.0</version>
/// <modification>08/05/2026</modification>
function nuevoChat() {
    chatIdActual = generarChatId();
    renderizarBienvenida();
    // Asegurar que estamos viendo el chat, no la cuenta
    mostrarVistaChat();
}

/// <summary>
/// Envía la pregunta al backend con el chatId activo para agrupar mensajes.
/// Múltiples preguntas en el mismo chat se almacenan bajo el mismo chatId.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>2.0</version>
/// <modification>08/05/2026</modification>
async function procesarPregunta() {
    const pregunta = inputPregunta.value.trim();
    if (!pregunta || procesando) return;

    procesando = true;
    inputPregunta.value = '';
    btnEnviar.disabled = true;

    // Si estamos en la pantalla de bienvenida, limpiarla para empezar el chat
    const bienvenida = document.getElementById('pantalla-bienvenida');
    if (bienvenida) {
        areaChat.innerHTML = '';
    }

    agregarMensajeAlChat(pregunta, 'usuario');
    const idCarga = agregarMensajeAlChat("Pensando...", 'bot');

    try {
        const respuestaServidor = await fetch('/api/preguntar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pregunta,
                correo: usuarioActual.correo,
                carrera: usuarioActual.carrera,
                chatId: chatIdActual
            })
        });
        const datos = await respuestaServidor.json();

        const elementoCarga = document.getElementById(idCarga);
        if (elementoCarga) elementoCarga.remove();

        if (datos.respuesta) {
            agregarMensajeAlChat(datos.respuesta, 'bot');
            hablar(datos.respuesta);
            cargarHistorialUI(); // Refrescar la lista lateral con el nuevo chat
        } else {
            agregarMensajeAlChat("Lo siento, hubo un problema procesando la respuesta.", 'bot');
        }

    } catch (error) {
        console.error(error);
        const elementoCarga = document.getElementById(idCarga);
        if (elementoCarga) {
            elementoCarga.innerText = "Error al consultar la IA.";
        } else {
            agregarMensajeAlChat("Error al consultar la IA.", 'bot');
        }
    } finally {
        procesando = false;
        btnEnviar.disabled = false;
        inputPregunta.focus();
    }
}

/// <summary>
/// Inserta un globo de texto procesando Markdown si es el bot, y hace scroll automático.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.1</version>
/// <modification>26/03/2026</modification>
function agregarMensajeAlChat(texto, remitente) {
    const div = document.createElement('div');
    div.classList.add('mensaje', remitente);

    if (remitente === 'bot' && texto !== "Pensando...") {
        if (typeof marked !== 'undefined') {
            div.innerHTML = marked.parse(texto);
        } else {
            div.innerText = texto;
        }
    } else {
        div.innerText = texto;
    }

    areaChat.appendChild(div);
    areaChat.scrollTop = areaChat.scrollHeight;
    const id = 'msg-' + Date.now();
    div.id = id;
    return id;
}

/// <summary>
/// Consulta la BD y genera botones en la barra lateral con conversaciones agrupadas por chatId.
/// Cada entrada muestra el título de la conversación y la cantidad de mensajes.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>2.0</version>
/// <modification>08/05/2026</modification>
async function cargarHistorialUI() {
    if (!usuarioActual) return;

    try {
        const respuesta = await fetch(`/api/conversaciones/${usuarioActual.correo}`);
        const datos = await respuesta.json();
        const listaSidebar = document.getElementById('lista-historial-sidebar');
        listaSidebar.innerHTML = '';

        if (datos.success && datos.conversaciones && datos.conversaciones.length > 0) {
            datos.conversaciones.forEach(conv => {
                const btnChat = document.createElement('button');
                btnChat.className = 'historial-item-btn';
                if (conv.chat_id === chatIdActual) {
                    btnChat.classList.add('active');
                }

                // Título del chat con indicador de cantidad de mensajes
                let tituloCorto = conv.titulo || 'Chat sin título';
                if (tituloCorto.length > 25) tituloCorto = tituloCorto.substring(0, 25) + '...';
                btnChat.innerHTML = `💬 ${tituloCorto} <span class="historial-msg-count">(${conv.total_mensajes})</span>`;

                // Al hacer clic, carga todos los mensajes de esta conversación
                btnChat.onclick = () => cargarConversacion(conv.chat_id);

                listaSidebar.appendChild(btnChat);
            });
        } else {
            listaSidebar.innerHTML = '<p style="color:#aaa; font-size:0.8em;">No hay chats recientes.</p>';
        }
    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

/// <summary>
/// Carga todos los mensajes de una conversación específica por su chatId en el área central.
/// Permite continuar la conversación añadiendo más mensajes al mismo chatId.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
async function cargarConversacion(chatId) {
    try {
        const respuesta = await fetch(`/api/chat/${chatId}`);
        const datos = await respuesta.json();

        if (datos.success && datos.mensajes) {
            // Actualizar el chatId activo para que nuevas preguntas se añadan aquí
            chatIdActual = chatId;
            areaChat.innerHTML = '';

            // Asegurar que estamos viendo el chat, no la cuenta
            mostrarVistaChat();

            const separador = document.createElement('div');
            separador.className = 'mensaje-sistema';
            separador.innerText = '--- Conversación Guardada ---';
            areaChat.appendChild(separador);

            // Renderizar todos los mensajes de la conversación
            datos.mensajes.forEach(msg => {
                agregarMensajeAlChat(msg.pregunta, 'usuario');
                agregarMensajeAlChat(msg.respuesta, 'bot');
            });

            // Actualizar estado activo en sidebar
            cargarHistorialUI();
        }
    } catch (error) {
        console.error("Error cargando conversación:", error);
    }
}

/// <summary>
/// Limpia la pantalla actual y muestra un hilo de conversación del historial (compatibilidad legacy).
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.0</version>
/// <modification>26/03/2026</modification>
function mostrarChatHistorico(chatDatos) {
    areaChat.innerHTML = ''; // Elimina bienvenida o chat actual

    const separador = document.createElement('div');
    separador.className = 'mensaje-sistema';
    separador.innerText = '--- Visualizando Sesión Guardada ---';
    areaChat.appendChild(separador);

    agregarMensajeAlChat(chatDatos.pregunta, 'usuario');
    agregarMensajeAlChat(chatDatos.respuesta, 'bot');
}

/// <summary>
/// Utiliza Web Speech API para lectura de respuesta, controlando la animación del avatar superior.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>19/03/2026</date>
/// <version>1.1</version>
/// <modification>26/03/2026</modification>
function hablar(texto) {
    if (!vozActivada) return;
    if ('speechSynthesis' in window) {
        // Limpia el texto de marcas Markdown para mejorar la lectura sintética
        const textoLimpio = texto.replace(/[*#_`>]/g, '');
        const utterance = new SpeechSynthesisUtterance(textoLimpio);
        utterance.lang = 'es-MX';
        utterance.rate = 1.0;

        // Animación del avatar (Rutas relativas a tu carpeta local 'assets')
        utterance.onstart = () => { avatarImg.src = 'assets/boca_abierta.png'; };
        utterance.onend = () => { avatarImg.src = 'assets/boca_cerrada.png'; };
        utterance.onerror = () => { avatarImg.src = 'assets/boca_cerrada.png'; };

        window.speechSynthesis.speak(utterance);
    }
}

// ============================================
// FUNCIONES DE GESTIÓN DE CUENTA
// ============================================

/// <summary>
/// Muestra la sección de gestión de cuenta y oculta el chat principal.
/// Precarga los datos del usuario actual en los campos del formulario.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function mostrarCuenta() {
    document.getElementById('main-chat').style.display = 'none';
    document.getElementById('seccion-cuenta').style.display = 'flex';

    // Rellenar campos con datos actuales
    document.getElementById('cuenta-correo').value = usuarioActual.correo;
    document.getElementById('cuenta-nombre').value = usuarioActual.nombre;
    document.getElementById('cuenta-carrera').value = usuarioActual.carrera;

    // Avatar con inicial del nombre
    const inicial = usuarioActual.nombre ? usuarioActual.nombre.charAt(0).toUpperCase() : 'U';
    document.getElementById('cuenta-avatar-inicial').innerText = inicial;

    // Limpiar campos de contraseña
    document.getElementById('cuenta-pass-actual').value = '';
    document.getElementById('cuenta-pass-nueva').value = '';
    document.getElementById('cuenta-pass-confirmar').value = '';

    // Limpiar mensajes de retroalimentación
    document.getElementById('msg-perfil').innerText = '';
    document.getElementById('msg-password').innerText = '';
}

/// <summary>
/// Oculta la sección de cuenta y vuelve a mostrar el chat principal.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function volverAlChat() {
    document.getElementById('seccion-cuenta').style.display = 'none';
    document.getElementById('main-chat').style.display = 'flex';
}

/// <summary>
/// Muestra la vista del chat asegurándose de ocultar la cuenta si está visible.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function mostrarVistaChat() {
    document.getElementById('seccion-cuenta').style.display = 'none';
    document.getElementById('main-chat').style.display = 'flex';
}

/// <summary>
/// Envía los datos actualizados del perfil al servidor y actualiza la UI.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
async function actualizarPerfil() {
    const nombre = document.getElementById('cuenta-nombre').value.trim();
    const carrera = document.getElementById('cuenta-carrera').value;
    const msgEl = document.getElementById('msg-perfil');

    if (!nombre) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'El nombre no puede estar vacío.';
        return;
    }

    try {
        const respuesta = await fetch('/api/usuario', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: usuarioActual.correo, nombre, carrera })
        });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.success) {
            // Actualizar datos en memoria
            usuarioActual.nombre = nombre;
            usuarioActual.carrera = carrera;

            // Actualizar la UI de la sidebar
            document.getElementById('info-nombre').innerText = nombre;
            document.getElementById('info-carrera').innerText = carrera;

            // Actualizar avatar
            document.getElementById('cuenta-avatar-inicial').innerText = nombre.charAt(0).toUpperCase();

            msgEl.className = 'cuenta-mensaje exito';
            msgEl.innerText = '✅ Perfil actualizado correctamente.';
        } else {
            msgEl.className = 'cuenta-mensaje error';
            msgEl.innerText = datos.error || 'Error al actualizar el perfil.';
        }
    } catch (error) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'Error de conexión con el servidor.';
    }

    // Limpiar mensaje después de 4 segundos
    setTimeout(() => { msgEl.innerText = ''; }, 4000);
}

/// <summary>
/// Cambia la contraseña del usuario validando que las contraseñas coincidan.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
async function cambiarPasswordCuenta() {
    const passActual = document.getElementById('cuenta-pass-actual').value;
    const passNueva = document.getElementById('cuenta-pass-nueva').value;
    const passConfirmar = document.getElementById('cuenta-pass-confirmar').value;
    const msgEl = document.getElementById('msg-password');

    if (!passActual || !passNueva || !passConfirmar) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'Completa todos los campos de contraseña.';
        return;
    }

    if (passNueva !== passConfirmar) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'Las contraseñas nuevas no coinciden.';
        return;
    }

    if (passNueva.length < 4) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'La contraseña debe tener al menos 4 caracteres.';
        return;
    }

    try {
        const respuesta = await fetch('/api/usuario/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo: usuarioActual.correo,
                passwordActual: passActual,
                passwordNueva: passNueva
            })
        });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.success) {
            msgEl.className = 'cuenta-mensaje exito';
            msgEl.innerText = '✅ Contraseña cambiada correctamente.';

            // Limpiar campos
            document.getElementById('cuenta-pass-actual').value = '';
            document.getElementById('cuenta-pass-nueva').value = '';
            document.getElementById('cuenta-pass-confirmar').value = '';
        } else {
            msgEl.className = 'cuenta-mensaje error';
            msgEl.innerText = datos.error || 'Error al cambiar la contraseña.';
        }
    } catch (error) {
        msgEl.className = 'cuenta-mensaje error';
        msgEl.innerText = 'Error de conexión con el servidor.';
    }

    setTimeout(() => { msgEl.innerText = ''; }, 4000);
}

/// <summary>
/// Cierra la sesión del usuario y recarga la página para volver al login.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function cerrarSesion() {
    usuarioActual = null;
    chatIdActual = null;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    location.reload();
}

/// <summary>
/// Muestra el modal de confirmación para eliminar la cuenta permanentemente.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function confirmarEliminarCuenta() {
    document.getElementById('modal-eliminar').classList.add('visible');
}

/// <summary>
/// Cierra el modal de confirmación de eliminación de cuenta.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
function cerrarModalEliminar() {
    document.getElementById('modal-eliminar').classList.remove('visible');
}

/// <summary>
/// Elimina la cuenta del usuario y todos sus datos del servidor, luego recarga la página.
/// </summary>
/// <author>Emmanuel Baltazar López</author>
/// <date>08/05/2026</date>
/// <version>1.0</version>
/// <modification>08/05/2026</modification>
async function eliminarCuenta() {
    try {
        const respuesta = await fetch(`/api/usuario/${usuarioActual.correo}`, {
            method: 'DELETE'
        });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.success) {
            alert('Tu cuenta ha sido eliminada exitosamente.');
            cerrarSesion();
        } else {
            alert(datos.error || 'Error al eliminar la cuenta.');
            cerrarModalEliminar();
        }
    } catch (error) {
        alert('Error de conexión con el servidor.');
        cerrarModalEliminar();
    }
}