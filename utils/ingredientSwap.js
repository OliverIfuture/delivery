// utils/ingredientSwap.js
//
// Cálculo de equivalencia para sustituir un ingrediente de una receta.
// Puro (sin base de datos) para poder probarlo aislado.
//
// Modelo: los macros del catálogo vienen "por base_qty de unit". Aquí se
// pasan a macros POR GRAMO (solo unit 'g' o 'ml', tratado como g), se calcula
// el objetivo del ingrediente original (macros x gramos) y se busca la
// cantidad del reemplazo que mejor iguala ese objetivo en los 4 valores
// (kcal, proteína, carbos, grasas). Mínimos cuadrados ponderados por el
// tamaño de cada valor (error relativo) con más peso para las calorías,
// así un macro grande no domina a los demás.

const WEIGHTS = { kcal: 2, protein: 1, carbs: 1, fats: 1 };
// Energía por gramo: el error de cada macro se mide en kcal, para que todos
// tengan la misma unidad (una grasa pesa 9 veces más por gramo que un carbo).
const KCAL_PER_GRAM = { kcal: 1, protein: 4, carbs: 4, fats: 9 };
const MIN_GRAMS = 5;
const MAX_GRAMS = 1000;

// Macros por gramo de un ingrediente del catálogo. null si no se puede
// comparar (unidad distinta de g/ml o base_qty inválida).
function perGram(ing) {
    const unit = String(ing.unit || '').toLowerCase();
    if (unit !== 'g' && unit !== 'ml') return null;
    const base = Number(ing.base_qty);
    if (!base || base <= 0) return null;
    return {
        kcal: Number(ing.calories || 0) / base,
        protein: Number(ing.protein || 0) / base,
        carbs: Number(ing.carbs || 0) / base,
        fats: Number(ing.fats || 0) / base
    };
}

// Macros totales del ingrediente original para la cantidad de la receta.
function targetFor(originalIng, qtyGrams) {
    const pg = perGram(originalIng);
    if (!pg) return null;
    return {
        kcal: pg.kcal * qtyGrams,
        protein: pg.protein * qtyGrams,
        carbs: pg.carbs * qtyGrams,
        fats: pg.fats * qtyGrams
    };
}

// Redondeo práctico para cocina: 1 g hasta 50 g, 5 g después.
function roundGrams(g) {
    const step = g < 50 ? 1 : 5;
    return Math.round(g / step) * step;
}

// Cantidad (en gramos) del reemplazo que mejor iguala el objetivo.
// Mínimos cuadrados en kcal: minimiza Σ w_m · (E_m · (T_m − q·c_m))²
// con E_m = kcal por gramo de cada macro. Solución cerrada:
// q = Σ w_m·E_m²·c_m·T_m / Σ w_m·E_m²·c_m²
function solveReplacementGrams(target, candidatePerGram) {
    let num = 0;
    let den = 0;
    for (const m of Object.keys(WEIGHTS)) {
        const T = target[m];
        const c = candidatePerGram[m];
        const k = WEIGHTS[m] * KCAL_PER_GRAM[m] * KCAL_PER_GRAM[m];
        num += k * c * T;
        den += k * c * c;
    }
    if (den === 0) return null;
    return num / den;
}

// Macros resultantes con una cantidad dada y desviación relativa de cada uno.
function evaluate(target, candidatePerGram, grams) {
    const result = {};
    const deviation = {};
    for (const m of Object.keys(WEIGHTS)) {
        result[m] = candidatePerGram[m] * grams;
        const T = target[m];
        deviation[m] = T > 0 ? (result[m] - T) / T : null;
    }
    return { result, deviation };
}

function energyDeviation(target, result) {
    if (!target.kcal || target.kcal <= 0) return null;
    let sum = 0;
    for (const m of Object.keys(KCAL_PER_GRAM)) sum += Math.abs(result[m] - target[m]) * KCAL_PER_GRAM[m];
    return sum / target.kcal;
}

// Función principal. Devuelve null si la sustitución no es comparable o la
// cantidad calculada cae fuera de un rango razonable.
function computeSwap(originalIng, qtyGrams, replacementIng) {
    const target = targetFor(originalIng, qtyGrams);
    const candPg = perGram(replacementIng);
    if (!target || !candPg) return null;

    const raw = solveReplacementGrams(target, candPg);
    if (raw === null || !isFinite(raw) || raw <= 0) return null;
    const grams = roundGrams(raw);
    if (grams < MIN_GRAMS || grams > MAX_GRAMS) return null;

    const { result, deviation } = evaluate(target, candPg, grams);
    return {
        grams,
        unit: 'g',
        target,
        result,
        deviation,
        // Error total en kcal (suma de |Δ macro · kcal/g|) como porción de las kcal del original.
        // Más estable que el % por macro: un macro casi cero no dispara el número.
        energyDeviation: energyDeviation(target, result),
    };
}

module.exports = { computeSwap, perGram, targetFor, solveReplacementGrams, evaluate, roundGrams, energyDeviation, WEIGHTS, KCAL_PER_GRAM };
