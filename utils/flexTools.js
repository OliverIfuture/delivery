// utils/flexTools.js
//
// NUEVO — "herramientas" reales que el asistente Flex (Claude, vía
// controllers/flexAssistantController.js) puede ejecutar en nombre del
// entrenador logueado. Cada tool llama DIRECTO a los modelos ya reales
// (Routine, Exercise, Diet, WorkoutLog, ClientProgress, User) — nada de
// esto inventa tablas ni columnas nuevas, todo fue verificado leyendo el
// código real antes de escribir este archivo.
//
// IMPORTANTE — varias funciones del backend (Routine.update/delete/
// setActive, Exercise.update/delete) NO validan por sí mismas que la fila
// pertenezca a la empresa de quien llama (son endpoints viejos, de antes
// de que existiera este patrón de seguridad). Como Flex puede fallar o
// alucinar un id, CADA tool que muta datos de una rutina/ejercicio/cliente
// verifica aquí mismo — antes de tocar nada — que esa fila sea
// verdaderamente del entrenador dueño del token (req.user.mi_store). Si
// no lo es, la tool regresa un error controlado en vez de ejecutar nada.
const Routine = require('../models/routine.js');
const Exercise = require('../models/exercise.js');
const Diet = require('../models/diet.js');
const WorkoutLog = require('../models/workoutLog.js');
const ClientProgress = require('../models/clientProgress.js');
const User = require('../models/user.js');

async function assertOwnsClient(id_company, id_client) {
    const clients = await User.getClientsByCompany(id_company);
    const owns = clients.some((c) => String(c.id) === String(id_client));
    if (!owns) throw new Error(`El cliente ${id_client} no pertenece a tu cuenta.`);
}

async function assertOwnsRoutine(id_company, id_routine) {
    const routine = await Routine.findById(id_routine);
    if (!routine) throw new Error(`No existe la rutina ${id_routine}.`);
    if (String(routine.id_company) !== String(id_company)) {
        throw new Error(`La rutina ${id_routine} no pertenece a tu cuenta.`);
    }
    return routine;
}

async function assertOwnsExercise(id_company, id_exercise) {
    const exercise = await Exercise.findById(id_exercise);
    if (!exercise) throw new Error(`No existe el ejercicio ${id_exercise}.`);
    // Los ejercicios globales (id_company null) son de lectura/uso libre
    // pero no se pueden editar/borrar desde aquí — solo los propios.
    if (exercise.id_company == null || String(exercise.id_company) !== String(id_company)) {
        throw new Error(`El ejercicio ${id_exercise} no pertenece a tu cuenta (o es global).`);
    }
    return exercise;
}

