/**
 * マタニティ栄養ナビ - 食事記録機能
 * 妊婦向け栄養管理アプリのメインスクリプト
 */

// ===== 栄養素の推奨量（動的に妊娠期に応じて更新） =====
let NUTRIENT_RECOMMENDATIONS = {
    calories: { label: 'カロリー', recommended: 2250, unit: 'kcal' },
    protein: { label: 'タンパク質', recommended: 55, unit: 'g' },
    fat: { label: '脂質', recommended: 55, unit: 'g' },
    carbohydrate: { label: '炭水化物', recommended: 300, unit: 'g' },
    iron: { label: '鉄', recommended: 21, unit: 'mg' },
    calcium: { label: 'カルシウム', recommended: 650, unit: 'mg' },
    folate: { label: '葉酸', recommended: 480, unit: 'μg' }
};

// 栄養素基準データ（nutrients.jsonから読み込み）
let nutrientsData = null;

// ===== グローバル変数 =====
let foodMasterData = [];  // 食品マスタデータ
let currentMealType = 'breakfast';  // 現在選択している食事タイプ
let selectedFood = null;  // 選択されている食品
let currentMealDate = null;  // 現在表示中の食事記録日付（YYYY-MM-DD）

// ===== 初期化処理 =====
document.addEventListener('DOMContentLoaded', () => {
    // 日付を表示
    updateTodayDate();

    // 食事記録の日付を初期化
    currentMealDate = getTodayString();
    initMealDateSelector();

    // ナビゲーションタブの初期化
    setupNavTabs();

    // 栄養素基準データを読み込み、推奨量を動的に設定
    loadNutrientsData();

    // 食品マスタデータを読み込み
    loadFoodMaster();

    // イベントリスナーを登録
    setupEventListeners();

    // プロフィール設定を初期化
    initProfileSettings();

    // 食事一覧と栄養素サマリーを表示
    displayMeals();
    updateNutrientsSummary();

    // 初期表示の履歴を表示
    displayMealHistory(currentMealType);

    // オリジナル食品一覧を表示
    displayCustomFoods();

    // 提案セクションを描画
    renderSuggestionSection();

    // 体重管理モジュールを初期化
    initWeightModule();
});

// ===== 日付表示の更新 =====
function updateTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const formattedDate = today.toLocaleDateString('ja-JP', options);
    document.getElementById('todayDate').textContent = formattedDate;
}

// ===== 食品マスタデータの読み込み =====
function loadFoodMaster() {
    // fetch で foods.json を読み込む
    // もし foods.json が見つからない場合は、サンプルデータを使用
    fetch('data/foods.json')
        .then(response => {
            if (!response.ok) {
                console.warn('foods.json が見つかりません。サンプルデータを使用します。');
                throw new Error('foods.json not found');
            }
            return response.json();
        })
        .then(data => {
            // foods.json は { "foods": [...] } 形式の場合と配列の場合に対応
            foodMasterData = Array.isArray(data) ? data : data.foods;
            // オリジナル食品をマージ
            mergeCustomFoods();
            console.log(`${foodMasterData.length} 件の食品マスタを読み込みました（オリジナル含む）`);
        })
        .catch(error => {
            console.error('食品マスタの読み込みエラー:', error);
            // サンプルデータを使用
            useSampleFoodData();
        });
}

// ===== サンプル食品データ（デモ用） =====
function useSampleFoodData() {
    foodMasterData = [
        {
            foodId: 'food-001',
            name: 'ごはん（白米）',
            calories: 168,
            protein: 2.5,
            fat: 0.3,
            carbohydrate: 37.1,
            iron: 0.1,
            calcium: 3,
            folate: 3,
            category: 'grain'
        },
        {
            foodId: 'food-002',
            name: '玉子焼き',
            calories: 151,
            protein: 11.0,
            fat: 11.6,
            carbohydrate: 0.3,
            iron: 1.8,
            calcium: 51,
            folate: 44,
            category: 'protein'
        },
        {
            foodId: 'food-003',
            name: 'ほうれん草（加熱）',
            calories: 20,
            protein: 2.2,
            fat: 0.3,
            carbohydrate: 3.1,
            iron: 2.0,
            calcium: 49,
            folate: 110,
            category: 'vegetable'
        },
        {
            foodId: 'food-004',
            name: '牛乳',
            calories: 67,
            protein: 3.3,
            fat: 3.8,
            carbohydrate: 4.8,
            iron: 0.0,
            calcium: 110,
            folate: 5,
            category: 'dairy'
        },
        {
            foodId: 'food-005',
            name: 'トマト',
            calories: 19,
            protein: 0.7,
            fat: 0.2,
            carbohydrate: 3.7,
            iron: 0.2,
            calcium: 7,
            folate: 20,
            category: 'vegetable'
        },
        {
            foodId: 'food-006',
            name: 'サケ',
            calories: 206,
            protein: 20.1,
            fat: 13.0,
            carbohydrate: 0.0,
            iron: 0.8,
            calcium: 12,
            folate: 8,
            category: 'protein'
        },
        {
            foodId: 'food-007',
            name: 'ブロッコリー',
            calories: 34,
            protein: 3.7,
            fat: 0.6,
            carbohydrate: 5.2,
            iron: 0.8,
            calcium: 38,
            folate: 120,
            category: 'vegetable'
        },
        {
            foodId: 'food-008',
            name: 'バナナ',
            calories: 86,
            protein: 1.1,
            fat: 0.2,
            carbohydrate: 22.0,
            iron: 0.3,
            calcium: 6,
            folate: 19,
            category: 'fruit'
        },
        {
            foodId: 'food-009',
            name: 'チーズ（プロセス）',
            calories: 339,
            protein: 22.7,
            fat: 26.0,
            carbohydrate: 1.3,
            iron: 0.2,
            calcium: 630,
            folate: 9,
            category: 'dairy'
        },
        {
            foodId: 'food-010',
            name: '鶏むね肉（加熱）',
            calories: 165,
            protein: 33.9,
            fat: 1.9,
            carbohydrate: 0.0,
            iron: 0.8,
            calcium: 11,
            folate: 9,
            category: 'protein'
        }
    ];
    console.log('サンプル食品データを使用しています');
}

// ===== イベントリスナーの登録 =====
function setupEventListeners() {
    // 食事タイプタブ
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentMealType = e.target.dataset.type;
        });
    });

    // 食品検索（1文字以上で検索開始）
    document.getElementById('foodSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length >= 1) {
            showFoodSuggestions(searchTerm);
        } else {
            hideFoodSuggestions();
        }
    });

    // フォーム送信
    document.getElementById('mealForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addMeal();
    });

    // クリアボタン
    document.getElementById('clearFoodBtn').addEventListener('click', () => {
        clearSelectedFood();
    });

    // リセットボタン
    document.getElementById('resetButton').addEventListener('click', () => {
        if (confirm('本日の食事記録をすべて削除してもよろしいですか？')) {
            resetDayRecords();
        }
    });

    // 摂取量入力時のヒント更新
    document.getElementById('quantity').addEventListener('input', () => {
        updateQuantityHint();
    });

    // 単位変更時のヒント更新
    document.getElementById('unitSelect').addEventListener('change', () => {
        updateQuantityHint();
    });

    // タブ切り替え時に履歴を表示
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            displayMealHistory(currentMealType);
        });
    });

    // オリジナル食品登録モーダル
    document.getElementById('openCustomFoodBtn').addEventListener('click', () => {
        openCustomFoodModal();
    });
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('customFoodModal').classList.add('hidden');
    });
    document.getElementById('customFoodModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('customFoodModal')) {
            document.getElementById('customFoodModal').classList.add('hidden');
        }
    });
    document.getElementById('customFoodForm').addEventListener('submit', (e) => {
        e.preventDefault();
        registerCustomFood();
    });

    // モード切替タブ
    document.querySelectorAll('.custom-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchCustomFoodMode(tab.dataset.mode);
        });
    });

    // 類似食品検索（lookupモード）
    document.getElementById('lookupSearch').addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length >= 1) {
            showLookupSuggestions(term);
        } else {
            document.getElementById('lookupSuggestions').classList.add('hidden');
        }
    });

    // 「この栄養素を使う」ボタン
    document.getElementById('applyLookupBtn').addEventListener('click', () => {
        applyLookupNutrients();
    });

    // レシピモード: 食材検索
    document.getElementById('recipeAddSearch').addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length >= 1) {
            showRecipeAddSuggestions(term);
        } else {
            document.getElementById('recipeAddSuggestions').classList.add('hidden');
        }
    });

    // レシピモード: 人前数の変更
    document.getElementById('recipeServings').addEventListener('input', () => {
        updateRecipeNutrientPreview();
    });

    // ペーストモード: 解析ボタン
    document.getElementById('analyzeRecipeBtn').addEventListener('click', () => {
        const text = document.getElementById('pasteRecipeText').value.trim();
        if (!text) {
            alert('レシピテキストを入力してください');
            return;
        }
        analyzeRecipe(text);
    });

    // ペーストモード: 解析結果を適用
    document.getElementById('applyPasteResultBtn').addEventListener('click', () => {
        applyPasteResult();
    });

    // API設定: 保存
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('claudeApiKeyInput').value.trim();
        if (!key) {
            alert('APIキーを入力してください');
            return;
        }
        localStorage.setItem('claudeApiKey', key);
        document.getElementById('claudeApiKeyInput').value = '';
        updateApiKeyStatus();
    });

    // API設定: 削除
    document.getElementById('deleteApiKeyBtn').addEventListener('click', () => {
        localStorage.removeItem('claudeApiKey');
        document.getElementById('claudeApiKeyInput').value = '';
        updateApiKeyStatus();
    });

    // API設定: 初期表示
    updateApiKeyStatus();
}

// ===== カタカナをひらがなに変換 =====
function katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
}

// ===== ひらがなをカタカナに変換 =====
function hiraganaToKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) + 0x60);
    });
}

// ===== 曖昧検索: name, nameKana, keywords すべてを検索対象にする =====
function fuzzySearchFoods(searchTerm) {
    const term = searchTerm.toLowerCase();
    const termHiragana = katakanaToHiragana(term);
    const termKatakana = hiraganaToKatakana(term);

    return foodMasterData.filter(food => {
        // 名前での一致
        if (food.name.toLowerCase().includes(term)) return true;
        // ひらがな読みでの一致
        if (food.nameKana && food.nameKana.includes(termHiragana)) return true;
        // キーワードでの一致
        if (food.keywords && food.keywords.some(kw => {
            const kwLower = kw.toLowerCase();
            return kwLower.includes(term) || kwLower.includes(termHiragana) || kwLower.includes(termKatakana);
        })) return true;
        return false;
    }).slice(0, 15);  // 最大15件
}

// ===== 食品検索・候補表示 =====
function showFoodSuggestions(searchTerm) {
    const suggestionsContainer = document.getElementById('foodSuggestions');

    // 曖昧検索で食品を抽出（1文字以上で検索開始）
    const matchedFoods = fuzzySearchFoods(searchTerm);

    // 候補がない場合
    if (matchedFoods.length === 0) {
        suggestionsContainer.innerHTML = '<div class="food-suggestion-item"><p>該当する食品が見つかりません</p></div>';
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    // 候補を表示
    suggestionsContainer.innerHTML = matchedFoods.map(food => {
        // 料理タグと食材数を表示（ingredientsがある場合）
        let dishTag = '';
        let categoryText = getCategoryLabel(food.category);
        if (food.ingredients && food.ingredients.length > 0) {
            dishTag = `<span class="dish-tag">料理</span>`;
            categoryText += ` ・ ${food.ingredients.length}食材`;
        }
        return `
            <div class="food-suggestion-item" data-food-id="${food.foodId}">
                <p class="food-suggestion-name">${food.name} ${dishTag}</p>
                <p class="food-suggestion-category">${categoryText}</p>
            </div>
        `;
    }).join('');

    // 候補をクリック時の処理
    suggestionsContainer.querySelectorAll('.food-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const foodId = item.dataset.foodId;
            selectFood(foodId);
        });
    });

    suggestionsContainer.classList.remove('hidden');
}

