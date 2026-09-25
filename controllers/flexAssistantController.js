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
const AiPlanJob = require('../models/aiPlanJob.js');
const TrainingDayPhoto = require('../models/trainingDayPhoto.js');
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
    //
    // Sobrecarga progresiva: antes se generaba UNA sola semana y el
    // frontend la clonaba idéntica para todas las semanas pedidas. Ahora
    // Claude diseña hasta MAX_DISTINCT_WEEKS semanas realmente distintas
    // (progresión real de series/reps/descanso/ejercicios), y si se piden
    // más semanas que eso, el bloque se repite en ciclos (mismo criterio
    // que un entrenador real reutilizando un mesociclo de 4 semanas).
    //
    // ASÍNCRONO POR JOB — medido en vivo: generar hasta 4 semanas distintas
    // con Claude puede tardar más de 30s, y Heroku mata (H12/503) cualquier
    // request HTTP que tarde más que eso. Por eso este endpoint YA NO
    // espera la respuesta completa: crea un job en ai_plan_jobs, responde
    // de inmediato con su id, y la generación real corre en segundo plano
    // (runTrainingPlanGeneration) — el frontend hace polling a
    // GET /api/flex/generate-training-plan/:jobId hasta que quede listo.
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

            const catalog = await Exercise.findByCompany(id_company);
            if (!catalog.length) {
                return res.status(422).json({ success: false, message: 'Todavía no tienes ejercicios en tu catálogo — agrega algunos en "Ejercicios" antes de generar un plan con IA.' });
            }

            const jobId = await AiPlanJob.create(id_company);
            // No se espera (sin await) — corre en segundo plano mientras ya
            // respondimos. Cualquier error se guarda en el job, nunca tumba
            // el proceso (el dyno sigue vivo atendiendo otros requests).
            runTrainingPlanGeneration(jobId, id_company, catalog, req.body).catch((err) => {
                console.log(`Error en runTrainingPlanGeneration (job ${jobId}): ${err}`);
                AiPlanJob.markError(jobId, err.message || 'Error desconocido').catch(() => {});
            });

            return res.status(202).json({ success: true, data: { jobId } });
        } catch (error) {
            console.log(`Error en flexAssistantController.generateTrainingPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al iniciar la generación del plan', error: error.message });
        }
    },

    // Polling del job — ver comentario de arriba.
    async getTrainingPlanJob(req, res) {
        try {
            const id_company = req.user.mi_store;
            const job = await AiPlanJob.findById(req.params.jobId, id_company);
            if (!job) {
                return res.status(404).json({ success: false, message: 'No se encontró ese trabajo de generación.' });
            }
            if (job.status === 'error') {
                return res.status(200).json({ success: true, data: { status: 'error', message: job.error_message } });
            }
            if (job.status === 'done') {
                return res.status(200).json({ success: true, data: { status: 'done', result: job.result } });
            }
            return res.status(200).json({ success: true, data: { status: 'pending' } });
        } catch (error) {
            console.log(`Error en flexAssistantController.getTrainingPlanJob: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al consultar el trabajo', error: error.message });
        }
    }

};