// ===================== Definiciones (schema para Claude) =====================
const TOOL_DEFINITIONS = [
    {
        name: 'list_clients',
        description: 'Lista los clientes reales del entrenador (nombre, email, estado de membresía). Úsalo para resolver a qué cliente se refiere el entrenador antes de crear/asignar algo.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'list_exercises',
        description: 'Lista los ejercicios propios del entrenador (su biblioteca). Si se da "query", busca por nombre entre TODOS los ejercicios (propios y globales de la plataforma).',
        input_schema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Texto para buscar por nombre (opcional).' } },
            required: []
        }
    },
    {
        name: 'create_exercise',
        description: 'Crea un ejercicio nuevo en la biblioteca del entrenador.',
        input_schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                muscle_group: { type: 'string', description: 'Ej. "Pecho", "Espalda", "Pierna".' },
                equipment: { type: 'string', description: 'Ej. "Barra", "Mancuernas", "Peso corporal".' }
            },
            required: ['name']
        }
    },
    {
        name: 'update_exercise',
        description: 'Edita un ejercicio ya existente del entrenador (solo los campos que se manden se cambian, el resto se conserva).',
        input_schema: {
            type: 'object',
            properties: {
                id_exercise: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                muscle_group: { type: 'string' },
                equipment: { type: 'string' }
            },
            required: ['id_exercise']
        }
    },
    {
        name: 'delete_exercise',
        description: 'Elimina un ejercicio de la biblioteca del entrenador. Pide confirmación al entrenador antes de llamar esta herramienta si no está claro.',
        input_schema: {
            type: 'object',
            properties: { id_exercise: { type: 'integer' } },
            required: ['id_exercise']
        }
    },
    {
        name: 'list_routines',
        description: 'Lista las rutinas del entrenador (incluye plantillas y rutinas activas por cliente).',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_client_active_routine',
        description: 'Trae la rutina activa actual de un cliente específico, con su plan completo (semanas/días/ejercicios).',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' } },
            required: ['id_client']
        }
    },
    {
        name: 'create_routine',
        description: 'Crea una rutina de entrenamiento nueva y la asigna a un cliente (o la deja como plantilla si no se da id_client). El plan se organiza por semanas -> días -> ejercicios.',
        input_schema: {
            type: 'object',
            properties: {
                id_client: { type: 'integer', description: 'Cliente al que se asigna. Omitir si es una plantilla.' },
                name: { type: 'string' },
                description: { type: 'string' },
                is_template: { type: 'boolean' },
                is_active: { type: 'boolean', description: 'Si es true y hay id_client, desactiva cualquier rutina activa previa de ese cliente.' },
                plan_data: {
                    type: 'object',
                    description: 'Estructura: { "weeks": [ { "week_number": 1, "days": { "Lunes": { "blocks": [ { "exercises": [ { "id": <id_ejercicio o null>, "name": "...", "sets": [{"reps":10,"weight":0}] } ] } ] }, "Martes": {...} } } ] }'
                }
            },
            required: ['name', 'plan_data']
        }
    },
    {
        name: 'update_routine',
        description: 'Edita el nombre, descripción o el plan (plan_data) de una rutina ya existente del entrenador. Los campos que no se manden se conservan tal cual.',
        input_schema: {
            type: 'object',
            properties: {
                id_routine: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                plan_data: { type: 'object', description: 'Si se manda, REEMPLAZA el plan completo — trae primero la rutina con get_client_active_routine/list_routines si solo vas a cambiar una parte.' }
            },
            required: ['id_routine']
        }
    },
    {
        name: 'set_active_routine',
        description: 'Activa una rutina ya existente para un cliente (y desactiva cualquier otra rutina activa que tuviera). La rutina debe ya pertenecer a ese cliente.',
        input_schema: {
            type: 'object',
            properties: { id_routine: { type: 'integer' }, id_client: { type: 'integer' } },
            required: ['id_routine', 'id_client']
        }
    },
    {
        name: 'substitute_exercise_in_routine',
        description: 'Reemplaza un ejercicio por otro dentro del plan de una rutina, opcionalmente solo desde la semana/día actual en adelante.',
        input_schema: {
            type: 'object',
            properties: {
                id_routine: { type: 'integer' },
                id_exercise_old: { type: 'integer' },
                id_exercise_new: { type: 'integer' },
                exercise_name_old: { type: 'string' },
                current_week: { type: 'integer' },
                current_day: { type: 'string' },
                exclude_future: { type: 'boolean' }
            },
            required: ['id_routine', 'id_exercise_new']
        }
    },
    {
        name: 'delete_routine',
        description: 'Elimina una rutina del entrenador por completo. Pide confirmación al entrenador antes de llamar esta herramienta si no está claro.',
        input_schema: {
            type: 'object',
            properties: { id_routine: { type: 'integer' } },
            required: ['id_routine']
        }
    },
    {
        name: 'list_ingredients',
        description: 'Lista el catálogo de ingredientes (con sus valores nutricionales por porción base) disponibles para armar recetas.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'list_recipes',
        description: 'Lista las recetas del entrenador, con sus ingredientes y totales nutricionales.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'create_recipe',
        description: 'Crea una receta nueva con sus ingredientes. Usa list_ingredients primero para conocer los id_ingredient disponibles.',
        input_schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                default_meal_category: { type: 'string', description: 'Ej. "Desayuno", "Comida", "Cena", "Snack".' },
                prep_time_minutes: { type: 'integer' },
                preparation_steps: { type: 'array', items: { type: 'string' } },
                total_calories: { type: 'number' },
                total_protein: { type: 'number' },
                total_carbs: { type: 'number' },
                total_fats: { type: 'number' },
                ingredients: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { id_ingredient: { type: 'integer' }, custom_qty: { type: 'number' } },
                        required: ['id_ingredient', 'custom_qty']
                    }
                }
            },
            required: ['title']
        }
    },
    {
        name: 'get_client_diet',
        description: 'Trae la dieta/plan de nutrición estructurado actual de un cliente (recetas asignadas por comida, con sus macros).',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' } },
            required: ['id_client']
        }
    },
    {
        name: 'assign_diet_to_client',
        description: 'Asigna una o varias recetas ya existentes a un cliente (arma su plan de nutrición). Se puede usar para asignar varias recetas de golpe (ej. desayuno + comida + cena).',
        input_schema: {
            type: 'object',
            properties: {
                id_client: { type: 'integer' },
                target_calories: { type: 'number', description: 'Meta calórica diaria del cliente (opcional, se guarda en su perfil).' },
                target_protein: { type: 'number' },
                target_carbs: { type: 'number' },
                target_fats: { type: 'number' },
                recipes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id_recipe: { type: 'integer' },
                            assigned_meal_category: { type: 'string' },
                            notes: { type: 'string' },
                            final_calories: { type: 'number' },
                            final_protein: { type: 'number' },
                            final_carbs: { type: 'number' },
                            final_fats: { type: 'number' }
                        },
                        required: ['id_recipe']
                    }
                }
            },
            required: ['id_client', 'recipes']
        }
    },
    {
        name: 'remove_recipe_from_client_diet',
        description: 'Quita una receta específica del plan de nutrición de un cliente.',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' }, id_recipe: { type: 'integer' } },
            required: ['id_client', 'id_recipe']
        }
    },
    {
        name: 'get_client_workout_history',
        description: 'Trae TODO el historial de sets/entrenamientos registrados de un cliente (para hacer un chequeo/análisis de su progreso y adherencia).',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' } },
            required: ['id_client']
        }
    },
    {
        name: 'get_client_exercise_history',
        description: 'Trae el historial (hasta 100 sets) de UN ejercicio específico de un cliente — útil para ver progresión de peso/reps en ese ejercicio.',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' }, exercise_name: { type: 'string' } },
            required: ['id_client', 'exercise_name']
        }
    },
    {
        name: 'get_client_body_metrics',
        description: 'Trae el historial de métricas corporales de un cliente (peso, % grasa corporal, cintura, y otras métricas registradas).',
        input_schema: {
            type: 'object',
            properties: { id_client: { type: 'integer' } },
            required: ['id_client']
        }
    }
];

