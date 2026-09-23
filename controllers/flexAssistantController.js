// controllers/flexAssistantController.js
//
// NUEVO — "Flex", el asistente de IA real del panel del entrenador (antes
// era 100% mock en el frontend — ver src/views/FlexView.vue). Usa la API
// real de Anthropic (Claude) con tool-calling: Claude decide qué función
// real ejecutar (ver utils/flexTools.js) según lo que pida el entrenador,
// nosotros la ejecutamos de verdad contra la base de datos, y le
// regresamos el resultado para que arme la respuesta final.
//
// Todo queda acotado a req.user.mi_store (la empresa del entrenador
// dueño del token) — Flex nunca puede tocar datos de otro entrenador,
// ver los checks de pertenencia dentro de cada tool en utils/flexTools.js.
const Anthropic = require('@anthropic-ai/sdk');
const keys = require('../config/keys.js');
const User = require('../models/user.js');
const { TOOL_DEFINITIONS, executeTool } = require('../utils/flexTools.js');

const MAX_TOOL_TURNS = 6;
const MAX_TOOL_RESULT_CHARS = 8000;

function buildSystemPrompt(trainerName, companyName) {
    return `Eres Flex, el asistente de IA dentro del panel de administración de ${companyName || 'un negocio de entrenamiento'}. Hablas con ${trainerName || 'el entrenador'}, NO con un cliente final — tienes permiso de ejecutar acciones reales (crear/editar rutinas, recetas, asignar dietas, etc.) usando las herramientas disponibles, siempre a nombre de este entrenador y solo sobre sus propios datos.

Reglas:
- Si vas a crear o modificar algo (rutina, receta, ejercicio, dieta) y falta información clave (a qué cliente, cuántas semanas, qué ejercicios), pregúntale al entrenador antes de inventar datos.
- Antes de BORRAR algo (ejercicio, rutina), confirma con el entrenador en tu respuesta de texto salvo que ya haya sido explícito y claro en su mensaje.
- Usa list_clients/list_exercises/list_recipes/list_routines para resolver nombres a ids reales antes de actuar — nunca inventes un id.
- Cuando el entrenador pida algo "masivo" (ej. varias recetas para un cliente), usa assign_diet_to_client con el arreglo completo de recetas en una sola llamada.
- Responde siempre en español, de forma breve y directa, como lo haría un asistente competente por chat — no des explicaciones largas de más.
- Si una herramienta regresa un error (por ejemplo, que un cliente o rutina no pertenece a esta cuenta), explícaselo al entrenador con claridad, no lo intentes de nuevo con otro id inventado.`;
}

module.exports = {

    async chat(req, res) {
        try {
            if (!keys.anthropicApiKey) {
                return res.status(503).json({
                    success: false,
                    message: 'Flex todavía no está configurado — falta la clave de Anthropic (ANTHROPIC_API_KEY) en el servidor.'
                });
            }

            const { messages, message } = req.body;
            if (!message || !String(message).trim()) {
                return res.status(400).json({ success: false, message: 'Falta el mensaje.' });
            }
            if (!req.user.mi_store) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }

            const anthropic = new Anthropic({ apiKey: keys.anthropicApiKey });

            const company = await User.findCompanyById(req.user.mi_store).catch(() => null);
            const systemPrompt = buildSystemPrompt(req.user.name, company?.name);

            // Se simplifica el historial previo a turnos de texto plano —
            // Claude no necesita ver los bloques tool_use/tool_result
            // crudos de turnos ya resueltos, solo qué se dijo.
            const anthropicMessages = (Array.isArray(messages) ? messages : [])
                .filter((m) => m && m.content)
                .map((m) => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: String(m.content)
                }));
            anthropicMessages.push({ role: 'user', content: String(message) });

            const toolCallsForClient = [];
            let finalText = '';

            for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
                const response = await anthropic.messages.create({
                    model: keys.anthropicModel,
                    max_tokens: 2048,
                    system: systemPrompt,
                    tools: TOOL_DEFINITIONS,
                    messages: anthropicMessages
                });

                anthropicMessages.push({ role: 'assistant', content: response.content });

                const textBlocks = response.content.filter((b) => b.type === 'text');
                if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join('\n').trim();

                const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
                if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
                    break;
                }

                const toolResultContent = [];
                for (const block of toolUseBlocks) {
                    let payload;
                    try {
                        const result = await executeTool(block.name, block.input || {}, req);
                        payload = { ok: true, data: result };
                        toolCallsForClient.push({ tool: block.name, input: block.input, ok: true });
                    } catch (err) {
                        payload = { ok: false, error: err.message };
                        toolCallsForClient.push({ tool: block.name, input: block.input, ok: false, error: err.message });
                    }
                    let serialized = JSON.stringify(payload);
                    if (serialized.length > MAX_TOOL_RESULT_CHARS) {
                        serialized = serialized.slice(0, MAX_TOOL_RESULT_CHARS) + '... (resultado truncado)';
                    }
                    toolResultContent.push({ type: 'tool_result', tool_use_id: block.id, content: serialized });
                }
                anthropicMessages.push({ role: 'user', content: toolResultContent });
            }

            return res.status(200).json({
                success: true,
                data: { text: finalText || 'No tengo una respuesta para eso todavía.', toolCalls: toolCallsForClient }
            });
        } catch (error) {
            console.log(`Error en flexAssistantController.chat: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al conectar con Flex', error: error.message });
        }
    }

};