// ===== 候補リスト非表示 =====
function hideFoodSuggestions() {
    document.getElementById('foodSuggestions').classList.add('hidden');
}

// ===== 食品選択処理 =====
function selectFood(foodId) {
    const food = foodMasterData.find(f => f.foodId === foodId);
    if (!food) return;

    selectedFood = food;
    document.getElementById('foodSearch').value = food.name;
    document.getElementById('selectedFoodDisplay').classList.remove('hidden');
    document.getElementById('selectedFoodName').textContent = food.name;
    hideFoodSuggestions();

    // 単位セレクトを更新
    updateUnitSelect(food);

    // 食材構成を表示
    displayIngredients(food);
}

// ===== 単位セレクトを更新 =====
function updateUnitSelect(food) {
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.innerHTML = '';

    // フォールバック: units がない場合は g のみ
    const units = food.units || [{ name: 'g', label: 'g', gramsPerUnit: 1 }];
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.name;
        option.textContent = unit.label;
        option.dataset.grams = unit.gramsPerUnit;
        unitSelect.appendChild(option);
    });

    // デフォルト単位を選択
    if (food.defaultUnit) {
        unitSelect.value = food.defaultUnit;
    }

    // ヒントを更新
    updateQuantityHint();
}

// ===== 摂取量ヒント（グラム換算値）を更新 =====
function updateQuantityHint() {
    const quantityInput = document.getElementById('quantity');
    const unitSelect = document.getElementById('unitSelect');
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const gramsPerUnit = parseFloat(selectedOption.dataset.grams) || 1;

    const quantity = parseFloat(quantityInput.value) || 0;
    if (quantity > 0) {
        const totalGrams = Math.round(quantity * gramsPerUnit);
        document.getElementById('quantityHint').textContent = `= ${totalGrams}g`;
    } else {
        document.getElementById('quantityHint').textContent = '数量を入力してください';
    }
}

// ===== 選択食品をクリア =====
function clearSelectedFood() {
    selectedFood = null;
    editableIngredients = [];
    document.getElementById('foodSearch').value = '';
    document.getElementById('selectedFoodDisplay').classList.add('hidden');
    document.getElementById('ingredientsList').classList.add('hidden');
    document.getElementById('foodSearch').focus();
}

// ===== 編集中の食材データ（料理選択時に使用） =====
let editableIngredients = [];

// ===== 食材構成を編集可能な形式で表示 =====
function displayIngredients(food) {
    const container = document.getElementById('ingredientsList');
    if (!food.ingredients || food.ingredients.length === 0) {
        container.classList.add('hidden');
        editableIngredients = [];
        return;
    }

    // 食材データをコピーして編集用に保持
    editableIngredients = food.ingredients.map((ing, i) => ({
        index: i,
        name: ing.name,
        amount: ing.amount
    }));

    container.classList.remove('hidden');
    renderIngredientEditor();
}

// ===== 食材エディタの描画 =====
function renderIngredientEditor() {
    const container = document.getElementById('ingredientsList');
    const rows = editableIngredients.map((ing, i) => `
        <div class="ingredient-row" data-index="${i}">
            <span class="ingredient-name">${ing.name}</span>
            <input type="text" class="ingredient-amount-input" value="${ing.amount}" data-index="${i}">
            <button type="button" class="ingredient-remove-btn" data-index="${i}">&times;</button>
        </div>
    `).join('');

    container.innerHTML = `
        <p class="ingredients-label">食材構成（編集可能）:</p>
        <div class="ingredient-rows">${rows}</div>
        <div class="ingredient-add-row">
            <input type="text" id="ingredientAddSearch" class="ingredient-add-input" placeholder="食材を追加...">
            <div id="ingredientAddSuggestions" class="ingredient-add-suggestions hidden"></div>
        </div>
    `;

    // 量の変更イベント
    container.querySelectorAll('.ingredient-amount-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            editableIngredients[idx].amount = e.target.value;
        });
    });

    // 食材削除イベント
    container.querySelectorAll('.ingredient-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            editableIngredients.splice(idx, 1);
            // インデックスを振り直し
            editableIngredients.forEach((ing, i) => ing.index = i);
            renderIngredientEditor();
        });
    });

    // 食材追加の検索イベント
    const addInput = document.getElementById('ingredientAddSearch');
    addInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length >= 1) {
            showIngredientAddSuggestions(term);
        } else {
            document.getElementById('ingredientAddSuggestions').classList.add('hidden');
        }
    });
}

// ===== 食材追加用の検索候補を表示 =====
function showIngredientAddSuggestions(searchTerm) {
    const container = document.getElementById('ingredientAddSuggestions');
    // 料理以外の食品（生食材）を検索
    const matched = fuzzySearchFoods(searchTerm).filter(f => !f.ingredients).slice(0, 8);

    if (matched.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.innerHTML = matched.map(food => `
        <div class="ingredient-add-item" data-name="${food.name}">
            ${food.name} <span style="color:#999; font-size:0.8rem">${getCategoryLabel(food.category)}</span>
        </div>
    `).join('');

    container.querySelectorAll('.ingredient-add-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.dataset.name;
            editableIngredients.push({
                index: editableIngredients.length,
                name: name,
                amount: ''
            });
            renderIngredientEditor();
            // 追加した行の量入力にフォーカス
            const inputs = document.querySelectorAll('.ingredient-amount-input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        });
    });

    container.classList.remove('hidden');
}

// ===== 食事を追加 =====
function addMeal() {
    // バリデーション
    const errors = validateMealInput();
    if (errors.length > 0) {
        showFormError(errors.join('\n'));
        return;
    }

    // エラーメッセージをクリア
    clearFormError();

    // 単位からグラム数に変換
    const quantityInput = parseFloat(document.getElementById('quantity').value);
    const unitSelect = document.getElementById('unitSelect');
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const gramsPerUnit = parseFloat(selectedOption.dataset.grams) || 1;
    const quantityInGrams = Math.round(quantityInput * gramsPerUnit);

    // 単位情報も記録に保存
    const unitLabel = selectedOption.textContent;

    const targetDate = currentMealDate || getTodayString();

    // localStorageからデータを取得
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    // 栄養素を計算（料理で食材が編集されている場合は食材ベースで計算）
    let nutrients;
    let savedIngredients = null;

    if (editableIngredients.length > 0) {
        // 食材ベースの栄養計算
        nutrients = calculateNutrientsFromIngredients(editableIngredients, quantityInput);
        savedIngredients = editableIngredients.map(ing => ({ name: ing.name, amount: ing.amount }));
    } else {
        nutrients = calculateNutrients(selectedFood, quantityInGrams);
    }

    // 新しい食事項目を作成
    const mealItem = {
        id: generateUUID(),
        mealType: currentMealType,
        foodId: selectedFood.foodId,
        foodName: selectedFood.name,
        quantity: quantityInGrams,
        displayQuantity: quantityInput,  // 表示用の数量
        displayUnit: unitLabel,          // 表示用の単位
        nutrients: nutrients,
        ingredients: savedIngredients,   // 編集後の食材構成を保存
        createdAt: new Date().toISOString(),
        planned: isFutureDate(targetDate)  // 未来日は予定として記録
    };

    // 配列に追加
    allRecords[targetDate].meals.push(mealItem);

    // localStorageに保存
    localStorage.setItem('mealRecords', JSON.stringify(allRecords));

    // 履歴に追加
    addToHistory(mealItem);

    // 食品名を保持してからフォームをリセット
    const addedFoodName = selectedFood.name;

    // フォームをリセット
    resetForm();

    // 表示を更新
    displayMeals();
    displayMealHistory(currentMealType);
    updateNutrientsSummary();
    renderSuggestionSection();

    // トースト通知
    showToast(`${addedFoodName} を追加しました`);
}

// ===== バリデーション =====
function validateMealInput() {
    const errors = [];

    // 食品が選択されているか確認
    if (!selectedFood) {
        errors.push('・食品を選択してください');
    }

    // 摂取量を確認（小数を許可）
    const quantity = document.getElementById('quantity').value.trim();
    if (!quantity) {
        errors.push('・摂取量を入力してください');
    } else if (isNaN(quantity) || parseFloat(quantity) < 0.1 || parseFloat(quantity) > 9999) {
        errors.push('・摂取量は0.1〜9999で入力してください');
    }

    return errors;
}

// ===== 栄養素計算 =====
// nutrition.js の calculateNutrients() 関数を使用
// （nutrition.js が index.html で先に読み込まれている）

// ===== 食材リストから栄養素を合計計算 =====
function calculateNutrientsFromIngredients(ingredients, servings) {
    // 各食材の量をパースしてグラム数を取得し、食品マスタから栄養素を計算
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0 };

    ingredients.forEach(ing => {
        // 量から数値を抽出（例: "250g" → 250、"60g" → 60）
        const grams = parseFloat(ing.amount) || 0;
        if (grams <= 0) return;

        // 食品マスタから該当食品を探す（名前の部分一致）
        const food = foodMasterData.find(f =>
            f.name.includes(ing.name) || ing.name.includes(f.name)
        );

        if (food) {
            const n = calculateNutrients(food, grams);
            if (n) {
                Object.keys(totals).forEach(key => { totals[key] += n[key]; });
            }
        }
    });

    // servings（人前数）で割る（1人前の計算）
    const s = servings || 1;
    Object.keys(totals).forEach(key => {
        totals[key] = Math.round(totals[key] / s * 10) / 10;
    });

    return totals;
}