// ===================== Ejecución real =====================
async function executeTool(name, input, req) {
    const id_company = req.user.mi_store;
    if (!id_company) throw new Error('Tu cuenta no tiene una empresa asignada.');

    switch (name) {
        case 'list_clients':
            return await User.getClientsByCompany(id_company);

        case 'list_exercises':
            return input.query ? await Exercise.findByName(input.query) : await Exercise.findByCompany(id_company);

        case 'create_exercise': {
            const created = await Exercise.create({
                idCompany: id_company,
                name: input.name,
                description: input.description || '',
                muscle_group: input.muscle_group || '',
                equipment: input.equipment || '',
                media_type: null
            });
            return { id: created.id, message: 'Ejercicio creado.' };
        }

        case 'update_exercise': {
            const current = await assertOwnsExercise(id_company, input.id_exercise);
            await Exercise.update({
                id: input.id_exercise,
                name: input.name ?? current.name,
                description: input.description ?? current.description,
                muscle_group: input.muscle_group ?? current.muscle_group,
                equipment: input.equipment ?? current.equipment,
                media_url: current.media_url,
                thumbnail_url: current.thumbnail_url,
                media_type: current.media_type
            });
            return { message: 'Ejercicio actualizado.' };
        }

        case 'delete_exercise': {
            await assertOwnsExercise(id_company, input.id_exercise);
            await Exercise.delete(input.id_exercise);
            return { message: 'Ejercicio eliminado.' };
        }

        case 'list_routines':
            return await Routine.findByTrainer(id_company);

        case 'get_client_active_routine':
            await assertOwnsClient(id_company, input.id_client);
            return await Routine.findActiveByClient(input.id_client);

        case 'create_routine': {
            if (input.id_client) await assertOwnsClient(id_company, input.id_client);
            const created = await Routine.create({
                id_company,
                id_client: input.id_client || null,
                name: input.name,
                plan_data: JSON.stringify(input.plan_data),
                is_active: input.is_active ?? !!input.id_client,
                description: input.description || null,
                is_template: input.is_template || false
            });
            return { id: created.id, message: 'Rutina creada.' };
        }

        case 'update_routine': {
            const current = await assertOwnsRoutine(id_company, input.id_routine);
            await Routine.update({
                id: input.id_routine,
                name: input.name ?? current.name,
                plan_data: input.plan_data ? JSON.stringify(input.plan_data) : current.plan_data,
                description: input.description ?? current.description,
                rest_time: current.rest_time,
                image: current.image,
                is_template: current.is_template,
                id_client: current.id_client
            });
            return { message: 'Rutina actualizada.' };
        }

        case 'set_active_routine': {
            await assertOwnsRoutine(id_company, input.id_routine);
            await assertOwnsClient(id_company, input.id_client);
            await Routine.setActive(input.id_routine, input.id_client);
            return { message: 'Rutina activada para el cliente.' };
        }

        case 'substitute_exercise_in_routine': {
            const routine = await assertOwnsRoutine(id_company, input.id_routine);
            const planData = typeof routine.plan_data === 'string' ? JSON.parse(routine.plan_data) : routine.plan_data;
            const weeks = planData.weeks || [];
            for (const week of weeks) {
                if (input.exclude_future && input.current_week && week.week_number < input.current_week) continue;
                const days = week.days || {};
                for (const dayKey of Object.keys(days)) {
                    if (input.exclude_future && input.current_day && week.week_number === input.current_week && dayKey !== input.current_day) continue;
                    const blocks = days[dayKey].blocks || [];
                    for (const block of blocks) {
                        for (const ex of block.exercises || []) {
                            const matchesId = input.id_exercise_old != null && String(ex.id) === String(input.id_exercise_old);
                            const matchesName = input.exercise_name_old && ex.name === input.exercise_name_old;
                            if (matchesId || matchesName) {
                                ex.id = input.id_exercise_new;
                            }
                        }
                    }
                }
            }
            await Routine.updatePlanData(input.id_routine, JSON.stringify(planData));
            return { message: 'Ejercicio sustituido en la rutina.' };
        }

        case 'delete_routine': {
            await assertOwnsRoutine(id_company, input.id_routine);
            await Routine.delete(input.id_routine);
            return { message: 'Rutina eliminada.' };
        }

        case 'list_ingredients':
            return await Diet.findByCompanyMasetr(id_company);

        case 'list_recipes':
            return await Diet.getRecipesByCompany(id_company);

        case 'create_recipe': {
            const recipeId = await Diet.createRecipe({
                id_company,
                default_meal_category: input.default_meal_category || 'General',
                title: input.title,
                image_url: null,
                prep_time_minutes: input.prep_time_minutes || null,
                preparation_steps: input.preparation_steps || [],
                total_calories: input.total_calories || 0,
                total_protein: input.total_protein || 0,
                total_carbs: input.total_carbs || 0,
                total_fats: input.total_fats || 0
            });
            if (input.ingredients && input.ingredients.length) {
                await Diet.insertIngredientsMap(recipeId, input.ingredients);
            }
            return { id: recipeId, message: 'Receta creada.' };
        }

        case 'get_client_diet':
            await assertOwnsClient(id_company, input.id_client);
            return await Diet.getAssignedDietByClient(input.id_client);

        case 'assign_diet_to_client': {
            await assertOwnsClient(id_company, input.id_client);
            const assignments = input.recipes.map((r) => ({
                id_client: input.id_client,
                id_recipe: r.id_recipe,
                assigned_meal_category: r.assigned_meal_category || 'General',
                custom_ingredients: [],
                final_calories: r.final_calories || 0,
                final_protein: r.final_protein || 0,
                final_carbs: r.final_carbs || 0,
                final_fats: r.final_fats || 0,
                notes: r.notes || '',
                target_protein: input.target_protein || 0,
                target_carbs: input.target_carbs || 0,
                target_fats: input.target_fats || 0,
                target_calories: input.target_calories || 0
            }));
            await Diet.assignMultiple(assignments);
            return { message: `${assignments.length} receta(s) asignada(s) al cliente.` };
        }

        case 'remove_recipe_from_client_diet':
            await assertOwnsClient(id_company, input.id_client);
            await Diet.deleteByClientAndRecipe(input.id_client, input.id_recipe);
            return { message: 'Receta quitada del plan del cliente.' };

        case 'get_client_workout_history':
            await assertOwnsClient(id_company, input.id_client);
            return await WorkoutLog.findByClient(input.id_client);

        case 'get_client_exercise_history':
            await assertOwnsClient(id_company, input.id_client);
            return await WorkoutLog.getHistoryByExercise(input.id_client, input.exercise_name);

        case 'get_client_body_metrics':
            await assertOwnsClient(id_company, input.id_client);
            return await ClientProgress.getFullMetrics(input.id_client);

        default:
            throw new Error(`Herramienta desconocida: ${name}`);
    }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
