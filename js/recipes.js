// ===== 作り置きレシピ提案モジュール =====

let recipeMasterData = [];

/**
 * レシピデータを読み込む
 */
async function loadRecipeData() {
    try {
        const response = await fetch('data/recipes.json');
        if (!response.ok) throw new Error('recipes.json の読み込みに失敗');
        recipeMasterData = await response.json();
        // レシピデータ読み込み完了
    } catch (error) {
        console.error('レシピデータ読み込みエラー:', error);
        recipeMasterData = [];
    }
}

/**
 * 不足栄養素に基づいてレシピをスコアリング・フィルタして返す
 * @param {Array} deficients - 不足栄養素リスト（renderSuggestionSectionと同じ形式）
 * @param {string} trimester - 'first' | 'second' | 'third'
 * @returns {Array} スコア順のレシピ（上位5品）
 */
function getRecommendedRecipes(deficients, trimester) {
    if (!recipeMasterData || recipeMasterData.length === 0 || !deficients || deficients.length === 0) {
        return [];
    }

    // 不足栄養素のIDセットとカバー率の計算用マップ
    const deficientMap = {};
    deficients.forEach(d => {
        if (d.nutrientId !== 'calories') {
            deficientMap[d.nutrientId] = {
                deficit: d.recommendedAmount - d.currentAmount,
                recommended: d.recommendedAmount
            };
        }
    });

    const deficientIds = Object.keys(deficientMap);
    if (deficientIds.length === 0) return [];

    // スコアリング
    const scored = recipeMasterData
        .filter(recipe => {
            // 妊娠期フィルタ
            if (recipe.trimesterSuitability && !recipe.trimesterSuitability.includes(trimester)) {
                return false;
            }
            return true;
        })
        .map(recipe => {
            let score = 0;
            let matchCount = 0;
            const matchedNutrients = [];

            recipe.targetNutrients.forEach(tn => {
                if (deficientIds.includes(tn)) {
                    matchCount++;
                    // 1人前あたりの栄養素で不足分に対するカバー率を算出
                    const nutrientValue = recipe.nutrientsPerServing[tn] || 0;
                    const deficit = deficientMap[tn].deficit;
                    if (deficit > 0 && nutrientValue > 0) {
                        const coverageRate = Math.min(nutrientValue / deficit, 1.0);
                        score += coverageRate;
                    }
                    matchedNutrients.push(tn);
                }
            });

            // マッチ数ボーナス（複数の不足栄養素をカバーするレシピを優遇）
            score *= (1 + matchCount * 0.3);

            return { ...recipe, score, matchCount, matchedNutrients };
        })
        .filter(r => r.matchCount > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    return scored;
}

/**
 * 栄養素IDを日本語名に変換
 */
function getNutrientDisplayName(nutrientId) {
    const names = {
        iron: '鉄分',
        calcium: 'カルシウム',
        folate: '葉酸',
        protein: 'タンパク質',
        fat: '脂質',
        carbohydrate: '炭水化物',
        calories: 'カロリー',
        vitaminD: 'ビタミンD',
        vitaminB6: 'ビタミンB6',
        vitaminB12: 'ビタミンB12',
        zinc: '亜鉛',
        fiber: '食物繊維',
        dha: 'DHA'
    };
    return names[nutrientId] || nutrientId;
}

/**
 * 栄養素IDの単位を返す
 */
function getNutrientUnit(nutrientId) {
    const units = {
        iron: 'mg',
        calcium: 'mg',
        folate: 'μg',
        protein: 'g',
        fat: 'g',
        carbohydrate: 'g',
        calories: 'kcal',
        vitaminD: 'μg',
        vitaminB6: 'mg',
        vitaminB12: 'μg',
        zinc: 'mg',
        fiber: 'g',
        dha: 'mg'
    };
    return units[nutrientId] || '';
}

/**
 * 作り置きレシピをカード表示
 * @param {Array} deficients - 不足栄養素リスト
 * @param {string} trimester - 妊娠期
 */
function renderMealPrepRecipes(deficients, trimester) {
    const section = document.getElementById('mealPrepRecipeSection');
    const listContainer = document.getElementById('mealPrepRecipeList');
    const detailsWrap = document.getElementById('mealPrepDetailsWrap');
    if (!section || !listContainer) return;

    const recipes = getRecommendedRecipes(deficients, trimester);

    if (recipes.length === 0) {
        if (detailsWrap) detailsWrap.classList.add('hidden');
        return;
    }

    if (detailsWrap) detailsWrap.classList.remove('hidden');

    let html = '';
    recipes.forEach(recipe => {
        const nutrientTags = recipe.matchedNutrients
            .map(n => `<span class="recipe-nutrient-tag">${getNutrientDisplayName(n)} ${recipe.nutrientsPerServing[n] || 0}${getNutrientUnit(n)}</span>`)
            .join('');

        const ingredientsList = recipe.ingredients
            .map(ing => `<li>${escapeHtml(ing.name)} ${escapeHtml(ing.amount)}</li>`)
            .join('');

        const stepsList = recipe.steps
            .map((step, i) => `<li>${escapeHtml(step)}</li>`)
            .join('');

        // 料理として追加するためのデータ
        const recipeDataForAdd = {
            recipeId: recipe.recipeId,
            name: recipe.name,
            nutrientsPerServing: recipe.nutrientsPerServing,
            servings: recipe.servings,
            ingredients: recipe.ingredients
        };

        html += `
            <div class="meal-prep-recipe-card">
                <div class="meal-prep-recipe-header">
                    <h4 class="meal-prep-recipe-name">${escapeHtml(recipe.name)}</h4>
                    <span class="meal-prep-recipe-time">${escapeHtml(recipe.cookTime)}</span>
                </div>
                <p class="meal-prep-recipe-desc">${escapeHtml(recipe.description)}</p>
                <div class="recipe-meta-badges">
                    <span class="recipe-storage-badge">${escapeHtml(recipe.storageInfo)}</span>
                    <span class="recipe-servings-badge">${recipe.servings}人前</span>
                </div>
                <div class="recipe-nutrient-tags">
                    ${nutrientTags}
                </div>
                <div class="meal-prep-recipe-ingredients">
                    <p class="meal-prep-sub-label">食材（${recipe.servings}人前）:</p>
                    <ul>${ingredientsList}</ul>
                </div>
                <details class="meal-prep-recipe-steps">
                    <summary>作り方を見る</summary>
                    <ol>${stepsList}</ol>
                </details>
                <div class="meal-prep-add-controls">
                    <select class="meal-prep-meal-select">
                        <option value="breakfast">朝食</option>
                        <option value="lunch">昼食</option>
                        <option value="dinner" selected>夕食</option>
                        <option value="snack">間食</option>
                    </select>
                    <button type="button" class="btn btn-add-meal-prep" data-recipe="${escapeAttr(JSON.stringify(recipeDataForAdd))}">
                        料理として追加（1人前）
                    </button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // イベントリスナー
    listContainer.querySelectorAll('.btn-add-meal-prep').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recipeData = JSON.parse(e.currentTarget.dataset.recipe);
            const select = e.currentTarget.closest('.meal-prep-add-controls').querySelector('.meal-prep-meal-select');
            const mealType = select.value;
            addRecipeAsDish(recipeData, mealType);
        });
    });
}

/**
 * レシピを1つの料理として食事記録に追加（1人前）
 * @param {Object} recipe - recipeId, name, nutrientsPerServing, servings, ingredients
 * @param {string} mealType - 'breakfast' | 'lunch' | 'dinner' | 'snack'
 */
function addRecipeAsDish(recipe, mealType) {
    if (!recipe || !recipe.nutrientsPerServing) return;

    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    // 1人前の食材リストを保存（表示用）
    const ingredientsSummary = recipe.ingredients
        ? recipe.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount
        }))
        : null;

    const mealItem = {
        id: generateUUID(),
        mealType: mealType || currentMealType,
        foodId: recipe.recipeId || 'recipe-custom',
        foodName: recipe.name,
        quantity: 1,
        displayQuantity: 1,
        displayUnit: '人前',
        nutrients: { ...recipe.nutrientsPerServing },
        ingredients: ingredientsSummary,
        createdAt: new Date().toISOString(),
        planned: isFutureDate(targetDate)
    };

    allRecords[targetDate].meals.push(mealItem);
    localStorage.setItem('mealRecords', JSON.stringify(allRecords));

    addToHistory(mealItem);
    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();

    const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
    const label = mealLabels[mealItem.mealType] || '食事';
    showToast(`${recipe.name}（1人前）を${label}に追加しました`, 3000);
}