// ===== 食事一覧を表示 =====
function displayMeals() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const todayMeals = allRecords[targetDate]?.meals || [];

    const mealsList = document.getElementById('mealsList');
    const emptyMessage = document.getElementById('emptyMealsMessage');

    // 食事がない場合
    if (todayMeals.length === 0) {
        mealsList.innerHTML = '';
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    // 食事タイプごとにグループ化
    const groupedMeals = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: []
    };

    todayMeals.forEach(meal => {
        groupedMeals[meal.mealType].push(meal);
    });

    // HTMLを生成
    let html = '';
    const mealTypeLabels = {
        breakfast: '朝食',
        lunch: '昼食',
        dinner: '夕食',
        snack: '間食'
    };

    const mealTypeColors = {
        breakfast: '#FFB6C1',
        lunch: '#FFB6C1',
        dinner: '#FFB6C1',
        snack: '#A5D6A7'
    };

    Object.keys(groupedMeals).forEach(type => {
        if (groupedMeals[type].length > 0) {
            html += `
                <div class="meal-group" style="border-left-color: ${mealTypeColors[type]}">
                    <h3 class="meal-group-title">${mealTypeLabels[type]}</h3>
            `;

            groupedMeals[type].forEach(meal => {
                const time = new Date(meal.createdAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // 表示用の数量と単位を使用（displayQuantity, displayUnitが存在する場合）
                const displayQuantity = meal.displayQuantity !== undefined ? meal.displayQuantity : meal.quantity;
                const displayUnit = meal.displayUnit || 'g';

                // 予定/確定バッジ
                const isPlanned = meal.planned === true;
                const plannedClass = isPlanned ? ' planned' : '';
                let statusBadge = '';
                if (isPlanned) {
                    statusBadge = '<span class="meal-planned-badge">予定</span>';
                } else if (meal.planned === false && isFutureDate(targetDate)) {
                    // 未来日だが確定済み（planned が明示的に false）
                    statusBadge = '<span class="meal-confirmed-badge">確定</span>';
                }

                // 予定の場合は確定ボタンを表示
                const confirmBtn = isPlanned
                    ? `<button class="btn-confirm" data-meal-id="${meal.id}">確定</button>`
                    : '';

                html += `
                    <div class="meal-item${plannedClass}">
                        <div class="meal-item-info">
                            <p class="meal-item-name">${meal.foodName} ${statusBadge}</p>
                            <p class="meal-item-quantity">摂取量: ${displayQuantity}${displayUnit}</p>
                            <p class="meal-item-nutrients">
                                <span>カロリー: ${meal.nutrients.calories}kcal</span>
                                <span>タンパク質: ${meal.nutrients.protein}g</span>
                            </p>
                            ${meal.ingredients ? `<details class="meal-item-ingredients"><summary>食材構成</summary><ul>${meal.ingredients.map(i => `<li>${i.name}: ${i.amount}</li>`).join('')}</ul></details>` : ''}
                            <p style="font-size: 0.8rem; color: #999; margin-top: 0.3rem;">${time}</p>
                        </div>
                        <div class="meal-item-delete">
                            ${confirmBtn}
                            <button class="btn-delete" data-meal-id="${meal.id}">削除</button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }
    });

    mealsList.innerHTML = html;

    // 削除ボタンのイベントリスナー
    mealsList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealId = e.target.dataset.mealId;
            deleteMeal(mealId);
        });
    });

    // 確定ボタンのイベントリスナー
    mealsList.querySelectorAll('.btn-confirm').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealId = e.target.dataset.mealId;
            confirmMeal(mealId);
        });
    });
}

// ===== 予定の食事を確定する =====
function confirmMeal(mealId) {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const meals = allRecords[targetDate]?.meals || [];

    const meal = meals.find(m => m.id === mealId);
    if (meal) {
        meal.planned = false;
        localStorage.setItem('mealRecords', JSON.stringify(allRecords));
        displayMeals();
        updateNutrientsSummary();
    }
}

// ===== 食事を削除 =====
function deleteMeal(mealId) {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const dateMeals = allRecords[targetDate]?.meals || [];

    // 該当する食事を削除
    allRecords[targetDate].meals = dateMeals.filter(meal => meal.id !== mealId);

    // localStorageに保存
    localStorage.setItem('mealRecords', JSON.stringify(allRecords));

    // 表示を更新
    displayMeals();
    displayMealHistory(currentMealType);
    updateNutrientsSummary();
    renderSuggestionSection();
}

// ===== 栄養素サマリーを更新 =====
function updateNutrientsSummary() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const todayMeals = allRecords[targetDate]?.meals || [];

    // 栄養素を集計
    const totals = {
        calories: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        iron: 0,
        calcium: 0,
        folate: 0
    };

    todayMeals.forEach(meal => {
        Object.keys(totals).forEach(nutrient => {
            totals[nutrient] += meal.nutrients[nutrient];
        });
    });

    // グリッドを生成
    const grid = document.getElementById('nutrientsGrid');
    grid.innerHTML = '';

    Object.keys(NUTRIENT_RECOMMENDATIONS).forEach(nutrientKey => {
        const recommendation = NUTRIENT_RECOMMENDATIONS[nutrientKey];
        const current = totals[nutrientKey];
        const percentage = (current / recommendation.recommended) * 100;

        // 色分けロジック（〜50%赤、50〜80%黄、80%〜緑、120%超は過剰赤）
        let statusClass = '';
        if (percentage > 120) {
            statusClass = 'danger';   // 赤色：過剰
        } else if (percentage < 50) {
            statusClass = 'danger';   // 赤色：大幅不足
        } else if (percentage < 80) {
            statusClass = 'warning';  // 黄色：不足気味
        }

        const progressPercentage = Math.min(percentage, 100);
        const overText = percentage > 120 ? `(+${(percentage - 100).toFixed(0)}%超過)` : '';

        const card = document.createElement('div');
        card.className = `nutrient-card ${statusClass}`;
        card.innerHTML = `
            <div class="nutrient-name">${recommendation.label}</div>
            <div class="nutrient-values">
                <div>
                    <span class="nutrient-current">${current.toFixed(1)}</span>
                    <span class="nutrient-unit">${recommendation.unit}</span>
                </div>
                <div class="nutrient-recommended">/ ${recommendation.recommended}</div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar ${statusClass}" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="nutrient-percentage">
                ${percentage.toFixed(0)}% <span class="nutrient-over">${overText}</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ===== フォームをリセット =====
function resetForm() {
    document.getElementById('mealForm').reset();
    clearSelectedFood();
    document.getElementById('quantity').focus();
}

// ===== 表示中の日の記録をリセット =====
function resetDayRecords() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    delete allRecords[targetDate];
    localStorage.setItem('mealRecords', JSON.stringify(allRecords));

    // 表示を更新
    displayMeals();
    displayMealHistory(currentMealType);
    updateNutrientsSummary();
    renderSuggestionSection();
}

// ===== ナビゲーションタブ =====
function setupNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;

            // タブボタンの切替
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // コンテンツの切替
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // 体重タブに切り替えた時は一覧を更新
            if (targetTab === 'weight') {
                displayWeightRecords();
            }

            // ダッシュボードタブに切り替えた時はグラフと分析を描画
            if (targetTab === 'dashboard') {
                renderWeightChart();
                renderDashboard();
            }
        });
    });
}

// ===== 食事記録の日付セレクター =====
function initMealDateSelector() {
    const prevBtn = document.getElementById('mealDatePrev');
    const nextBtn = document.getElementById('mealDateNext');
    const displayBtn = document.getElementById('mealDateDisplay');
    const datePicker = document.getElementById('mealDatePicker');

    prevBtn.addEventListener('click', () => {
        const d = new Date(currentMealDate);
        d.setDate(d.getDate() - 1);
        setMealDate(d.toISOString().split('T')[0]);
    });

    nextBtn.addEventListener('click', () => {
        const d = new Date(currentMealDate);
        d.setDate(d.getDate() + 1);
        setMealDate(d.toISOString().split('T')[0]);
    });

    // 日付表示ボタンをクリックするとdate pickerを開く
    displayBtn.addEventListener('click', () => {
        datePicker.value = currentMealDate;
        datePicker.showPicker();
    });

    datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
            setMealDate(e.target.value);
        }
    });

    updateMealDateDisplay();
}

function setMealDate(dateStr) {
    currentMealDate = dateStr;
    updateMealDateDisplay();
    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();
    displayMealHistory(currentMealType);
}

function updateMealDateDisplay() {
    const displayBtn = document.getElementById('mealDateDisplay');
    const banner = document.getElementById('plannedBanner');
    const titleEl = document.getElementById('mealsListTitle');
    const today = getTodayString();

    const d = new Date(currentMealDate);
    const options = { month: 'long', day: 'numeric', weekday: 'short' };
    let label = d.toLocaleDateString('ja-JP', options);

    const isToday = currentMealDate === today;
    const isFuture = currentMealDate > today;

    if (isToday) {
        label = '今日 — ' + label;
    } else {
        // 昨日・明日の判定
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (currentMealDate === yesterday.toISOString().split('T')[0]) {
            label = '昨日 — ' + label;
        } else if (currentMealDate === tomorrow.toISOString().split('T')[0]) {
            label = '明日 — ' + label;
        }
    }

    displayBtn.textContent = label;
    displayBtn.classList.toggle('is-today', isToday);
    displayBtn.classList.toggle('is-future', isFuture);

    // 未来日のバナー表示
    if (banner) {
        banner.classList.toggle('hidden', !isFuture);
    }

    // 食事一覧タイトルの更新
    if (titleEl) {
        if (isToday) {
            titleEl.textContent = '今日の食事一覧';
        } else if (isFuture) {
            titleEl.textContent = '食事の予定';
        } else {
            titleEl.textContent = `${d.getMonth() + 1}/${d.getDate()}の食事一覧`;
        }
    }
}

function isFutureDate(dateStr) {
    return dateStr > getTodayString();
}

// ===== ダッシュボード描画 =====
function renderDashboard() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const hasProfile = profile.pregnancyStartDate && profile.prePregnancyWeight && profile.height;
    const today = getTodayString();

    // プロフィール通知
    const notice = document.getElementById('dashboardProfileNotice');
    if (notice) notice.classList.toggle('hidden', !!hasProfile);

    // 妊娠週数サマリー
    const weekInfo = document.getElementById('dashboardWeekInfo');
    if (weekInfo && profile.pregnancyStartDate) {
        const week = getPregnancyWeek(profile.pregnancyStartDate);
        const trimester = getTrimester(week);
        const label = getTrimesterLabel(trimester);
        const dueDate = profile.dueDate ? new Date(profile.dueDate) : new Date(profile.pregnancyStartDate);
        if (!profile.dueDate) dueDate.setDate(dueDate.getDate() + 280);
        const dueDateStr = `${dueDate.getFullYear()}/${dueDate.getMonth()+1}/${dueDate.getDate()}`;
        const remainWeeks = 40 - (week || 0);

        weekInfo.innerHTML = `
            <div class="week-number">妊娠 ${week} 週</div>
            <div class="week-trimester">妊娠${label}（${trimester === 'first' ? '〜15週' : trimester === 'second' ? '16〜27週' : '28週〜'}）</div>
            <div class="week-due-date">出産予定日: ${dueDateStr}（あと約${remainWeeks}週）</div>
        `;
        weekInfo.classList.remove('hidden');
    } else if (weekInfo) {
        weekInfo.classList.add('hidden');
    }

    // 直近7日間の栄養バランス
    renderWeeklyNutrition();

    // 総合コンディション
    renderDashboardSummary();
}

function renderWeeklyNutrition() {
    const container = document.getElementById('nutritionWeeklyGrid');
    if (!container) return;

    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = new Date();
    const days = [];

    // 過去7日間の日付を生成
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    const dayLabels = days.map(d => {
        const date = new Date(d);
        const weekdays = ['日','月','火','水','木','金','土'];
        return `${date.getMonth()+1}/${date.getDate()}<br>${weekdays[date.getDay()]}`;
    });

    // 各日の各栄養素を集計
    const nutrients = ['calories', 'protein', 'iron', 'calcium', 'folate'];
    const nutrientLabels = {
        calories: 'カロリー',
        protein: 'タンパク質',
        iron: '鉄',
        calcium: 'カルシウム',
        folate: '葉酸'
    };

    let html = '';

    nutrients.forEach(nutrientKey => {
        const rec = NUTRIENT_RECOMMENDATIONS[nutrientKey];
        if (!rec) return;
        const recommended = rec.recommended;

        const dailyValues = days.map(dateStr => {
            const meals = allRecords[dateStr]?.meals || [];
            let total = 0;
            meals.forEach(m => { total += (m.nutrients && m.nutrients[nutrientKey]) || 0; });
            return total;
        });

        const nonZeroDays = dailyValues.filter(v => v > 0);
        const avg = nonZeroDays.length > 0
            ? Math.round(nonZeroDays.reduce((a,b) => a+b, 0) / nonZeroDays.length)
            : 0;
        const avgPct = recommended > 0 ? Math.round(avg / recommended * 100) : 0;

        const bars = dailyValues.map(val => {
            const pct = recommended > 0 ? Math.min(val / recommended * 100, 100) : 0;
            let cls = 'empty';
            if (val > 0) {
                const fullPct = recommended > 0 ? val / recommended * 100 : 0;
                if (fullPct >= 80 && fullPct <= 120) cls = 'good';
                else if (fullPct < 80) cls = 'warning';
                else cls = 'danger';
            }
            return `<div class="weekly-day-bar"><div class="weekly-day-fill ${cls}" style="height:${Math.max(pct, 4)}%"></div></div>`;
        });

        html += `
            <div class="weekly-nutrient-row">
                <div class="weekly-nutrient-label">
                    <span>${nutrientLabels[nutrientKey]}</span>
                    <span class="weekly-avg">平均 ${avg}${rec.unit}（${avgPct}%）</span>
                </div>
                <div class="weekly-bar-container">${bars.join('')}</div>
            </div>
        `;
    });

    // 曜日ラベル
    html += `<div class="weekly-day-labels">${dayLabels.map(l => `<div class="weekly-day-label">${l}</div>`).join('')}</div>`;

    container.innerHTML = html;
}

