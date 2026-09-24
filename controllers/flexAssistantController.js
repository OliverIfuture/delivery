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
const Exercise = require('../models/exercise.js');
const { TOOL_DEFINITIONS, executeTool } = require('../utils/flexTools.js');

const MAX_TOOL_TURNS = 6;
const MAX_TOOL_RESULT_CHARS = 8000;

// Mismo reparto de días que antes usaba el generador ficticio del
// frontend (useAiPlanGenerator.js) — para que un plan de 3 días caiga en
// Lun/Mié/Vie en vez de Lun/Mar/Mié, por ejemplo.
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
function weekdaysForCount(n) {
    const spaced = { 1: ['Lunes'], 2: ['Lunes', 'Jueves'], 3: ['Lunes', 'Miércoles', 'Viernes'], 4: ['Lunes', 'Martes', 'Jueves', 'Viernes'] };
    return spaced[n] || DAYS.slice(0, n);
}

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
    },

    // NUEVO — genera un plan de entrenamiento real con Claude a partir del
    // formulario "Crear plan con IA" (ver AiTrainingPlanModal.vue, antes
    // 100% ficticio con useAiPlanGenerator.js). A diferencia de chat(), acá
    // se fuerza tool_choice para que Claude devuelva SIEMPRE la estructura
    // exacta que pedimos (nada de parsear texto libre), y solo puede
    // referenciar ejercicios reales de esta cuenta (Exercise.findByCompany)
    // por id — nunca inventa ejercicios nuevos, así el plan resultante
    // siempre tiene miniaturas/videos reales para el editor de Plantillas.
    async generateTrainingPlan(req, res) {
        try {
            if (!keys.anthropicApiKey) {
                return res.status(503).json({
                    success: false,
                    message: 'La generación con IA todavía no está configurada — falta ANTHROPIC_API_KEY en el servidor.'
                });
            }

            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }

            const { clientName, days, objetivo, nivel, zona, equipo, lesiones, notas, freeText } = req.body;
            const dayCount = Math.min(7, Math.max(1, parseInt(days, 10) || 4));
            const assignedDays = weekdaysForCount(dayCount);

            const catalog = await Exercise.findByCompany(id_company);
            if (!catalog.length) {
                return res.status(422).json({ success: false, message: 'Todavía no tienes ejercicios en tu catálogo — agrega algunos en "Ejercicios" antes de generar un plan con IA.' });
            }
            const catalogById = new Map(catalog.map(e => [Number(e.id), e]));
            // Solo mandamos lo necesario para elegir (id/nombre/grupo/equipo) —
            // las descripciones largas no ayudan a Claude a elegir y gastan tokens.
            const catalogForPrompt = catalog.map(e => ({ id: Number(e.id), name: e.name, muscle_group: e.muscle_group, equipment: e.equipment || '' }));

            const anthropic = new Anthropic({ apiKey: keys.anthropicApiKey });

            const systemPrompt = `Eres un entrenador experto diseñando un plan de entrenamiento para ${clientName || 'un cliente'}. Debes usar EXCLUSIVAMENTE ejercicios de la lista de catálogo que te doy (por su "id" exacto) — nunca inventes un ejercicio ni un id que no esté en la lista. Distribuye los grupos musculares de forma sensata entre los días (evita repetir el mismo grupo dominante en días consecutivos si el objetivo no es full body). Ajusta series/reps/descanso según el objetivo y nivel. Si el cliente tiene lesiones o limitaciones, evita ejercicios claramente riesgosos para eso y dilo en la nota del ejercicio afectado.`;

            const userPrompt = `Genera UNA semana de plan (se repetirá o ajustará después) con estos datos:
- Días de entrenamiento: ${dayCount} (usa exactamente estos días de la semana, uno por cada día de entrenamiento: ${assignedDays.join(', ')})
- Objetivo: ${objetivo || 'no especificado'}
- Nivel: ${nivel || 'no especificado'}
- Zona de énfasis: ${zona || 'ninguna en particular'}
- Equipo disponible: ${equipo || 'equipo estándar de gimnasio'}
- Lesiones o limitaciones: ${lesiones || 'ninguna reportada'}
- Notas del entrenador: ${notas || 'ninguna'}
- Instrucción libre adicional: ${freeText || 'ninguna'}

Catálogo de ejercicios disponibles (usa solo estos ids):
${JSON.stringify(catalogForPrompt)}`;

            const planTool = {
                name: 'generate_plan',
                description: 'Entrega el plan de entrenamiento generado con la estructura exacta pedida.',
                input_schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Nombre corto y natural del plan (nada de "Plan IA"), ej. "Hipertrofia Total – 4 Días"' },
                        general_note: { type: 'string', description: 'Resumen breve del enfoque del plan y adaptaciones por lesión, si aplica.' },
                        rest_default: { type: 'integer', description: 'Segundos de descanso por defecto entre series' },
                        days: {
                            type: 'array',
                            minItems: dayCount,
                            maxItems: dayCount,
                            items: {
                                type: 'object',
                                properties: {
                                    weekday: { type: 'string', enum: assignedDays },
                                    day_name: { type: 'string', description: 'Título del día, ej. "Pierna: Cuádriceps y Glúteo"' },
                                    exercises: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                exercise_id: { type: 'integer', description: 'Debe existir en el catálogo dado.' },
                                                sets: { type: 'integer' },
                                                reps: { type: 'string', description: 'Ej. "8-12". Vacío si el ejercicio es por tiempo.' },
                                                rest_seconds: { type: 'string' },
                                                time_seconds: { type: 'string', description: 'Solo para ejercicios de cardio/tiempo (ej. caminadora, bici).' },
                                                note: { type: 'string' }
                                            },
                                            required: ['exercise_id', 'sets']
                                        }
                                    }
                                },
                                required: ['weekday', 'day_name', 'exercises']
                            }
                        }
                    },
                    required: ['name', 'days']
                }
            };

            const response = await anthropic.messages.create({
                model: keys.anthropicModel,
                max_tokens: 4096,
                system: systemPrompt,
                tools: [planTool],
                tool_choice: { type: 'tool', name: 'generate_plan' },
                messages: [{ role: 'user', content: userPrompt }]
            });

            const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_plan');
            if (!toolUse) {
                return res.status(501).json({ success: false, message: 'La IA no devolvió un plan válido, intenta de nuevo.' });
            }
            const raw = toolUse.input;

            // Traducimos los ids a los ejercicios reales completos (con
            // media/thumbnail) y armamos el mapa por día de la semana que
            // espera el frontend (PlantillasView.vue arma el resto: id,
            // clientId, duplicar semanas, etc.).
            const daysMap = {};
            for (const d of (raw.days || [])) {
                const exercises = (d.exercises || [])
                    .map(ex => {
                        const catEx = catalogById.get(Number(ex.exercise_id));
                        if (!catEx) return null;
                        const byTime = catEx.muscle_group === 'Cardio';
                        const setCount = Math.min(6, Math.max(1, parseInt(ex.sets, 10) || 3));
                        return {
                            id: String(catEx.id),
                            name: catEx.name,
                            muscleGroup: catEx.muscle_group,
                            byTime,
                            mediaUrl: catEx.media_url || '',
                            thumbnail_url: catEx.thumbnail_url || '',
                            description: catEx.description || '',
                            notes: '',
                            sets: Array.from({ length: setCount }, () => ({
                                reps: byTime ? '' : (ex.reps || ''),
                                rest: ex.rest_seconds || '',
                                time: byTime ? (ex.time_seconds || '900') : '',
                                weight: '',
                                comment: ex.note || ''
                            }))
                        };
                    })
                    .filter(Boolean);

                daysMap[d.weekday] = {
                    day_name: d.day_name || '',
                    day_image: '',
                    blocks: exercises.map(ex => ({ block_type: 'Sencillo', block_notes: '', exercises: [ex] }))
                };
            }

            return res.status(200).json({
                success: true,
                data: {
                    name: raw.name || 'Plan Personalizado',
                    generalNote: raw.general_note || '',
                    restDefault: raw.rest_default || 90,
                    days: daysMap
                }
            });
        } catch (error) {
            console.log(`Error en flexAssistantController.generateTrainingPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al generar el plan con IA', error: error.message });
        }
    }

};
