const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Instancia principal de la API de Google
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Diccionario para almacenar el historial de chat en memoria por cada alumno activo
const sesionesActivas = new Map();

/**
 * <summary>
 * Construye dinámicamente el prompt del sistema dependiendo de la carrera seleccionada.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.1</version>
 * <modification>04/03/2026</modification>
 */
function generarPromptPorCarrera(carrera) {
    let instrucciones = `Eres un tutor experto en ${carrera} de la Universidad Madero (UMAD). Tus respuestas deben ser claras, académicas y dirigidas a estudiantes universitarios de esta disciplina. `;

    // Condición especial recordando el alcance principal del proyecto (Ingeniería de Software)
    if (carrera !== "Ingeniería de Software") {
        instrucciones += "IMPORTANTE: Recuérdale sutilmente al alumno al final de tu primera respuesta que el sistema se encuentra optimizado principalmente para Ingeniería de Software y esta función para su carrera está en fase experimental.";
    }

    return instrucciones;
}

/**
 * <summary>
 * Envía la pregunta del alumno a Gemini, inicializando un chat personalizado si no existe.
 * </summary>
 * <author>Emmanuel Baltazar López</author>
 * <date>04/03/2026</date>
 * <version>1.2</version>
 * <modification>04/03/2026</modification>
 */
async function consultarTutorIA(preguntaAlumno, correoAlumno, carreraAlumno) {
    try {
        let chatUsuario;

        // Validamos si el alumno ya tiene un chat activo en memoria
        if (!sesionesActivas.has(correoAlumno)) {
            const promptDinamico = generarPromptPorCarrera(carreraAlumno);
            const modelo = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: promptDinamico
            });
            chatUsuario = modelo.startChat();
            sesionesActivas.set(correoAlumno, chatUsuario);
        } else {
            // Recuperamos el hilo de la conversación para que recuerde el contexto
            chatUsuario = sesionesActivas.get(correoAlumno);
        }

        const result = await chatUsuario.sendMessage(preguntaAlumno);
        return result.response.text();

    } catch (error) {
        console.error("Error con Gemini:", error);
        return "Lo siento, hubo un problema de conexión con la IA. Intenta de nuevo.";
    }
}

module.exports = { consultarTutorIA };