function renderDashboardSummary() {
    const container = document.getElementById('dashboardSummary');
    if (!container) return;

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const records = JSON.parse(localStorage.getItem('weightRecords') || '[]');
    const allMealRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = getTodayString();
    const items = [];

    // 1) 体重評価
    if (records.length > 0 && profile.prePregnancyWeight && profile.height) {
        const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));
        const latest = sorted[0];
        const gain = latest.weight - profile.prePregnancyWeight;
        const heightM = profile.height / 100;
        const bmi = profile.prePregnancyWeight / (heightM * heightM);
        const range = getRecommendedGainRange(bmi);

        let week = profile.pregnancyStartDate
            ? getPregnancyWeek(profile.pregnancyStartDate, new Date(latest.date))
            : null;
        const expectedMinGain = week ? range.min * week / 40 : range.min;
        const expectedMaxGain = week ? range.max * week / 40 : range.max;

        let icon, cls, title, detail;
        if (gain >= expectedMinGain && gain <= expectedMaxGain) {
            icon = '✓'; cls = 'good';
            title = '体重増加は順調です';
            detail = `現在 +${gain.toFixed(1)}kg（推奨範囲: +${expectedMinGain.toFixed(1)}〜+${expectedMaxGain.toFixed(1)}kg）`;
        } else if (gain < expectedMinGain) {
            icon = '!'; cls = 'warning';
            title = '体重増加がやや少なめです';
            detail = `現在 +${gain.toFixed(1)}kg（推奨: +${expectedMinGain.toFixed(1)}kg以上）`;
        } else {
            icon = '!'; cls = 'warning';
            title = '体重増加がやや多めです';
            detail = `現在 +${gain.toFixed(1)}kg（推奨: +${expectedMaxGain.toFixed(1)}kg以下）`;
        }
        items.push({ icon, cls, title, detail });
    } else if (records.length === 0) {
        items.push({ icon: '?', cls: 'warning', title: '体重記録がありません', detail: '体重記録タブで記録を始めましょう', action: { label: '体重を記録する', tab: 'weight' } });
    }

    // 2) 直近3日のカロリー評価
    const recentDays = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        recentDays.push(d.toISOString().split('T')[0]);
    }
    const recentCalories = recentDays.map(dateStr => {
        const meals = allMealRecords[dateStr]?.meals || [];
        return meals.reduce((sum, m) => sum + ((m.nutrients && m.nutrients.calories) || 0), 0);
    });
    const daysWithData = recentCalories.filter(c => c > 0);
    if (daysWithData.length > 0) {
        const avgCal = Math.round(daysWithData.reduce((a,b) => a+b, 0) / daysWithData.length);
        const recCal = NUTRIENT_RECOMMENDATIONS.calories?.recommended || 2250;
        const calPct = Math.round(avgCal / recCal * 100);

        let icon, cls, title, detail;
        if (calPct >= 80 && calPct <= 110) {
            icon = '✓'; cls = 'good';
            title = 'カロリー摂取は適切です';
        } else if (calPct < 80) {
            icon = '!'; cls = 'warning';
            title = 'カロリーがやや不足気味です';
        } else {
            icon = '!'; cls = 'warning';
            title = 'カロリーがやや過剰気味です';
        }
        detail = `直近平均 ${avgCal} kcal / 推奨 ${recCal} kcal（${calPct}%）`;
        items.push({ icon, cls, title, detail });
    }

    // 3) 不足栄養素チェック（直近3日平均）
    const nutrientDays = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        nutrientDays.push(d.toISOString().split('T')[0]);
    }
    const nutrientTotals = { iron: 0, folate: 0, calcium: 0, protein: 0 };
    let nutrientDataDays = 0;
    nutrientDays.forEach(dateStr => {
        const meals = allMealRecords[dateStr]?.meals || [];
        if (meals.length > 0) {
            nutrientDataDays++;
            meals.forEach(m => {
                Object.keys(nutrientTotals).forEach(k => {
                    nutrientTotals[k] += (m.nutrients && m.nutrients[k]) || 0;
                });
            });
        }
    });

    if (nutrientDataDays > 0) {
        const deficient = [];
        Object.keys(nutrientTotals).forEach(key => {
            const avg = nutrientTotals[key] / nutrientDataDays;
            const rec = NUTRIENT_RECOMMENDATIONS[key];
            if (rec && avg < rec.recommended * 0.5) {
                deficient.push(rec.label);
            }
        });

        if (deficient.length > 0) {
            items.push({
                icon: '!', cls: 'danger',
                title: `不足栄養素（3日平均）: ${deficient.join('、')}`,
                detail: '推奨量の50%未満です。意識して摂取しましょう',
                action: { label: '食事記録を見る', tab: 'meals' }
            });
        } else {
            items.push({
                icon: '✓', cls: 'good',
                title: '直近3日の栄養バランスは良好です',
                detail: '主要栄養素がバランスよく摂取できています',
                action: { label: '食事記録を見る', tab: 'meals' }
            });
        }
    } else {
        items.push({
            icon: '?', cls: 'warning',
            title: '食事記録がありません',
            detail: '食事記録タブで記録を始めましょう',
            action: { label: '食事記録を見る', tab: 'meals' }
        });
    }

    container.innerHTML = items.map(item => `
        <div class="dashboard-summary-item">
            <div class="summary-icon ${item.cls}">${item.icon}</div>
            <div class="summary-text">
                <div class="summary-title">${item.title}</div>
                <div class="summary-detail">${item.detail}</div>
                ${item.action ? `<a href="#" class="summary-action-link" data-tab="${item.action.tab}">${item.action.label}</a>` : ''}
            </div>
        </div>
    `).join('');

    // アクションリンクのイベント
    container.querySelectorAll('.summary-action-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = e.target.dataset.tab;
            // タブを切り替え
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            const targetNavTab = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
            if (targetNavTab) targetNavTab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const targetContent = document.getElementById(`tab-${tab}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

// ===== 栄養素基準データの読み込みと動的推奨量設定 =====
function loadNutrientsData() {
    fetch('data/nutrients.json')
        .then(response => response.json())
        .then(data => {
            nutrientsData = data.nutrients;
            updateRecommendationsForTrimester();
        })
        .catch(error => {
            console.warn('nutrients.json の読み込みに失敗しました。デフォルト値を使用します。', error);
        });
}

function updateRecommendationsForTrimester() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const weekDisplay = document.getElementById('pregnancyWeekDisplay');

    if (!profile.pregnancyStartDate) {
        // 妊娠開始日未設定の場合はデフォルト（中期）を維持
        if (weekDisplay) weekDisplay.classList.add('hidden');
        return;
    }

    const week = getPregnancyWeek(profile.pregnancyStartDate);
    const trimester = getTrimester(week);
    const trimesterLabel = getTrimesterLabel(trimester);
    const trimesterKey = `${trimester}Trimester`;

    // 妊娠週数・時期を表示
    if (weekDisplay) {
        weekDisplay.textContent = `現在: 妊娠${week}週（${trimesterLabel}）`;
        weekDisplay.classList.remove('hidden');
    }

    // nutrients.json のデータがある場合は推奨量を更新
    if (nutrientsData) {
        const labelMap = {
            calories: 'カロリー',
            protein: 'タンパク質',
            fat: '脂質',
            carbohydrate: '炭水化物',
            iron: '鉄',
            calcium: 'カルシウム',
            folate: '葉酸'
        };

        nutrientsData.forEach(nutrient => {
            const id = nutrient.nutrientId;
            if (NUTRIENT_RECOMMENDATIONS[id]) {
                NUTRIENT_RECOMMENDATIONS[id].recommended = nutrient[trimesterKey];
                NUTRIENT_RECOMMENDATIONS[id].label = labelMap[id] || nutrient.name;
                NUTRIENT_RECOMMENDATIONS[id].unit = nutrient.unit;
            }
        });
    }

    // サマリーを再描画
    updateNutrientsSummary();
    renderSuggestionSection();
}

// ===== プロフィール設定 =====
function initProfileSettings() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

    // 保存済みの値を表示
    if (profile.pregnancyStartDate) {
        document.getElementById('pregnancyStartDate').value = profile.pregnancyStartDate;
    }
    if (profile.dueDate) {
        document.getElementById('dueDate').value = profile.dueDate;
    }
    if (profile.prePregnancyWeight) {
        document.getElementById('prePregnancyWeight').value = profile.prePregnancyWeight;
    }
    if (profile.height) {
        document.getElementById('userHeight').value = profile.height;
    }

    // BMI表示を更新
    updateBMIDisplay();
    // 妊娠日計算表示を更新
    updatePregnancyCalcDisplay();

    // BMI自動計算（入力変更時）
    document.getElementById('prePregnancyWeight').addEventListener('input', updateBMIDisplay);
    document.getElementById('userHeight').addEventListener('input', updateBMIDisplay);

    // 妊娠開始日 → 出産予定日を自動計算
    document.getElementById('pregnancyStartDate').addEventListener('change', (e) => {
        if (e.target.value) {
            const start = new Date(e.target.value);
            const due = new Date(start);
            due.setDate(due.getDate() + 280); // 40週 = 280日
            document.getElementById('dueDate').value = due.toISOString().split('T')[0];
        }
        updatePregnancyCalcDisplay();
    });

    // 出産予定日 → 妊娠開始日を自動計算
    document.getElementById('dueDate').addEventListener('change', (e) => {
        if (e.target.value) {
            const due = new Date(e.target.value);
            const start = new Date(due);
            start.setDate(start.getDate() - 280);
            document.getElementById('pregnancyStartDate').value = start.toISOString().split('T')[0];
        }
        updatePregnancyCalcDisplay();
    });

    // フォーム送信
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfile();
    });
}

function updatePregnancyCalcDisplay() {
    const startVal = document.getElementById('pregnancyStartDate').value;
    const dueVal = document.getElementById('dueDate').value;
    const calcEl = document.getElementById('pregnancyCalcDisplay');
    const calcText = document.getElementById('pregnancyCalcText');

    if (startVal) {
        const week = getPregnancyWeek(startVal);
        if (week !== null) {
            const trimester = getTrimester(week);
            const label = getTrimesterLabel(trimester);
            const dueDate = dueVal ? new Date(dueVal) : null;
            let dueStr = '';
            if (dueDate) {
                const remainWeeks = Math.max(0, 40 - week);
                dueStr = ` / 出産予定日: ${dueDate.getFullYear()}/${dueDate.getMonth()+1}/${dueDate.getDate()}（あと約${remainWeeks}週）`;
            }
            calcText.innerHTML = `現在 <strong>妊娠${week}週</strong>（${label}）${dueStr}`;
            calcEl.classList.remove('hidden');
            return;
        }
    }
    calcEl.classList.add('hidden');
}

function updateBMIDisplay() {
    const weight = parseFloat(document.getElementById('prePregnancyWeight').value);
    const height = parseFloat(document.getElementById('userHeight').value);
    const bmiEl = document.getElementById('bmiDisplay');
    const bmiValueEl = document.getElementById('bmiValue');
    const bmiCategoryEl = document.getElementById('bmiCategory');

    if (!isNaN(weight) && !isNaN(height) && weight > 0 && height > 0) {
        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);
        bmiValueEl.textContent = bmi.toFixed(1);

        let category = '';
        if (bmi < 18.5) category = 'やせ型 — 推奨増加: +9〜12kg';
        else if (bmi < 25.0) category = '標準 — 推奨増加: +7〜12kg';
        else category = '肥満 — 推奨増加: 約+5kg';
        bmiCategoryEl.textContent = category;

        bmiEl.classList.remove('hidden');
    } else {
        bmiEl.classList.add('hidden');
    }
}

function saveProfile() {
    const pregnancyStartDate = document.getElementById('pregnancyStartDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const prePregnancyWeight = parseFloat(document.getElementById('prePregnancyWeight').value);
    const height = parseFloat(document.getElementById('userHeight').value);

    const profile = {};
    if (pregnancyStartDate) profile.pregnancyStartDate = pregnancyStartDate;
    if (dueDate) profile.dueDate = dueDate;
    if (!isNaN(prePregnancyWeight)) profile.prePregnancyWeight = prePregnancyWeight;
    if (!isNaN(height)) profile.height = height;

    localStorage.setItem('userProfile', JSON.stringify(profile));

    // 推奨量を再計算
    updateRecommendationsForTrimester();

    // 体重グラフを再描画（基準線更新のため）
    renderWeightChart();
    displayWeightRecords();

    // 保存メッセージ表示
    const msg = document.getElementById('profileSaveMessage');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
}

// ===== ユーティリティ関数 =====

// 本日の日付を YYYY-MM-DD 形式で取得
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// UUID を生成
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// カテゴリラベルを取得
function getCategoryLabel(category) {
    const labels = {
        grain: '穀類',
        protein: 'タンパク質',
        vegetable: '野菜',
        fruit: '果物',
        dairy: '乳製品',
        oil: '油脂',
        other: 'その他'
    };
    return labels[category] || category;
}

// フォームエラーを表示
function showFormError(message) {
    const errorEl = document.getElementById('formErrorMessage');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// フォームエラーをクリア
function clearFormError() {
    const errorEl = document.getElementById('formErrorMessage');
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
}

// ===== 履歴に追加 =====
function addToHistory(mealItem) {
    const mealHistory = JSON.parse(localStorage.getItem('mealHistory') || '{}');

    // 食事タイプごとの配列を初期化
    if (!mealHistory[mealItem.mealType]) {
        mealHistory[mealItem.mealType] = [];
    }

    // 同じfoodIdの履歴を検索
    const existingIndex = mealHistory[mealItem.mealType].findIndex(
        item => item.foodId === mealItem.foodId && item.unitName === mealItem.displayUnit
    );

    const today = getTodayString();

    if (existingIndex >= 0) {
        // 既存の履歴を更新（countを増やし、lastUsedを更新）
        mealHistory[mealItem.mealType][existingIndex].count += 1;
        mealHistory[mealItem.mealType][existingIndex].lastUsed = today;
    } else {
        // 新規履歴を追加
        mealHistory[mealItem.mealType].push({
            foodId: mealItem.foodId,
            foodName: mealItem.foodName,
            quantity: mealItem.displayQuantity,
            unitName: mealItem.displayUnit,
            count: 1,
            lastUsed: today
        });
    }

    // ソート: countが多い順 → lastUsedが新しい順
    mealHistory[mealItem.mealType].sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;  // countが多い順
        }
        return new Date(b.lastUsed) - new Date(a.lastUsed);  // lastUsedが新しい順
    });

    // 最大20件まで保持
    if (mealHistory[mealItem.mealType].length > 20) {
        mealHistory[mealItem.mealType] = mealHistory[mealItem.mealType].slice(0, 20);
    }

    // localStorage に保存
    localStorage.setItem('mealHistory', JSON.stringify(mealHistory));
}

// ===== 食事タイプの履歴を表示 =====
function displayMealHistory(mealType) {
    const mealHistory = JSON.parse(localStorage.getItem('mealHistory') || '{}');
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');

    const history = mealHistory[mealType] || [];

    if (history.length === 0) {
        historySection.classList.add('hidden');
        return;
    }

    historySection.classList.remove('hidden');

    // 履歴チップを生成
    historyList.innerHTML = history.map((item, index) => `
        <div class="history-chip" data-index="${index}" data-meal-type="${mealType}">
            <span class="history-chip-text" data-index="${index}" data-meal-type="${mealType}">${item.foodName} (${item.quantity}${item.unitName})</span>
            <span class="history-chip-delete" data-index="${index}" data-meal-type="${mealType}">&times;</span>
        </div>
    `).join('');

    // チップテキストをクリック時の処理（食品選択）
    historyList.querySelectorAll('.history-chip-text').forEach(chip => {
        chip.addEventListener('click', () => {
            const index = parseInt(chip.dataset.index);
            const mealType = chip.dataset.mealType;
            loadHistoryItem(index, mealType);
        });
    });

    // チップの削除ボタンをクリック時の処理
    historyList.querySelectorAll('.history-chip-delete').forEach(deleteBtn => {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(deleteBtn.dataset.index);
            const mealType = deleteBtn.dataset.mealType;
            deleteHistoryItem(index, mealType);
        });
    });
}

// ===== 履歴アイテムを削除 =====
function deleteHistoryItem(index, mealType) {
    const mealHistory = JSON.parse(localStorage.getItem('mealHistory') || '{}');
    if (mealHistory[mealType] && index < mealHistory[mealType].length) {
        mealHistory[mealType].splice(index, 1);
        localStorage.setItem('mealHistory', JSON.stringify(mealHistory));
        displayMealHistory(mealType);
    }
}

// ===== 履歴アイテムを読み込む =====
function loadHistoryItem(index, mealType) {
    const mealHistory = JSON.parse(localStorage.getItem('mealHistory') || '{}');
    const history = mealHistory[mealType] || [];

    if (index < 0 || index >= history.length) {
        return;
    }

    const item = history[index];
    const food = foodMasterData.find(f => f.foodId === item.foodId);

    if (!food) {
        return;
    }

    // 食品を選択
    selectedFood = food;
    document.getElementById('foodSearch').value = food.name;
    document.getElementById('selectedFoodDisplay').classList.remove('hidden');
    document.getElementById('selectedFoodName').textContent = food.name;
    hideFoodSuggestions();

    // 単位セレクトを更新
    updateUnitSelect(food);

    // 単位を合致する値に設定
    const unitSelect = document.getElementById('unitSelect');
    for (let option of unitSelect.options) {
        if (option.textContent === item.unitName) {
            unitSelect.value = option.value;
            break;
        }
    }

    // 数量を入力
    document.getElementById('quantity').value = item.quantity;
    updateQuantityHint();

    // フォーカスをボタンへ
    document.querySelector('.btn-add').focus();
}

// ===== オリジナル食品モーダル: 現在のモード =====
let customFoodMode = 'lookup';
let lookupSelectedFood = null;  // lookupモードで選択した類似食品
let recipeIngredients = [];     // recipeモードの食材リスト
let editingCustomFoodId = null; // 編集中のオリジナル食品ID（nullなら新規登録）

// ===== モーダルを開く（初期化付き） =====
function openCustomFoodModal() {
    document.getElementById('customFoodModal').classList.remove('hidden');
    // フォームリセット
    document.getElementById('customFoodForm').reset();
    lookupSelectedFood = null;
    recipeIngredients = [];
    editingCustomFoodId = null;
    document.getElementById('lookupResult').classList.add('hidden');
    document.getElementById('recipeIngredients').innerHTML = '';
    document.getElementById('recipeNutrientPreview').classList.add('hidden');
    // ペーストモードのリセット
    pasteAnalyzedIngredients = [];
    document.getElementById('pasteRecipeText').value = '';
    document.getElementById('pasteAnalyzeStatus').classList.add('hidden');
    document.getElementById('pasteResultPreview').classList.add('hidden');
    // モーダルタイトルを新規登録に戻す
    document.querySelector('#customFoodModal .modal-header h3').textContent = 'オリジナル食品を登録';
    document.querySelector('#customFoodForm .btn-primary').textContent = '登録する';
    // デフォルトモードに戻す
    switchCustomFoodMode('lookup');
}

// ===== モード切替 =====
function switchCustomFoodMode(mode) {
    customFoodMode = mode;

    // タブの active 切替
    document.querySelectorAll('.custom-mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // パネルの表示切替
    document.getElementById('modeLookup').classList.toggle('hidden', mode !== 'lookup');
    document.getElementById('modeRecipe').classList.toggle('hidden', mode !== 'recipe');
    document.getElementById('modePaste').classList.toggle('hidden', mode !== 'paste');
    document.getElementById('modeManual').classList.toggle('hidden', mode !== 'manual');

    // 栄養素入力グリッドの表示制御
    const grid = document.getElementById('nutrientInputGrid');
    if (mode === 'recipe' || mode === 'paste') {
        // レシピモード/貼り付けモードでは自動計算するので入力グリッドを非表示
        grid.classList.add('hidden');
    } else {
        grid.classList.remove('hidden');
    }
}

// ===== Lookupモード: 類似食品の検索候補を表示 =====
function showLookupSuggestions(searchTerm) {
    const container = document.getElementById('lookupSuggestions');
    const matched = fuzzySearchFoods(searchTerm).slice(0, 10);

    if (matched.length === 0) {
        container.innerHTML = '<div class="food-suggestion-item"><p>該当する食品が見つかりません</p></div>';
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = matched.map(food => `
        <div class="food-suggestion-item" data-food-id="${food.foodId}">
            <p class="food-suggestion-name">${food.name}</p>
            <p class="food-suggestion-category">${getCategoryLabel(food.category)} - ${food.calories}kcal/100g</p>
        </div>
    `).join('');

    container.querySelectorAll('.food-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const foodId = item.dataset.foodId;
            selectLookupFood(foodId);
        });
    });

    container.classList.remove('hidden');
}

// ===== Lookupモード: 類似食品を選択して栄養素を表示 =====
function selectLookupFood(foodId) {
    const food = foodMasterData.find(f => f.foodId === foodId);
    if (!food) return;

    lookupSelectedFood = food;
    document.getElementById('lookupSuggestions').classList.add('hidden');
    document.getElementById('lookupSearch').value = food.name;

    // 栄養素を表示
    document.getElementById('lookupFoodName').textContent = food.name;
    document.getElementById('lookupCal').textContent = food.calories;
    document.getElementById('lookupPro').textContent = food.protein;
    document.getElementById('lookupFat').textContent = food.fat;
    document.getElementById('lookupCarb').textContent = food.carbohydrate;
    document.getElementById('lookupIron').textContent = food.iron;
    document.getElementById('lookupCalcium').textContent = food.calcium;
    document.getElementById('lookupFolate').textContent = food.folate;

    document.getElementById('lookupResult').classList.remove('hidden');
}

// ===== Lookupモード: 栄養素を入力欄に反映 =====
function applyLookupNutrients() {
    if (!lookupSelectedFood) return;

    document.getElementById('customCalories').value = lookupSelectedFood.calories;
    document.getElementById('customProtein').value = lookupSelectedFood.protein;
    document.getElementById('customFat').value = lookupSelectedFood.fat;
    document.getElementById('customCarb').value = lookupSelectedFood.carbohydrate;
    document.getElementById('customIron').value = lookupSelectedFood.iron;
    document.getElementById('customCalcium').value = lookupSelectedFood.calcium;
    document.getElementById('customFolate').value = lookupSelectedFood.folate;

    // 適用済みの視覚フィードバック
    document.getElementById('applyLookupBtn').textContent = '適用済み ✓';
    setTimeout(() => {
        document.getElementById('applyLookupBtn').textContent = 'この栄養素を使う';
    }, 2000);
}

// ===== Recipeモード: 食材検索候補を表示 =====
function showRecipeAddSuggestions(searchTerm) {
    const container = document.getElementById('recipeAddSuggestions');
    // 料理以外の食材を検索
    const matched = fuzzySearchFoods(searchTerm).filter(f => !f.ingredients).slice(0, 8);

    if (matched.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.innerHTML = matched.map(food => `
        <div class="food-suggestion-item" data-food-id="${food.foodId}">
            <p class="food-suggestion-name">${food.name}</p>
            <p class="food-suggestion-category">${getCategoryLabel(food.category)}</p>
        </div>
    `).join('');

    container.querySelectorAll('.food-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const foodId = item.dataset.foodId;
            addRecipeIngredient(foodId);
        });
    });

    container.classList.remove('hidden');
}

// ===== Recipeモード: 食材を追加 =====
function addRecipeIngredient(foodId) {
    const food = foodMasterData.find(f => f.foodId === foodId);
    if (!food) return;

    recipeIngredients.push({
        foodId: food.foodId,
        name: food.name,
        amount: 100  // デフォルト100g
    });

    document.getElementById('recipeAddSearch').value = '';
    document.getElementById('recipeAddSuggestions').classList.add('hidden');

    renderRecipeIngredients();
    updateRecipeNutrientPreview();
}

// ===== Recipeモード: 食材一覧を描画 =====
function renderRecipeIngredients() {
    const container = document.getElementById('recipeIngredients');

    if (recipeIngredients.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = recipeIngredients.map((ing, i) => `
        <div class="recipe-ingredient-row" data-index="${i}">
            <span class="recipe-ingredient-name">${ing.name}</span>
            <input type="number" class="recipe-ingredient-amount" value="${ing.amount}" min="1" step="any" data-index="${i}">
            <span class="recipe-ingredient-unit">g</span>
            <button type="button" class="recipe-ingredient-remove" data-index="${i}">&times;</button>
        </div>
    `).join('');

    // 量の変更イベント
    container.querySelectorAll('.recipe-ingredient-amount').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            recipeIngredients[idx].amount = parseFloat(e.target.value) || 0;
            updateRecipeNutrientPreview();
        });
    });

    // 食材削除イベント
    container.querySelectorAll('.recipe-ingredient-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            recipeIngredients.splice(idx, 1);
            renderRecipeIngredients();
            updateRecipeNutrientPreview();
        });
    });
}

// ===== Recipeモード: 栄養素プレビューを更新 =====
function updateRecipeNutrientPreview() {
    const preview = document.getElementById('recipeNutrientPreview');

    if (recipeIngredients.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    const servings = parseInt(document.getElementById('recipeServings').value) || 1;

    // 全食材の栄養素を合計
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0 };
    let totalGrams = 0;

    recipeIngredients.forEach(ing => {
        const food = foodMasterData.find(f => f.foodId === ing.foodId);
        if (!food || ing.amount <= 0) return;

        const n = calculateNutrients(food, ing.amount);
        if (n) {
            Object.keys(totals).forEach(key => { totals[key] += n[key]; });
            totalGrams += ing.amount;
        }
    });

    // 1人前あたりに換算
    const perServing = {};
    Object.keys(totals).forEach(key => {
        perServing[key] = Math.round(totals[key] / servings * 10) / 10;
    });

    // 1人前の重量
    const gramsPerServing = Math.round(totalGrams / servings);

    // 100gあたりに換算
    const per100g = {};
    if (gramsPerServing > 0) {
        Object.keys(perServing).forEach(key => {
            per100g[key] = Math.round(perServing[key] / gramsPerServing * 100 * 10) / 10;
        });
    }

    // プレビュー表示
    const valuesEl = document.getElementById('recipeNutrientValues');
    valuesEl.innerHTML = `
        <span>カロリー: <strong>${per100g.calories || 0}</strong>kcal</span>
        <span>タンパク質: <strong>${per100g.protein || 0}</strong>g</span>
        <span>脂質: <strong>${per100g.fat || 0}</strong>g</span>
        <span>炭水化物: <strong>${per100g.carbohydrate || 0}</strong>g</span>
        <span>鉄: <strong>${per100g.iron || 0}</strong>mg</span>
        <span>Ca: <strong>${per100g.calcium || 0}</strong>mg</span>
        <span>葉酸: <strong>${per100g.folate || 0}</strong>μg</span>
        <span style="color:var(--light-text); font-size:0.75rem">（1人前 約${gramsPerServing}g）</span>
    `;

    preview.classList.remove('hidden');
}

// ===== オリジナル食品をfoodMasterDataにマージ =====
function mergeCustomFoods() {
    const custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
    // 既に存在するIDは除外して追加
    const existingIds = new Set(foodMasterData.map(f => f.foodId));
    custom.forEach(f => {
        if (!existingIds.has(f.foodId)) {
            foodMasterData.push(f);
        }
    });
}

// ===== オリジナル食品を登録 =====
function registerCustomFood() {
    const name = document.getElementById('customFoodName').value.trim();
    if (!name) {
        alert('食品名を入力してください');
        return;
    }

    let custom = JSON.parse(localStorage.getItem('customFoods') || '[]');

    // 同一名称チェック（編集中の食品自身は除外）
    const duplicate = custom.find(f => f.name === name && f.foodId !== editingCustomFoodId);
    if (duplicate) {
        alert(`「${name}」は既に登録されています。別の名前を入力してください。`);
        return;
    }

    const foodId = editingCustomFoodId || ('custom-' + Date.now());

    // 単位の構築
    const units = [{ name: 'g', label: 'g', gramsPerUnit: 1 }];
    let defaultUnit = 'g';
    const unitLabel = document.getElementById('customUnitLabel').value.trim();
    const unitGrams = parseFloat(document.getElementById('customUnitGrams').value);
    if (unitLabel && unitGrams > 0) {
        units.push({ name: 'custom', label: unitLabel, gramsPerUnit: unitGrams });
        defaultUnit = 'custom';
    }

    let nutrients;
    let savedIngredients = null;

    if (customFoodMode === 'recipe' && recipeIngredients.length > 0) {
        // レシピモード: 食材から100gあたりの栄養素を計算
        const servings = parseInt(document.getElementById('recipeServings').value) || 1;
        const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0 };
        let totalGrams = 0;

        recipeIngredients.forEach(ing => {
            const food = foodMasterData.find(f => f.foodId === ing.foodId);
            if (!food || ing.amount <= 0) return;
            const n = calculateNutrients(food, ing.amount);
            if (n) {
                Object.keys(totals).forEach(key => { totals[key] += n[key]; });
                totalGrams += ing.amount;
            }
        });

        const gramsPerServing = totalGrams / servings;
        nutrients = {};
        if (gramsPerServing > 0) {
            Object.keys(totals).forEach(key => {
                nutrients[key] = Math.round(totals[key] / servings / gramsPerServing * 100 * 10) / 10;
            });
        } else {
            Object.keys(totals).forEach(key => { nutrients[key] = 0; });
        }

        // 食材情報を保存
        savedIngredients = recipeIngredients.map(ing => ({
            name: ing.name,
            amount: ing.amount + 'g'
        }));

        // 1人前の単位も自動追加
        if (gramsPerServing > 0) {
            const gramsRounded = Math.round(gramsPerServing);
            units.push({ name: 'serving', label: `人前 (${gramsRounded}g)`, gramsPerUnit: gramsRounded });
            if (!unitLabel) defaultUnit = 'serving';
        }
    } else {
        // lookup / manual モード: 入力欄の値を使用
        nutrients = {
            calories: parseFloat(document.getElementById('customCalories').value) || 0,
            protein: parseFloat(document.getElementById('customProtein').value) || 0,
            fat: parseFloat(document.getElementById('customFat').value) || 0,
            carbohydrate: parseFloat(document.getElementById('customCarb').value) || 0,
            iron: parseFloat(document.getElementById('customIron').value) || 0,
            calcium: parseFloat(document.getElementById('customCalcium').value) || 0,
            folate: parseFloat(document.getElementById('customFolate').value) || 0
        };
    }

    const food = {
        foodId: foodId,
        name: name,
        nameKana: '',
        keywords: [name],
        calories: nutrients.calories,
        protein: nutrients.protein,
        fat: nutrients.fat,
        carbohydrate: nutrients.carbohydrate,
        iron: nutrients.iron,
        calcium: nutrients.calcium,
        folate: nutrients.folate,
        category: document.getElementById('customFoodCategory').value,
        units: units,
        defaultUnit: defaultUnit,
        ingredients: savedIngredients,
        isCustom: true
    };

    // localStorageに保存
    if (editingCustomFoodId) {
        // 編集モード: 既存を差し替え
        custom = custom.map(f => f.foodId === editingCustomFoodId ? food : f);
        // foodMasterDataも差し替え
        const idx = foodMasterData.findIndex(f => f.foodId === editingCustomFoodId);
        if (idx >= 0) {
            foodMasterData[idx] = food;
        } else {
            foodMasterData.push(food);
        }
    } else {
        // 新規登録
        custom.push(food);
        foodMasterData.push(food);
    }
    localStorage.setItem('customFoods', JSON.stringify(custom));

    // モーダルを閉じてリセット
    document.getElementById('customFoodModal').classList.add('hidden');
    document.getElementById('customFoodForm').reset();
    lookupSelectedFood = null;
    recipeIngredients = [];
    const wasEditing = editingCustomFoodId;
    editingCustomFoodId = null;

    // 一覧を更新
    displayCustomFoods();
    console.log(`オリジナル食品「${name}」を${wasEditing ? '更新' : '登録'}しました`);
}

// ===== オリジナル食品一覧を表示 =====
function displayCustomFoods() {
    const custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
    const container = document.getElementById('customFoodsList');

    if (custom.length === 0) {
        container.innerHTML = '<p class="custom-foods-empty">登録された食品はありません</p>';
        return;
    }

    container.innerHTML = custom.map(food => `
        <div class="custom-food-item">
            <div class="custom-food-info">
                <span class="custom-food-name">${food.name}</span>
                <span class="custom-food-cal">${food.calories}kcal/100g</span>
            </div>
            <div class="custom-food-actions">
                <button type="button" class="btn-edit custom-food-edit" data-food-id="${food.foodId}">編集</button>
                <button type="button" class="btn-delete custom-food-delete" data-food-id="${food.foodId}">削除</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.custom-food-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const foodId = e.target.dataset.foodId;
            editCustomFood(foodId);
        });
    });

    container.querySelectorAll('.custom-food-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const foodId = e.target.dataset.foodId;
            deleteCustomFood(foodId);
        });
    });
}

