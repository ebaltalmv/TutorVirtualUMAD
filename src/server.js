const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { consultarTutorIA } = require('./gemini.js');
const {
    registrarUsuario,
    validarLogin,
    guardarChat,
    obtenerHistorial,
    obtenerConversaciones,
    obtenerMensajesDeChat,
    actualizarUsuario,
    cambiarPassword,
    eliminarUsuario
} = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

/**
 * <summary>
 * Endpoint para registrar un nuevo alumno, validando desde el backend el dominio institucional.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.1</version>
 * <modification>04/03/2026</modification>
 */
app.post('/api/registro', async (req, res) => {
    const { nombre, correo, password, carrera } = req.body;

    // Validación estricta de dominio del correo
    if (!correo.endsWith('@umad.edu.mx')) {
        return res.status(400).json({ error: "Solo se permiten correos institucionales @umad.edu.mx" });
    }

    try {
        const usuario = await registrarUsuario(nombre, correo, password, carrera);
        res.json({ success: true, usuario });
    } catch (error) {
        res.status(400).json({ error: "El correo ya está registrado o hubo un error." });
    }
});

/**
 * <summary>
 * Endpoint para iniciar sesión validando credenciales contra la base de datos local.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.0</version>
 * <modification>04/03/2026</modification>
 */
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;
    try {
        const usuario = await validarLogin(correo, password);
        if (usuario) {
            res.json({ success: true, usuario });
        } else {
            res.status(401).json({ error: "Credenciales incorrectas." });
        }
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor." });
    }
});

/**
 * <summary>
 * Recibe la duda del frontend, consulta la IA con el contexto del alumno y guarda el registro.
 * Ahora soporta chat_id para agrupar múltiples mensajes en una misma conversación.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>2.0</version>
 * <modification>08/05/2026</modification>
 */
app.post('/api/preguntar', async (req, res) => {
    const { pregunta, correo, carrera, chatId } = req.body;

    if (!pregunta || !correo || !carrera) {
        return res.status(400).json({ error: "Faltan datos de sesión o pregunta." });
    }

    try {
        const respuestaIA = await consultarTutorIA(pregunta, correo, carrera);

        // El título se genera recortando la pregunta original
        const titulo = pregunta.length > 40 ? pregunta.substring(0, 40) + '...' : pregunta;

        await guardarChat(correo, pregunta, respuestaIA, chatId || null, titulo);

        res.json({ respuesta: respuestaIA });
    } catch (error) {
        console.error("Error en /api/preguntar:", error);
        res.status(500).json({ error: "Error al procesar la pregunta." });
    }
});

/**
 * <summary>
 * Endpoint GET que recibe el correo por parámetro y devuelve el arreglo de chats históricos.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.0</version>
 * <modification>04/03/2026</modification>
 */
app.get('/api/historial/:correo', async (req, res) => {
    const correo = req.params.correo;
    try {
        const historial = await obtenerHistorial(correo);
        res.json({ success: true, historial });
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ error: "Error al recuperar el historial." });
    }
});

/**
 * <summary>
 * Devuelve la lista de conversaciones agrupadas por chat_id para un usuario.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
app.get('/api/conversaciones/:correo', async (req, res) => {
    const correo = req.params.correo;
    try {
        const conversaciones = await obtenerConversaciones(correo);
        res.json({ success: true, conversaciones });
    } catch (error) {
        console.error("Error al obtener conversaciones:", error);
        res.status(500).json({ error: "Error al recuperar las conversaciones." });
    }
});

/**
 * <summary>
 * Devuelve todos los mensajes de una conversación específica identificada por chatId.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
app.get('/api/chat/:chatId', async (req, res) => {
    const chatId = req.params.chatId;
    try {
        const mensajes = await obtenerMensajesDeChat(chatId);
        res.json({ success: true, mensajes });
    } catch (error) {
        console.error("Error al obtener mensajes del chat:", error);
        res.status(500).json({ error: "Error al recuperar los mensajes." });
    }
});

/**
 * <summary>
 * Actualiza el nombre y la carrera de un usuario existente.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
app.put('/api/usuario', async (req, res) => {
    const { correo, nombre, carrera } = req.body;
    if (!correo || !nombre || !carrera) {
        return res.status(400).json({ error: "Faltan datos para actualizar." });
    }
    try {
        await actualizarUsuario(correo, nombre, carrera);
        res.json({ success: true, usuario: { nombre, correo, carrera } });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: "Error al actualizar el perfil." });
    }
});

/**
 * <summary>
 * Cambia la contraseña del usuario verificando la contraseña actual.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
app.put('/api/usuario/password', async (req, res) => {
    const { correo, passwordActual, passwordNueva } = req.body;
    if (!correo || !passwordActual || !passwordNueva) {
        return res.status(400).json({ error: "Faltan datos para cambiar la contraseña." });
    }
    try {
        const resultado = await cambiarPassword(correo, passwordActual, passwordNueva);
        if (resultado.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: resultado.error });
        }
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ error: "Error al cambiar la contraseña." });
    }
});

/**
 * <summary>
 * Elimina un usuario y todo su historial de chats de la base de datos.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
app.delete('/api/usuario/:correo', async (req, res) => {
    const correo = req.params.correo;
    try {
        await eliminarUsuario(correo);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error al eliminar la cuenta." });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor UMAD corriendo en http://localhost:${PORT}`);
});
