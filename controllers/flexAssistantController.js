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
const { hasFlexAddon } = require('../utils/membershipGate.js');

// Antes 6 — verificado en vivo que armar una rutina completa a veces
// necesita: resolver el cliente, resolver los ejercicios, y crear la
// rutina — 3 turnos mínimo, y si Claude busca ejercicios en varias
// llamadas (aunque ya se le pidió explícitamente no hacerlo) se puede
// quedar sin turnos antes de llegar a create_routine.
const MAX_TOOL_TURNS = 10;
const MAX_TOOL_RESULT_CHARS = 8000;

// Mismo reparto de días que antes usaba el generador ficticio del
// frontend (useAiPlanGenerator.js) — para que un plan de 3 días caiga en
// Lun/Mié/Vie en vez de Lun/Mar/Mié, por ejemplo.
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
function weekdaysForCount(n) {
    const spaced = { 1: ['Lunes'], 2: ['Lunes', 'Jueves'], 3: ['Lunes', 'Miércoles', 'Viernes'], 4: ['Lunes', 'Martes', 'Jueves', 'Viernes'] };
    return spaced[n] || DAYS.slice(0, n);
}

function buildSystemPrompt(trainerName, companyName, clients, exercises) {
    // Antes Claude tenía que llamar list_clients/list_exercises como
    // primer(os) turno(s) SIEMPRE que hacía falta un id — cada llamada es
    // una ida y vuelta completa a la API (varios segundos) antes de poder
    // hacer lo que el entrenador pidió. Verificado en vivo: crear una
    // rutina completa podía tardar 2-3 minutos por esto. Mandando ya
    // resuelta la lista de clientes y el catálogo de ejercicios (mismo
    // dato que list_clients/list_exercises() devolverían, mismo criterio
    // que ya usa el generador dedicado — runTrainingPlanGeneration manda
    // el catálogo completo desde el primer mensaje) Claude puede resolver
    // nombres a ids y elegir ejercicios reales en el MISMO turno que
    // decide actuar, sin ida y vuelta extra.
    const clientsBlock = (clients || []).map(c => ({ id: Number(c.id), name: `${c.name || ''} ${c.lastname || ''}`.trim() }));
    const exercisesBlock = (exercises || []).map(e => ({ id: Number(e.id), name: e.name, muscle_group: e.muscle_group }));

    return `Eres Flex, el asistente de IA dentro del panel de administración de ${companyName || 'un negocio de entrenamiento'}. Hablas con ${trainerName || 'el entrenador'}, NO con un cliente final — tienes permiso de ejecutar acciones reales (crear/editar rutinas, recetas, asignar dietas, etc.) usando las herramientas disponibles, siempre a nombre de este entrenador y solo sobre sus propios datos.

Ya tienes estos datos reales de esta cuenta — NO llames list_clients ni list_exercises para resolverlos, están aquí mismo. Solo usa esas herramientas si necesitas algo que no aparece en estas listas (ej. buscar un ejercicio nuevo que no esté en el catálogo).
Clientes: ${JSON.stringify(clientsBlock)}
Catálogo de ejercicios (id/nombre/grupo muscular): ${JSON.stringify(exercisesBlock)}

Reglas:
- Si vas a crear o modificar algo (rutina, receta, ejercicio, dieta) y falta información clave (a qué cliente, cuántas semanas, qué ejercicios), pregúntale al entrenador antes de inventar datos.
- MUY IMPORTANTE — nunca anuncies una acción sin ejecutarla en ese mismo turno: si ya tienes toda la información necesaria para actuar (cliente resuelto, ejercicios resueltos, etc.), llama a la herramienta correspondiente EN ESE MISMO mensaje — no respondas solo con texto tipo "listo, ahora lo hago" o "dame un momento" y te detengas ahí, porque el entrenador no puede "darte" ese momento: cada mensaje tuyo es la única oportunidad de actuar, no hay un turno automático después.
- Antes de BORRAR algo (ejercicio, rutina), confirma con el entrenador en tu respuesta de texto salvo que ya haya sido explícito y claro en su mensaje.
- Usa list_recipes/list_routines para resolver esos ids (no vienen precargados) — nunca inventes un id.
- MUY IMPORTANTE — al crear una rutina completa (create_routine), TODOS los ejercicios que uses deben venir del catálogo de arriba (por su "id" exacto) — nunca inventes un ejercicio ni un id que no esté en esa lista.
- Al crear una rutina (create_routine) con ejercicios reales: arma un split semanal balanceado y coherente (nunca el mismo grupo muscular dominante todos los días salvo que el entrenador lo pida explícitamente), agrupa en un mismo bloque los ejercicios que deban hacerse juntos (bi-series/tri-series/circuitos) en vez de un ejercicio por bloque siempre, y sigue al pie de la letra cualquier instrucción específica del entrenador (ej. "agrega bi-series", "sin cardio") — no la trates como sugerencia opcional. TODOS los días de entrenamiento deben tener al menos un bloque con al menos un ejercicio real — nunca dejes un día vacío.
- MUY IMPORTANTE — en plan_data.weeks[].days, la llave de cada día debe ser SIEMPRE el nombre real del día de la semana en español (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado o Domingo) — nunca "Día 1", "Día 2" ni ningún otro texto. Si el entrenador pide un número de días (ej. "3 días"), tú decides cuáles días reales de la semana usar, repartidos de forma balanceada (ej. Lunes/Miércoles/Viernes para 3 días).
- MUY IMPORTANTE — en plan_data.weeks manda SIEMPRE una sola semana (un solo elemento en el arreglo "weeks"), sin importar cuántas semanas pida el entrenador — generar varias semanas distintas completas por chat es lento y poco confiable. Si pide sobrecarga progresiva o varias semanas, describe el plan de progresión (qué subir y cuándo) en el campo "description" de la rutina, y dile en tu respuesta de texto que puede generar el mesociclo completo con semanas progresivas reales desde "Crear plan con IA" en la ficha del cliente — ese generador SÍ diseña cada semana distinta.
- Cuando el entrenador pida algo "masivo" (ej. varias recetas para un cliente), usa assign_diet_to_client con el arreglo completo de recetas en una sola llamada.
- Responde siempre en español, de forma breve y directa, como lo haría un asistente competente por chat — no des explicaciones largas de más.
- Si una herramienta regresa un error (por ejemplo, que un cliente o rutina no pertenece a esta cuenta), explícaselo al entrenador con claridad, no lo intentes de nuevo con otro id inventado.`;
}