// ===== オリジナル食品を編集 =====
function editCustomFood(foodId) {
    const custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
    const food = custom.find(f => f.foodId === foodId);
    if (!food) return;

    // モーダルを開く（リセット付き）
    openCustomFoodModal();

    // 編集モードに設定
    editingCustomFoodId = foodId;
    document.querySelector('#customFoodModal .modal-header h3').textContent = 'オリジナル食品を編集';
    document.querySelector('#customFoodForm .btn-primary').textContent = '更新する';

    // 基本情報を復元
    document.getElementById('customFoodName').value = food.name;
    document.getElementById('customFoodCategory').value = food.category || 'other';

    // カスタム単位を復元
    if (food.units) {
        const customUnit = food.units.find(u => u.name === 'custom');
        if (customUnit) {
            document.getElementById('customUnitLabel').value = customUnit.label;
            document.getElementById('customUnitGrams').value = customUnit.gramsPerUnit;
        }
    }

    // 栄養素を復元
    document.getElementById('customCalories').value = food.calories || 0;
    document.getElementById('customProtein').value = food.protein || 0;
    document.getElementById('customFat').value = food.fat || 0;
    document.getElementById('customCarb').value = food.carbohydrate || 0;
    document.getElementById('customIron').value = food.iron || 0;
    document.getElementById('customCalcium').value = food.calcium || 0;
    document.getElementById('customFolate').value = food.folate || 0;

    // 食材情報がある場合はレシピモードで復元
    if (food.ingredients && food.ingredients.length > 0) {
        recipeIngredients = food.ingredients.map(ing => {
            // 食品マスタからfoodIdを検索
            const matched = foodMasterData.find(f =>
                f.name === ing.name || f.name.includes(ing.name) || ing.name.includes(f.name)
            );
            return {
                foodId: matched ? matched.foodId : null,
                name: ing.name,
                amount: parseFloat(ing.amount) || 100
            };
        });

        // 人前数を復元（servingユニットのグラム数から逆算）
        if (food.units) {
            const servingUnit = food.units.find(u => u.name === 'serving');
            if (servingUnit) {
                const totalGrams = recipeIngredients.reduce((sum, ing) => sum + ing.amount, 0);
                const estimatedServings = Math.round(totalGrams / servingUnit.gramsPerUnit);
                if (estimatedServings > 0) {
                    document.getElementById('recipeServings').value = estimatedServings;
                }
            }
        }

        switchCustomFoodMode('recipe');
        renderRecipeIngredients();
        updateRecipeNutrientPreview();
    } else {
        // 食材情報がない場合は手動モード
        switchCustomFoodMode('manual');
    }
}

