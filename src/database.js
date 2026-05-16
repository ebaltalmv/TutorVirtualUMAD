const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta relativa del archivo de base de datos
const dbPath = path.resolve(__dirname, '../umad_tutor.db');

/**
 * <summary>
 * Inicializa la conexión con SQLite y crea las tablas de Usuarios y Chats si no existen.
 * La tabla Chats incluye chat_id para agrupar mensajes en conversaciones.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>2.0</version>
 * <modification>08/05/2026</modification>
 */
function inicializarBD() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error al conectar a la BD:", err.message);
        } else {
            console.log("Conectado a la base de datos SQL del Tutor UMAD.");

            db.run(`CREATE TABLE IF NOT EXISTS Usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                correo TEXT UNIQUE,
                password TEXT,
                carrera TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS Chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT,
                correo_usuario TEXT,
                titulo TEXT,
                pregunta TEXT,
                respuesta TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Migración: agregar columnas chat_id y titulo si la tabla ya existía sin ellas
            db.run(`ALTER TABLE Chats ADD COLUMN chat_id TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
            db.run(`ALTER TABLE Chats ADD COLUMN titulo TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
        }
    });
    return db;
}

const db = inicializarBD();

/**
 * <summary>
 * Registra un nuevo alumno en la base de datos tras validar sus datos en el servidor.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.0</version>
 * <modification>04/03/2026</modification>
 */
function registrarUsuario(nombre, correo, password, carrera) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO Usuarios (nombre, correo, password, carrera) VALUES (?, ?, ?, ?)`;
        db.run(query, [nombre, correo, password, carrera], function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, nombre, correo, carrera });
        });
    });
}

/**
 * <summary>
 * Valida las credenciales de un usuario para permitirle el inicio de sesión.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.0</version>
 * <modification>04/03/2026</modification>
 */
function validarLogin(correo, password) {
    return new Promise((resolve, reject) => {
        const query = `SELECT nombre, correo, carrera FROM Usuarios WHERE correo = ? AND password = ?`;
        db.get(query, [correo, password], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * <summary>
 * Inserta un nuevo registro en la tabla de Chats asociado al alumno y a un chat_id específico.
 * El título se genera a partir de la primera pregunta de la conversación.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>2.0</version>
 * <modification>08/05/2026</modification>
 */
function guardarChat(correo, pregunta, respuesta, chatId, titulo) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO Chats (chat_id, correo_usuario, titulo, pregunta, respuesta) VALUES (?, ?, ?, ?, ?)`;
        db.run(query, [chatId, correo, titulo, pregunta, respuesta], function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

/**
 * <summary>
 * Recupera el historial completo de preguntas y respuestas de un alumno desde SQLite.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.0</version>
 * <modification>04/03/2026</modification>
 */
function obtenerHistorial(correo) {
    return new Promise((resolve, reject) => {
        const query = `SELECT pregunta, respuesta, fecha FROM Chats WHERE correo_usuario = ? ORDER BY fecha ASC`;
        db.all(query, [correo], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * <summary>
 * Recupera la lista de conversaciones agrupadas por chat_id para un usuario.
 * Devuelve el título, chat_id, fecha del primer mensaje y cantidad de mensajes.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
function obtenerConversaciones(correo) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                chat_id,
                MIN(titulo) as titulo,
                MIN(fecha) as fecha_inicio,
                MAX(fecha) as fecha_ultimo,
                COUNT(*) as total_mensajes
            FROM Chats 
            WHERE correo_usuario = ? AND chat_id IS NOT NULL
            GROUP BY chat_id
            ORDER BY fecha_ultimo DESC
        `;
        db.all(query, [correo], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * <summary>
 * Recupera todos los mensajes de una conversación específica por su chat_id.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
function obtenerMensajesDeChat(chatId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT pregunta, respuesta, fecha FROM Chats WHERE chat_id = ? ORDER BY fecha ASC`;
        db.all(query, [chatId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * <summary>
 * Actualiza el nombre y/o carrera de un usuario existente.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
function actualizarUsuario(correo, nombre, carrera) {
    return new Promise((resolve, reject) => {
        const query = `UPDATE Usuarios SET nombre = ?, carrera = ? WHERE correo = ?`;
        db.run(query, [nombre, carrera, correo], function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

/**
 * <summary>
 * Cambia la contraseña de un usuario validando primero la contraseña actual.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
function cambiarPassword(correo, passwordActual, passwordNueva) {
    return new Promise((resolve, reject) => {
        const queryVerificar = `SELECT id FROM Usuarios WHERE correo = ? AND password = ?`;
        db.get(queryVerificar, [correo, passwordActual], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve({ success: false, error: "La contraseña actual es incorrecta." });

            const queryActualizar = `UPDATE Usuarios SET password = ? WHERE correo = ?`;
            db.run(queryActualizar, [passwordNueva, correo], function (err) {
                if (err) reject(err);
                else resolve({ success: true });
            });
        });
    });
}

/**
 * <summary>
 * Elimina un usuario y todos sus chats asociados de la base de datos.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>08/05/2026</date>
 * <version>1.0</version>
 * <modification>08/05/2026</modification>
 */
function eliminarUsuario(correo) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM Chats WHERE correo_usuario = ?`, [correo], (err) => {
            if (err) return reject(err);
            db.run(`DELETE FROM Usuarios WHERE correo = ?`, [correo], function (err) {
                if (err) reject(err);
                else resolve({ success: true, changes: this.changes });
            });
        });
    });
}

module.exports = {
    registrarUsuario,
    validarLogin,
    guardarChat,
    obtenerHistorial,
    obtenerConversaciones,
    obtenerMensajesDeChat,
    actualizarUsuario,
    cambiarPassword,
    eliminarUsuario
};