module.exports = {

    // ASÍNCRONO POR JOB — antes esto respondía en el mismo request (como
    // el resto de esta función). Verificado en vivo: una conversación que
    // necesita resolver un cliente/ejercicio Y LUEGO generar una rutina
    // real de varios días/semanas implica 2-3 idas y vueltas reales con
    // Claude (max_tokens 8192 cada una) y puede tardar más de 30s en
    // total — Heroku mata (H12/503) cualquier respuesta HTTP más lenta
    // que eso. Mismo patrón que generateTrainingPlan: se crea un job
    // (reusa la tabla genérica ai_plan_jobs), se responde de inmediato
    // con su id, y la conversación real corre en segundo plano
    // (runChatTurn) — el frontend hace polling a
    // GET /api/flex/chat/:jobId hasta que quede lista.
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
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            // NUEVO — Flex es un complemento de pago (membership_addons:
            // 'flex_ilimitado'); antes cualquier entrenador autenticado
            // podía usarlo sin haberlo activado.
            if (!(await hasFlexAddon(id_company))) {
                return res.status(402).json({
                    success: false,
                    code: 'FLEX_ADDON_REQUIRED',
                    message: 'Flex es un complemento de pago — actívalo en Suscripción para usar el asistente de IA.'
                });
            }

            const jobId = await AiPlanJob.create(id_company);
            // No se espera (sin await) — corre en segundo plano mientras
            // ya respondimos. Cualquier error se guarda en el job.
            runChatTurn(jobId, id_company, req.user.name, messages, message, req).catch((err) => {
                console.log(`Error en runChatTurn (job ${jobId}): ${err}`);
                AiPlanJob.markError(jobId, err.message || 'Error desconocido').catch(() => {});
            });

            return res.status(202).json({ success: true, data: { jobId } });
        } catch (error) {
            console.log(`Error en flexAssistantController.chat: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al conectar con Flex', error: error.message });
        }
    },

    // Polling del job de chat — ver comentario de arriba.
    async getChatJob(req, res) {
        try {
            const id_company = req.user.mi_store;
            const job = await AiPlanJob.findById(req.params.jobId, id_company);
            if (!job) {
                return res.status(404).json({ success: false, message: 'No se encontró esa conversación.' });
            }
            if (job.status === 'error') {
                return res.status(200).json({ success: true, data: { status: 'error', message: job.error_message } });
            }
            if (job.status === 'done') {
                return res.status(200).json({ success: true, data: { status: 'done', result: job.result } });
            }
            return res.status(200).json({ success: true, data: { status: 'pending' } });
        } catch (error) {
            console.log(`Error en flexAssistantController.getChatJob: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al consultar la conversación', error: error.message });
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
            // NUEVO — mismo complemento de pago que chat() (ver
            // utils/membershipGate.js) — "Crear plan con IA" también es IA.
            if (!(await hasFlexAddon(id_company))) {
                return res.status(402).json({
                    success: false,
                    code: 'FLEX_ADDON_REQUIRED',
                    message: 'Flex es un complemento de pago — actívalo en Suscripción para generar planes con IA.'
                });
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

// Un turno completo de chat de Flex (puede implicar varias idas y vueltas
// reales con Claude por el tool-calling) — ver comentario de chat() arriba.
async function runChatTurn(jobId, id_company, trainerName, messages, message, req) {
    const anthropic = new Anthropic({ apiKey: keys.anthropicApiKey });

    // En paralelo — ver comentario en buildSystemPrompt: esto evita que
    // Claude tenga que llamar list_clients/list_exercises como primer
    // turno para poder actuar en el segundo.
    const [company, clients, exercises] = await Promise.all([
        User.findCompanyById(id_company).catch(() => null),
        User.getClientsByCompany(id_company).catch(() => []),
        Exercise.findByCompany(id_company).catch(() => [])
    ]);
    const systemPrompt = buildSystemPrompt(trainerName, company?.name, clients, exercises);

    // Se simplifica el historial previo a turnos de texto plano — Claude
    // no necesita ver los bloques tool_use/tool_result crudos de turnos
    // ya resueltos, solo qué se dijo.
    const anthropicMessages = (Array.isArray(messages) ? messages : [])
        .filter((m) => m && m.content)
        .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content)
        }));
    anthropicMessages.push({ role: 'user', content: String(message) });

    const toolCallsForClient = [];
    let finalText = '';
    // Visto en vivo (probando de verdad, no en teoría): a veces Claude
    // resuelve un id (list_clients, list_exercises, etc.) y en el
    // SIGUIENTE turno, en vez de llamar ya a la herramienta real
    // (create_routine...), responde solo con texto tipo "voy a crear tu
    // rutina ahora" y ahí se detiene para siempre — no hay "turno
    // automático" después en esta arquitectura, así que ese mensaje se
    // queda huérfano. Si el turno anterior fue puramente de "resolver"
    // (lectura, nunca una acción real) y este responde solo con texto, se
    // empuja un mensaje para forzar la acción real en vez de cortar ahí —
    // solo una vez, para no generar un loop infinito si sigue sin actuar.
    const RESOLVER_ONLY_TOOLS = new Set([
        'list_clients', 'list_exercises', 'list_recipes', 'list_ingredients', 'list_routines',
        'get_client_active_routine', 'get_client_diet', 'get_client_workout_history',
        'get_client_exercise_history', 'get_client_body_metrics'
    ]);
    let lastTurnWasResolverOnly = false;
    let alreadyNudged = false;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await anthropic.messages.create({
            model: keys.anthropicModel,
            // Antes 2048 — verificado en vivo que una rutina de varios
            // días/semanas con ejercicios reales trunca el tool_use de
            // create_routine a medio JSON (stop_reason 'max_tokens'), lo
            // que además revienta la SIGUIENTE llamada a la API (un
            // tool_use sin su tool_result es inválido). Mismo valor que
            // ya usa el generador dedicado (runTrainingPlanGeneration)
            // para el mismo tipo de payload grande.
            max_tokens: 8192,
            system: systemPrompt,
            tools: TOOL_DEFINITIONS,
            messages: anthropicMessages
        }, {
            // Visto en vivo: un job se quedó en 'pending' más de 5
            // minutos sin avanzar ni fallar — sin timeout, una llamada de
            // red colgada puede dejar el job huérfano para siempre (el
            // frontend eventualmente se rinde, pero el job nunca se
            // marca ni 'done' ni 'error', y el entrenador nunca sabe qué
            // pasó). Un tope explícito por llamada convierte ese cuelgue
            // en un error real y reportado, en vez de un silencio eterno.
            // maxRetries:0 — el SDK reintenta 2 veces por default, lo
            // cual TRIPLICA en silencio el tiempo real de esta llamada
            // (60s x 3 intentos) antes de fallar; con un timeout ya
            // puesto, esos reintentos automáticos solo repiten la misma
            // demora en vez de ayudar.
            timeout: 60000,
            maxRetries: 0
        });

        anthropicMessages.push({ role: 'assistant', content: response.content });

        const textBlocks = response.content.filter((b) => b.type === 'text');
        if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join('\n').trim();

        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

        // Se resuelve CUALQUIER tool_use presente sin importar
        // stop_reason — la API exige un tool_result por cada uno en el
        // siguiente mensaje sí o sí, incluso si vino truncado por
        // max_tokens a medio armar (ahí executeTool simplemente fallará
        // al parsear/validar el input, lo cual se reporta como cualquier
        // otro error de herramienta).
        if (toolUseBlocks.length > 0) {
            lastTurnWasResolverOnly = toolUseBlocks.every((b) => RESOLVER_ONLY_TOOLS.has(b.name));

            const toolResultContent = [];
            for (const block of toolUseBlocks) {
                let payload;
                try {
                    // Visto en vivo: create_routine a veces "tenía éxito"
                    // (insertaba la fila) con un plan_data sin ningún
                    // ejercicio real — el entrenador veía la rutina vacía
                    // en el creador y sentía que "no pasó nada". Se valida
                    // ANTES de llamar a la herramienta (para no crear la
                    // fila vacía) y, si está vacío, se reporta como error
                    // para que Claude lo corrija de inmediato en el mismo
                    // job en vez de "tener éxito" con nada.
                    if (block.name === 'create_routine' || block.name === 'update_routine') {
                        const pd = (block.input && block.input.plan_data) || null;
                        if (pd) {
                            const weeks = Array.isArray(pd.weeks) ? pd.weeks : [];
                            const hasContent = weeks.some((w) => w && w.days && Object.values(w.days).some(
                                (d) => d && Array.isArray(d.blocks) && d.blocks.some((b) => b && Array.isArray(b.exercises) && b.exercises.length > 0)
                            ));
                            if (!hasContent) {
                                throw new Error('plan_data no tiene ningún día con bloques de ejercicios reales — no se guardó nada. Vuelve a llamar esta herramienta con al menos un ejercicio real (del catálogo de arriba) en cada día de entrenamiento.');
                            }
                        }
                    }
                    const result = await executeTool(block.name, block.input || {}, req);
                    payload = { ok: true, data: result };
                    // `data` viaja también al frontend (antes se
                    // descartaba) — lo necesita para, por ejemplo,
                    // enlazar directo al editor cuando create_routine
                    // regresa el id de la rutina recién creada.
                    toolCallsForClient.push({ tool: block.name, input: block.input, ok: true, data: result });
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
            continue;
        }

        // Sin tool_use en este turno — no se empuja si el texto parece
        // una pregunta real al entrenador (ej. "¿cuál de los dos Juan?"):
        // ahí sí hace falta una respuesta humana, forzar la acción sería
        // adivinar en lugar de preguntar.
        const looksLikeQuestion = /[?¿]/.test(finalText);
        if (lastTurnWasResolverOnly && !alreadyNudged && !looksLikeQuestion && turn < MAX_TOOL_TURNS - 1) {
            alreadyNudged = true;
            anthropicMessages.push({
                role: 'user',
                content: 'No anuncies la acción, ejecútala ahora mismo llamando a la herramienta correspondiente en este mismo mensaje.'
            });
            continue;
        }
        break;
    }

    await AiPlanJob.markDone(jobId, {
        text: finalText || 'No tengo una respuesta para eso todavía.',
        toolCalls: toolCallsForClient
    });
}

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
    }, {
        // Mismo tope defensivo que runChatTurn — sin esto, una llamada de
        // red colgada deja el job en 'pending' para siempre. maxRetries:0
        // por la misma razón (el SDK reintenta 2 veces por default, lo
        // que triplica en silencio el tiempo real de espera).
        timeout: 90000,
        maxRetries: 0
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