// ===== API設定: ステータス表示を更新 =====
function updateApiKeyStatus() {
    const statusEl = document.getElementById('apiKeyStatus');
    const key = localStorage.getItem('claudeApiKey');
    if (key) {
        statusEl.textContent = 'APIキー設定済み（' + key.slice(0, 10) + '...）';
        statusEl.style.color = 'var(--success-green)';
    } else {
        statusEl.textContent = 'APIキー未設定（ローカル解析を使用）';
        statusEl.style.color = 'var(--light-text)';
    }
}

// ===== 単位換算テーブル（調味料等のグラム変換） =====
const UNIT_CONVERSION = {
    '大さじ': 15,
    '小さじ': 5,
    'カップ': 200,
    'cc': 1,
    'ml': 1,
    'L': 1000,
};

// ===== ローカル正規表現パーサー =====
function parseRecipeText(text) {
    const results = [];

    // === 前処理: テキスト正規化 ===
    let normalized = text;
    // 全角数字→半角数字
    normalized = normalized.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    // 全角英字→半角英字（g, L, etc.）
    normalized = normalized.replace(/[ａ-ｚＡ-Ｚ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    // 全角スペース→半角スペース
    normalized = normalized.replace(/\u3000/g, ' ');
    // タブ→スペース
    normalized = normalized.replace(/\t/g, ' ');

    // === 分量が改行されているケースに対応 ===
    // 「食材名\n 300g」のように次の行が数量+単位だけの場合、前の行と結合
    const rawLines = normalized.split(/\n/);
    const mergedLines = [];
    for (let i = 0; i < rawLines.length; i++) {
        const current = rawLines[i].trim();
        if (!current) continue;

        // 現在の行が「数量+単位」だけの場合、直前の行と結合
        if (mergedLines.length > 0 && isQuantityOnlyLine(current)) {
            mergedLines[mergedLines.length - 1] += ' ' + current;
        } else {
            mergedLines.push(current);
        }
    }

    // ヘッダー行をスキップするパターン
    const headerPattern = /^[【\[《〈（(]?(材料|作り方|手順|調味料|下準備|ポイント|memo|MEMO)/;

    // 単位キーワード（長い順にマッチさせる）
    const unitPattern = 'パック|大さじ|小さじ|カップ|切れ?|kg|mg|cc|ml|g|L|個|本|枚|片|束|袋|丁|合|適量|少々|お好み';
    // 単位が先に来るキーワード（大さじ2、小1/2、等）
    const prefixUnitPattern = '大さじ|小さじ|大|小';

    for (const rawLine of mergedLines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (headerPattern.test(line)) continue;
        // 「2人前」「4人分」等のサービング行をスキップ
        if (/^\d+人[前分]/.test(line)) continue;

        // 先頭の記号を除去（・、●、■、※、−、-、*、数字.、☆、★、◎、○、▪）
        const cleaned = line.replace(/^[・●■※−\-\*\d.）)☆★◎○▪►▸]+\s*/, '');
        if (!cleaned) continue;

        // 複数の分量がカンマ等で区切られている場合を考慮
        // 例: 「醤油、みりん 各大さじ2」
        const eachMatch = cleaned.match(new RegExp(`^(.+?)\\s*各\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`));
        if (eachMatch) {
            const names = eachMatch[1].split(/[、,・]/);
            const quantity = parseFloat(eachMatch[2]);
            const unit = eachMatch[3];
            const extra = eachMatch[4] || '';
            for (const n of names) {
                const name = n.trim();
                if (!name) continue;
                const grams = convertToGrams(quantity, unit, extra);
                results.push({
                    name, rawQuantity: `${quantity}${unit}${extra}`,
                    grams, matched: false, matchedFood: null
                });
            }
            continue;
        }

        // === 「単位が数量の前に来る」パターンを先に処理 ===
        // 例: 「醤油 大さじ2」「塩 小さじ1/2」「みりん 大2」「酒 小1/2」
        // 区切り文字（スペース、…、:等）の後に 単位+数量 が来るケース
        const prefixUnitRegex = new RegExp(
            `^(.+?)[\\s…‥：:]+\\s*(${prefixUnitPattern})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:と\\s*)?(\\d+\\/\\d+)?(.*)$`
        );
        const prefixMatch = cleaned.match(prefixUnitRegex);
        if (prefixMatch) {
            const name = prefixMatch[1].trim();
            let rawUnit = prefixMatch[2];
            const mainNum = parseFloat(prefixMatch[3]);
            const fracStr = prefixMatch[4] || '';
            const extra = prefixMatch[5] || '';

            // 「大」→「大さじ」、「小」→「小さじ」に正規化
            if (rawUnit === '大') rawUnit = '大さじ';
            if (rawUnit === '小') rawUnit = '小さじ';

            // 分数を処理（1/2 等）
            let fraction = 0;
            if (fracStr) {
                const parts = fracStr.split('/');
                fraction = parseInt(parts[0]) / parseInt(parts[1]);
            }
            const totalQuantity = mainNum + fraction;
            const grams = convertToGrams(totalQuantity, rawUnit, '');

            const rawDisplay = fracStr ? `${rawUnit}${mainNum}と${fracStr}` : `${rawUnit}${mainNum}`;
            results.push({
                name, rawQuantity: rawDisplay,
                grams, matched: false, matchedFood: null
            });
            continue;
        }

        // === 「単位+数量のみ（スペースなし）」パターン ===
        // 例: 「醤油大さじ2」「塩小1」（食材名の直後にスペースなしで単位）
        const prefixNoSpaceRegex = new RegExp(
            `^([\\u3000-\\u9FFF\\uF900-\\uFAFF\\u30A0-\\u30FF\\u3040-\\u309F]+)(${prefixUnitPattern})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:と\\s*)?(\\d+\\/\\d+)?(.*)$`
        );
        const prefixNoSpaceMatch = cleaned.match(prefixNoSpaceRegex);
        if (prefixNoSpaceMatch) {
            const name = prefixNoSpaceMatch[1].trim();
            let rawUnit = prefixNoSpaceMatch[2];
            const mainNum = parseFloat(prefixNoSpaceMatch[3]);
            const fracStr = prefixNoSpaceMatch[4] || '';

            if (rawUnit === '大') rawUnit = '大さじ';
            if (rawUnit === '小') rawUnit = '小さじ';

            let fraction = 0;
            if (fracStr) {
                const parts = fracStr.split('/');
                fraction = parseInt(parts[0]) / parseInt(parts[1]);
            }
            const totalQuantity = mainNum + fraction;
            const grams = convertToGrams(totalQuantity, rawUnit, '');

            const rawDisplay = fracStr ? `${rawUnit}${mainNum}と${fracStr}` : `${rawUnit}${mainNum}`;
            results.push({
                name, rawQuantity: rawDisplay,
                grams, matched: false, matchedFood: null
            });
            continue;
        }

        // === 「単位+分数のみ」パターン ===
        // 例: 「醤油 大さじ1/2」「塩 小1/2」（整数部なし、分数のみ）
        const prefixFracOnlyRegex = new RegExp(
            `^(.+?)[\\s…‥：:]+\\s*(${prefixUnitPattern})\\s*(\\d+\\/\\d+)(.*)$`
        );
        const prefixFracOnlyMatch = cleaned.match(prefixFracOnlyRegex);
        if (prefixFracOnlyMatch) {
            const name = prefixFracOnlyMatch[1].trim();
            let rawUnit = prefixFracOnlyMatch[2];
            const fracStr = prefixFracOnlyMatch[3];
            if (rawUnit === '大') rawUnit = '大さじ';
            if (rawUnit === '小') rawUnit = '小さじ';

            const parts = fracStr.split('/');
            const totalQuantity = parseInt(parts[0]) / parseInt(parts[1]);
            const grams = convertToGrams(totalQuantity, rawUnit, '');

            results.push({
                name, rawQuantity: `${rawUnit}${fracStr}`,
                grams, matched: false, matchedFood: null
            });
            continue;
        }

        // === 通常パターン（数量が単位の前に来る） ===
        const patterns = [
            // 「食材名 数量単位」「食材名　数量単位」（スペースあり）
            new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`),
            // 「食材名…数量単位」「食材名‥数量単位」
            new RegExp(`^(.+?)[…‥]+\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`),
            // 「食材名：数量単位」「食材名:数量単位」
            new RegExp(`^(.+?)[：:]\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`),
            // 「食材名数量単位」（スペースなし: 漢字/カナの直後に数字）
            new RegExp(`^([\\u3000-\\u9FFF\\uF900-\\uFAFF]+(?:[（(][^）)]*[）)])?)(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`),
            // 「食材名 適量/少々」（数量なし、スペースあり）
            /^(.+?)\s+(適量|少々|お好み)$/,
            // 「食材名：適量」「食材名:適量」
            /^(.+?)[：:]\s*(適量|少々|お好み)$/,
            // 「食材名…適量」
            /^(.+?)[…‥]+\s*(適量|少々|お好み)$/,
        ];

        let matched = false;
        for (const pattern of patterns) {
            const m = cleaned.match(pattern);
            if (m) {
                const name = m[1].trim();
                if (!name) continue;
                const quantity = m[2] ? parseFloat(m[2]) : 0;
                // 「適量」等の数量なしパターン: m[2]が数値でない場合
                const isNonNumeric = isNaN(quantity);
                const unit = isNonNumeric ? m[2] : m[3];
                const extra = isNonNumeric ? '' : (m[4] || '');

                const grams = convertToGrams(
                    isNonNumeric ? 0 : quantity,
                    unit || '適量',
                    extra
                );

                results.push({
                    name: name,
                    rawQuantity: isNonNumeric ? (unit || '適量') : `${quantity}${unit}${extra}`,
                    grams: grams,
                    matched: false,
                    matchedFood: null
                });
                matched = true;
                break;
            }
        }

        // どのパターンにもマッチしない場合、食材名だけの行として扱う
        if (!matched && cleaned.length < 20) {
            results.push({
                name: cleaned,
                rawQuantity: '適量',
                grams: 0,
                matched: false,
                matchedFood: null
            });
        }
    }

    return results;
}

// ===== 行が「数量+単位」だけかどうか判定 =====
function isQuantityOnlyLine(line) {
    const unitPattern = 'パック|大さじ|小さじ|カップ|切れ?|kg|mg|cc|ml|g|L|個|本|枚|片|束|袋|丁|合|適量|少々|お好み';
    const prefixUnitPattern = '大さじ|小さじ|大|小';
    const trimmed = line.trim();
    // 「300g」等（数量+単位）
    const numUnitRegex = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(.*)$`);
    // 「大さじ2」「小1/2」等（単位+数量）
    const unitNumRegex = new RegExp(`^(${prefixUnitPattern})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:と\\s*)?(\\d+\\/\\d+)?$`);
    // 「大さじ1/2」（単位+分数のみ）
    const unitFracRegex = new RegExp(`^(${prefixUnitPattern})\\s*(\\d+\\/\\d+)$`);
    return numUnitRegex.test(trimmed) || unitNumRegex.test(trimmed) || unitFracRegex.test(trimmed) || /^\s*(適量|少々|お好み)\s*$/.test(trimmed);
}

// ===== 分量をグラムに変換 =====
function convertToGrams(quantity, unit, extra) {
    if (!quantity || quantity === 0) return 0;

    // 「1/2」等の追加分数を処理
    let extraFraction = 0;
    if (extra) {
        const fracMatch = extra.match(/(\d+)\/(\d+)/);
        if (fracMatch) {
            extraFraction = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
        }
    }

    const totalQuantity = quantity + extraFraction;

    switch (unit) {
        case 'g': return totalQuantity;
        case 'kg': return totalQuantity * 1000;
        case 'mg': return totalQuantity / 1000;
        case '大さじ': return totalQuantity * 15;
        case '小さじ': return totalQuantity * 5;
        case 'カップ': return totalQuantity * 200;
        case 'cc': case 'ml': return totalQuantity;
        case 'L': return totalQuantity * 1000;
        case '合': return totalQuantity * 150; // 米1合≒150g
        case '個': return totalQuantity * 60;  // 卵1個≒60g の目安
        case '本': return totalQuantity * 100;  // 目安
        case '枚': return totalQuantity * 30;   // 目安
        case '切れ': case '切': return totalQuantity * 80;
        case '片': return totalQuantity * 5;    // にんにく1片≒5g
        case '束': return totalQuantity * 200;  // ほうれん草1束≒200g
        case '袋': return totalQuantity * 200;
        case 'パック': return totalQuantity * 150;
        case '丁': return totalQuantity * 300;  // 豆腐1丁≒300g
        default: return 0;
    }
}

// ===== Claude API パーサー =====
async function parseRecipeWithAI(text) {
    const apiKey = localStorage.getItem('claudeApiKey');
    if (!apiKey) return null;

    const prompt = `以下のレシピテキストから食材名と分量（グラム数）を抽出してJSON形式で返してください。
調味料も含めてください。分量が「適量」「少々」の場合はgramsを0にしてください。
大さじ1=15g、小さじ1=5g、1カップ=200gで換算してください。

レスポンスは以下のJSON配列のみを返してください（説明文不要）:
[{"name": "食材名", "grams": グラム数}]

レシピテキスト:
${text}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Claude API error:', response.status, errorData);
            return null;
        }

        const data = await response.json();
        const content = data.content[0].text;

        // JSONを抽出（コードブロック内の場合も対応）
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return null;

        const ingredients = JSON.parse(jsonMatch[0]);
        return ingredients.map(ing => ({
            name: ing.name,
            rawQuantity: `${ing.grams}g`,
            grams: ing.grams || 0,
            matched: false,
            matchedFood: null
        }));
    } catch (error) {
        console.error('Claude API parsing error:', error);
        return null;
    }
}

// ===== 解析結果を食品マスタとマッチング =====
function matchIngredientsToMaster(ingredients) {
    return ingredients.map(ing => {
        // 完全一致を優先
        let food = foodMasterData.find(f =>
            f.name === ing.name || f.name.includes(ing.name) || ing.name.includes(f.name)
        );

        // 見つからない場合はファジー検索
        if (!food) {
            const results = fuzzySearchFoods(ing.name);
            if (results.length > 0) {
                food = results[0];
            }
        }

        if (food) {
            ing.matched = true;
            ing.matchedFood = food;
        }

        return ing;
    });
}

// ===== 統合フロー: レシピを解析 =====
async function analyzeRecipe(text) {
    const statusEl = document.getElementById('pasteAnalyzeStatus');
    const previewEl = document.getElementById('pasteResultPreview');

    // ステータス表示
    statusEl.textContent = '解析中...';
    statusEl.classList.remove('hidden');
    previewEl.classList.add('hidden');

    let ingredients;

    // APIキーがあればAI解析を試行
    const apiKey = localStorage.getItem('claudeApiKey');
    if (apiKey) {
        statusEl.textContent = 'AI解析中...';
        ingredients = await parseRecipeWithAI(text);
        if (ingredients) {
            statusEl.textContent = 'AI解析完了';
        } else {
            statusEl.textContent = 'AI解析失敗。ローカル解析にフォールバック...';
        }
    }

    // AIが使えない/失敗した場合はローカル解析
    if (!ingredients) {
        ingredients = parseRecipeText(text);
        statusEl.textContent = 'ローカル解析完了';
    }

    if (ingredients.length === 0) {
        statusEl.textContent = '食材を検出できませんでした。テキストの形式を確認してください。';
        return;
    }

    // 食品マスタとマッチング
    ingredients = matchIngredientsToMaster(ingredients);

    // 結果をプレビュー表示
    renderPasteResult(ingredients);
}

// ===== 解析結果のプレビュー表示 =====
let pasteAnalyzedIngredients = []; // 解析結果を保持

function renderPasteResult(ingredients) {
    pasteAnalyzedIngredients = ingredients;
    const listEl = document.getElementById('pasteResultList');
    const previewEl = document.getElementById('pasteResultPreview');
    const warningEl = document.getElementById('pasteUnmatchedWarning');

    const matchedCount = ingredients.filter(i => i.matched).length;
    const unmatchedCount = ingredients.length - matchedCount;

    listEl.innerHTML = ingredients.map((ing, i) => `
        <div class="paste-result-item ${ing.matched ? 'matched' : 'unmatched'}">
            <div class="paste-result-item-info">
                <span class="paste-result-name">${ing.name}</span>
                <span class="paste-result-quantity">${ing.rawQuantity}${ing.grams > 0 ? ` (${Math.round(ing.grams)}g)` : ''}</span>
            </div>
            <div class="paste-result-actions">
                ${ing.matched
                    ? `<span class="match-badge match-ok">${ing.matchedFood.name}</span>
                       <button type="button" class="paste-result-remove" data-index="${i}">&times;</button>`
                    : `<span class="match-badge match-ng">未マッチ</span>`
                }
            </div>
        </div>
    `).join('');

    // 削除ボタンのイベント
    listEl.querySelectorAll('.paste-result-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            pasteAnalyzedIngredients.splice(idx, 1);
            renderPasteResult(pasteAnalyzedIngredients);
        });
    });

    if (unmatchedCount > 0) {
        warningEl.textContent = `${unmatchedCount}件の食材がマスタデータにマッチしませんでした。未マッチの食材は栄養計算から除外されます。`;
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    previewEl.classList.remove('hidden');
}

// ===== 解析結果を既存のrecipeIngredientsに流し込む =====
function applyPasteResult() {
    if (pasteAnalyzedIngredients.length === 0) {
        alert('先にレシピを解析してください');
        return;
    }

    const servings = parseInt(document.getElementById('pasteServings').value) || 1;

    // マッチした食材だけをrecipeIngredientsに流し込む
    recipeIngredients = [];
    pasteAnalyzedIngredients.forEach(ing => {
        if (ing.matched && ing.matchedFood) {
            recipeIngredients.push({
                foodId: ing.matchedFood.foodId,
                name: ing.matchedFood.name,
                amount: Math.round(ing.grams) || 100
            });
        }
    });

    if (recipeIngredients.length === 0) {
        alert('マッチした食材がありません');
        return;
    }

    // レシピモードに切り替え
    switchCustomFoodMode('recipe');

    // 人前数を設定
    document.getElementById('recipeServings').value = servings;

    // 食材リストとプレビューを更新
    renderRecipeIngredients();
    updateRecipeNutrientPreview();
}

// ===== トースト通知 =====
function showToast(message, duration) {
    duration = duration || 2000;
    // 既存のトーストを削除
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    // アニメーション表示
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== 不足栄養素の提案セクションを描画 =====
function renderSuggestionSection() {
    const section = document.getElementById('suggestionSection');
    if (!section) return;

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const todayMeals = allRecords[targetDate]?.meals || [];

    // 表示条件: 最低1食分の記録があり、妊娠週数が登録済み
    if (todayMeals.length === 0 || !profile.pregnancyStartDate || !nutrientsData) {
        section.classList.add('hidden');
        return;
    }

    const week = getPregnancyWeek(profile.pregnancyStartDate);
    const trimester = getTrimester(week);

    // 栄養素を集計
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0 };
    todayMeals.forEach(m => {
        Object.keys(totals).forEach(k => { totals[k] += (m.nutrients && m.nutrients[k]) || 0; });
    });

    // 達成率を計算
    const achievementRate = calculateAchievementRate(totals, trimester, nutrientsData);
    if (!achievementRate) {
        section.classList.add('hidden');
        return;
    }

    // 不足栄養素を取得
    const deficients = getDeficientNutrients(achievementRate, totals, trimester, nutrientsData);
    if (deficients.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    const container = document.getElementById('deficientNutrientsList');
    let html = '';

    deficients.forEach(def => {
        const rate = 100 - def.deficitRate;
        const deficit = def.recommendedAmount - def.currentAmount;

        // 推奨食品を選定: 対象栄養素の含有量が多い順に上位5品
        const recommendations = getRecommendedFoods(def.nutrientId, deficit);

        // 棒グラフの色
        let barClass = 'danger';
        if (rate >= 50) barClass = 'warning';
        if (rate >= 80) barClass = 'good';

        html += `
            <div class="deficient-nutrient-card">
                <div class="deficient-nutrient-header">
                    <div class="deficient-nutrient-info">
                        <span class="deficient-nutrient-name">${def.name}</span>
                        <span class="deficient-nutrient-detail">${def.currentAmount.toFixed(1)} / ${def.recommendedAmount}${def.unit}</span>
                    </div>
                    <span class="deficient-nutrient-rate">${rate.toFixed(0)}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${barClass}" style="width: ${Math.min(rate, 100)}%"></div>
                </div>
                ${recommendations.length > 0 ? `
                    <div class="recommended-foods">
                        <p class="recommended-foods-label">おすすめ食品（不足分: ${deficit.toFixed(1)}${def.unit}）</p>
                        <div class="recommended-foods-list">
                            ${recommendations.map(rec => `
                                <div class="recommended-food-card">
                                    <div class="recommended-food-info">
                                        <span class="recommended-food-name">${rec.name}</span>
                                        <span class="recommended-food-amount">${rec.nutrientPer100g.toFixed(1)}${def.unit}/100g</span>
                                        <span class="recommended-food-needed">${rec.neededGrams}gで不足分を補完</span>
                                    </div>
                                    <button type="button" class="btn btn-small btn-apply btn-add-recommended"
                                        data-food-id="${rec.foodId}"
                                        data-quantity="${rec.neededGrams}"
                                        data-food-name="${rec.name}">追加</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // ワンタップ追加ボタンのイベント
    container.querySelectorAll('.btn-add-recommended').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const foodId = e.target.dataset.foodId;
            const quantity = parseInt(e.target.dataset.quantity);
            const foodName = e.target.dataset.foodName;
            addRecommendedFood(foodId, quantity, foodName);
        });
    });
}

// ===== 推奨食品を選定 =====
function getRecommendedFoods(nutrientId, deficitAmount) {
    if (!foodMasterData || foodMasterData.length === 0 || deficitAmount <= 0) return [];

    // カロリーは除外（食品単位で推奨しにくい）
    if (nutrientId === 'calories') return [];

    // 対象栄養素の含有量が多い順にソート
    const sorted = foodMasterData
        .filter(f => f[nutrientId] && f[nutrientId] > 0)
        .map(f => ({
            foodId: f.foodId,
            name: f.name,
            nutrientPer100g: f[nutrientId],
            // 不足量を100%補うのに必要なグラム数
            neededGrams: Math.ceil(deficitAmount / f[nutrientId] * 100)
        }))
        .sort((a, b) => b.nutrientPer100g - a.nutrientPer100g)
        .slice(0, 5);

    return sorted;
}

// ===== 推奨食品をワンタップで食事記録に追加 =====
function addRecommendedFood(foodId, quantity, foodName) {
    const food = foodMasterData.find(f => f.foodId === foodId);
    if (!food) return;

    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    const nutrients = calculateNutrients(food, quantity);

    const mealItem = {
        id: generateUUID(),
        mealType: currentMealType,
        foodId: food.foodId,
        foodName: food.name,
        quantity: quantity,
        displayQuantity: quantity,
        displayUnit: 'g',
        nutrients: nutrients,
        ingredients: null,
        createdAt: new Date().toISOString(),
        planned: isFutureDate(targetDate)
    };

    allRecords[targetDate].meals.push(mealItem);
    localStorage.setItem('mealRecords', JSON.stringify(allRecords));

    addToHistory(mealItem);

    // 表示を更新
    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();

    showToast(`${foodName} ${quantity}g を追加しました`);
}

// ===== オリジナル食品を削除 =====
function deleteCustomFood(foodId) {
    if (!confirm('この食品を削除しますか？')) return;

    let custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
    custom = custom.filter(f => f.foodId !== foodId);
    localStorage.setItem('customFoods', JSON.stringify(custom));

    // foodMasterDataからも削除
    foodMasterData = foodMasterData.filter(f => f.foodId !== foodId);

    displayCustomFoods();
}