// ===================== Worker en segundo plano =====================
async function runTrainingPlanGeneration(jobId, id_company, catalog, body) {
    const { clientName, days, objetivo, nivel, zona, equipo, lesiones, notas, freeText, semanas, referenceImage, trainingStyles } = body;
    const dayCount = Math.min(7, Math.max(1, parseInt(days, 10) || 4));
    const assignedDays = weekdaysForCount(dayCount);
    const semanasSolicitadas = Math.min(12, Math.max(1, parseInt(semanas, 10) || 1));
    const MAX_DISTINCT_WEEKS = 4;
    const distinctWeeks = Math.min(MAX_DISTINCT_WEEKS, semanasSolicitadas);
    const styles = Array.isArray(trainingStyles) ? trainingStyles.filter(Boolean) : [];

    const catalogById = new Map(catalog.map(e => [Number(e.id), e]));
    // Solo mandamos lo necesario para elegir (id/nombre/grupo/equipo) —
    // las descripciones largas no ayudan a Claude a elegir y gastan tokens.
    const catalogForPrompt = catalog.map(e => ({ id: Number(e.id), name: e.name, muscle_group: e.muscle_group, equipment: e.equipment || '' }));

    // Galería de fotos "fondo del día" del entrenador (ver
    // models/trainingDayPhoto.js) — agrupadas por categoría (mismo
    // vocabulario que muscle_group) para que la IA pueda ponerle una foto
    // real del entrenador al día según el grupo muscular dominante de ese
    // día, en vez de dejar day_image siempre vacío.
    const dayPhotos = await TrainingDayPhoto.findByCompany(id_company);
    const photosByCategory = new Map();
    for (const p of dayPhotos) {
        const key = String(p.category || '').trim().toLowerCase();
        if (!key) continue;
        if (!photosByCategory.has(key)) photosByCategory.set(key, []);
        photosByCategory.get(key).push(p.url);
    }
    function pickPhotoForGroup(muscleGroup) {
        if (!muscleGroup) return '';
        const list = photosByCategory.get(String(muscleGroup).trim().toLowerCase());
        if (!list || !list.length) return '';
        return list[Math.floor(Math.random() * list.length)];
    }
    function dominantMuscleGroup(blocks) {
        const counts = {};
        for (const b of blocks) {
            for (const ex of b.exercises) {
                counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + 1;
            }
        }
        let best = null, bestCount = 0;
        for (const [g, c] of Object.entries(counts)) {
            if (c > bestCount) { best = g; bestCount = c; }
        }
        return best;
    }

    const anthropic = new Anthropic({ apiKey: keys.anthropicApiKey });

    const systemPrompt = `Eres un entrenador experto diseñando un plan de entrenamiento para ${clientName || 'un cliente'}. Debes usar EXCLUSIVAMENTE ejercicios de la lista de catálogo que te doy (por su "id" exacto) — nunca inventes un ejercicio ni un id que no esté en la lista. Ajusta series/reps/descanso según el objetivo y nivel. Si el cliente tiene lesiones o limitaciones, evita ejercicios claramente riesgosos para eso y dilo en la nota del ejercicio afectado.

MUY IMPORTANTE — coherencia del split semanal: SIEMPRE arma una división de grupos musculares real y balanceada entre los días (ej. empuje/jalón/pierna, torso/pierna, o por grupo específico) — un cliente NUNCA debe entrenar el mismo grupo muscular dominante todos los días de la semana, sin importar lo que pida el "énfasis muscular". El énfasis muscular es una PRIORIDAD ADICIONAL sobre ese split ya balanceado, no un reemplazo: si te piden énfasis en "Pierna", el split sigue cubriendo todos los grupos importantes (pecho, espalda, hombro, brazos, core) pero le das a pierna más frecuencia semanal (ej. 2 de los días, o más ejercicios/series de pierna que del resto) — NUNCA el 100% de los días. Solo ignora esta regla si en las notas el entrenador pide EXPLÍCITAMENTE un split de una sola zona (ej. "solo piernas toda la semana").

MUY IMPORTANTE — formato de bloques: agrupa los ejercicios de cada día en "blocks". Un bloque con 1 ejercicio es una serie sencilla normal. Un bloque con 2 ejercicios es una bi-serie/súper-serie (se hacen alternados, sin descanso entre ellos, descanso solo al terminar el par). Un bloque con 3 es una tri-serie. Un bloque con 4+ es un circuito. Si el entrenador pidió un "tipo de entrenamiento" específico (bi-series, tri-series, circuito, quema de grasa/HIIT), ese formato debe reflejarse de verdad en cómo agrupas los ejercicios — no lo ignores. Para quema de grasa/HIIT: favorece más repeticiones, descansos cortos, y agrupa ejercicios en circuitos.

MUY IMPORTANTE — las notas del entrenador son una instrucción directa que DEBES seguir al pie de la letra (ej. si piden "agregar bi-series", el plan debe tener bloques de 2 ejercicios de verdad, no ejercicios sueltos con una nota de texto). No las trates como sugerencia opcional.

MUY IMPORTANTE — sobrecarga progresiva real: vas a diseñar ${distinctWeeks} semana(s) DISTINTAS que forman un mesociclo. Cada semana debe representar un avance real respecto a la anterior (más repeticiones, más series, menos descanso, mayor dificultad de variante, o una nota explícita de aumentar peso) — NUNCA repitas la semana anterior idéntica. Si diseñas 4 semanas, la última puede ser la de mayor intensidad o, si tiene sentido para el objetivo/nivel, una semana de descarga (deload) con volumen reducido — decide tú según el caso y dilo en su nota.${referenceImage ? ' El entrenador adjuntó una imagen de referencia (equipo disponible o una rutina en papel) —úsala como contexto real para tu plan.' : ''}`;

    const userPrompt = `Genera el mesociclo con estos datos:
- Días de entrenamiento por semana: ${dayCount} (usa exactamente estos días de la semana, uno por cada día de entrenamiento: ${assignedDays.join(', ')})
- Semanas distintas a diseñar: ${distinctWeeks}
- Objetivo: ${objetivo || 'no especificado'}
- Nivel: ${nivel || 'no especificado'}
- Énfasis muscular (prioridad adicional, no split exclusivo — ver regla de coherencia): ${zona || 'ninguno en particular'}
- Tipo de entrenamiento pedido (refleja esto en el agrupado de bloques): ${styles.length ? styles.join(', ') : 'sin preferencia, usa tu criterio'}
- Equipo disponible: ${equipo || 'equipo estándar de gimnasio'}
- Lesiones o limitaciones: ${lesiones || 'ninguna reportada'}
- Notas del entrenador (instrucción directa, síguela literalmente): ${notas || 'ninguna'}
- Instrucción libre adicional: ${freeText || 'ninguna'}

Catálogo de ejercicios disponibles (usa solo estos ids):
${JSON.stringify(catalogForPrompt)}`;

    const exerciseItemSchema = {
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
    };

    const dayItemSchema = {
        type: 'object',
        properties: {
            weekday: { type: 'string', enum: assignedDays },
            day_name: { type: 'string', description: 'Título del día, ej. "Pierna: Cuádriceps y Glúteo"' },
            blocks: {
                type: 'array',
                description: 'Cada bloque agrupa 1+ ejercicios que se hacen juntos. 1 ejercicio = serie sencilla. 2 = bi-serie/súper-serie. 3 = tri-serie. 4+ = circuito. Usa esto de verdad para reflejar el "tipo de entrenamiento" pedido.',
                items: {
                    type: 'object',
                    properties: {
                        block_notes: { type: 'string', description: 'Ej. "Sin descanso entre ejercicios, 60s al terminar la ronda" para bi-series/circuitos.' },
                        exercises: { type: 'array', minItems: 1, items: exerciseItemSchema }
                    },
                    required: ['exercises']
                }
            }
        },
        required: ['weekday', 'day_name', 'blocks']
    };

    const planTool = {
        name: 'generate_plan',
        description: 'Entrega el plan de entrenamiento generado con la estructura exacta pedida — un mesociclo de semanas progresivas.',
        input_schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nombre corto y natural del plan (nada de "Plan IA"), ej. "Hipertrofia Total – 4 Días"' },
                general_note: { type: 'string', description: 'Resumen breve del enfoque del plan, la progresión entre semanas, y adaptaciones por lesión, si aplica.' },
                rest_default: { type: 'integer', description: 'Segundos de descanso por defecto entre series' },
                weeks: {
                    type: 'array',
                    minItems: distinctWeeks,
                    maxItems: distinctWeeks,
                    description: 'Una entrada por cada semana distinta del mesociclo, en orden (semana 1, semana 2, ...), cada una con más carga/dificultad que la anterior.',
                    items: {
                        type: 'object',
                        properties: {
                            week_note: { type: 'string', description: 'Qué cambia en esta semana respecto a la anterior (ej. "+1 serie por ejercicio" o "semana de descarga").' },
                            days: { type: 'array', minItems: dayCount, maxItems: dayCount, items: dayItemSchema }
                        },
                        required: ['days']
                    }
                }
            },
            required: ['name', 'weeks']
        }
    };

    const userContent = [{ type: 'text', text: userPrompt }];
    if (referenceImage && referenceImage.mediaType && referenceImage.base64) {
        userContent.unshift({
            type: 'image',
            source: { type: 'base64', media_type: referenceImage.mediaType, data: referenceImage.base64 }
        });
    }

    const response = await anthropic.messages.create({
        model: keys.anthropicModel,
        max_tokens: 8192,
        system: systemPrompt,
        tools: [planTool],
        tool_choice: { type: 'tool', name: 'generate_plan' },
        messages: [{ role: 'user', content: userContent }]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_plan');
    if (!toolUse) {
        throw new Error('La IA no devolvió un plan válido, intenta de nuevo.');
    }
    const raw = toolUse.input;

    // Traducimos los ids a los ejercicios reales completos (con
    // media/thumbnail) y armamos, por cada semana distinta que diseñó
    // Claude, el mismo mapa por día de la semana que ya esperaba el
    // frontend — como un ARRAY de semanas para que PlantillasView.vue las
    // use como base real de la sobrecarga progresiva en vez de clonarlas.
    //
    // block_type se calcula por la cantidad de ejercicios del bloque —
    // mismo criterio que blockTypeForCount() en usePlantillasStore.js del
    // frontend (1=Sencillo, 2=Bi-Serie, 3=Tri-Serie, 4+=Circuito) — así
    // Claude solo decide CUÁNTOS ejercicios van juntos, no cómo se llama
    // la etiqueta, evitando inconsistencias.
    function blockTypeForCount(n) {
        if (n <= 1) return 'Sencillo';
        if (n === 2) return 'Bi-Serie / Súper-Serie';
        if (n === 3) return 'Tri-Serie';
        return 'Circuito';
    }

    function buildDaysMap(days) {
        const daysMap = {};
        for (const d of (days || [])) {
            const blocks = (d.blocks || [])
                .map(block => {
                    const exercises = (block.exercises || [])
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
                    if (!exercises.length) return null;
                    return { block_type: blockTypeForCount(exercises.length), block_notes: block.block_notes || '', exercises };
                })
                .filter(Boolean);

            daysMap[d.weekday] = {
                day_name: d.day_name || '',
                day_image: pickPhotoForGroup(dominantMuscleGroup(blocks)),
                blocks
            };
        }
        return daysMap;
    }

    const weeksTemplate = (raw.weeks || []).map(w => ({
        weekNote: w.week_note || '',
        days: buildDaysMap(w.days)
    }));

    await AiPlanJob.markDone(jobId, {
        name: raw.name || 'Plan Personalizado',
        generalNote: raw.general_note || '',
        restDefault: raw.rest_default || 90,
        weeksTemplate
    });
}
