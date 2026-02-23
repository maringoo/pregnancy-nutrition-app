/**
 * マタニティ栄養ナビ - 食事記録機能
 * 妊婦向け栄養管理アプリのメインスクリプト
 */

// ===== 栄養素の推奨量（動的に妊娠期に応じて更新） =====
let NUTRIENT_RECOMMENDATIONS = {
    calories: { label: 'カロリー', recommended: 2250, unit: 'kcal', group: 'macro' },
    protein: { label: 'タンパク質', recommended: 55, unit: 'g', group: 'macro' },
    fat: { label: '脂質', recommended: 55, unit: 'g', group: 'macro' },
    carbohydrate: { label: '炭水化物', recommended: 300, unit: 'g', group: 'macro' },
    iron: { label: '鉄', recommended: 21, unit: 'mg', group: 'mineral' },
    calcium: { label: 'カルシウム', recommended: 650, unit: 'mg', group: 'mineral' },
    zinc: { label: '亜鉛', recommended: 10, unit: 'mg', group: 'mineral' },
    folate: { label: '葉酸', recommended: 480, unit: 'μg', group: 'vitamin' },
    vitaminD: { label: 'ビタミンD', recommended: 8.5, unit: 'μg', group: 'vitamin' },
    vitaminB6: { label: 'ビタミンB6', recommended: 1.4, unit: 'mg', group: 'vitamin' },
    vitaminB12: { label: 'ビタミンB12', recommended: 2.8, unit: 'μg', group: 'vitamin' },
    fiber: { label: '食物繊維', recommended: 18, unit: 'g', group: 'other' },
    dha: { label: 'DHA', recommended: 1000, unit: 'mg', group: 'other' }
};

// 栄養素基準データ（nutrients.jsonから読み込み）
let nutrientsData = null;

// ===== グローバル変数 =====
let foodMasterData = [];  // 食品マスタデータ
let currentMealType = 'breakfast';  // 現在選択している食事タイプ
let selectedFood = null;  // 選択されている食品
let currentMealDate = null;  // 現在表示中の食事記録日付（YYYY-MM-DD）
let pendingMeals = [];  // 一括追加用の仮リスト

// ===== 初期化処理 =====
document.addEventListener('DOMContentLoaded', () => {
    // オンボーディングチェック
    if (typeof checkOnboarding === 'function') checkOnboarding();

    // 旧APIキーの移行（claudeApiKey → aiApiKey_claude）
    const oldKey = localStorage.getItem('claudeApiKey');
    if (oldKey && !localStorage.getItem('aiApiKey_claude')) {
        localStorage.setItem('aiApiKey_claude', oldKey);
        localStorage.setItem('aiProvider', 'claude');
        localStorage.removeItem('claudeApiKey');
    }

    // 日付を表示
    updateTodayDate();

    // 食事記録の日付を初期化
    currentMealDate = getTodayString();
    initMealDateSelector();

    // ナビゲーションタブの初期化
    setupNavTabs();

    // 栄養素基準データを読み込み、推奨量を動的に設定
    const nutrientsP = loadNutrientsData();

    // 食品マスタデータを読み込み
    const foodsP = loadFoodMaster();

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

    // レシピデータを読み込み
    const recipesP = loadRecipeData();

    // 全データ読み込み完了後に提案セクションを描画
    Promise.all([nutrientsP, foodsP, recipesP]).then(() => {
        renderSuggestionSection();
    });

    // 体重管理モジュールを初期化
    initWeightModule();

    // データバックアップ機能を初期化
    setupBackupEvents();

    // 水分記録を初期化
    initWaterTracker();

    // ストリーク＆栄養スコアを更新
    updateStreak();
    updateNutritionScore();

    // テーマカラー初期化
    initThemePicker();

    // B7: つわり対応モード初期化
    initMorningSicknessMode();

    // 産後モード初期化
    initPostpartumMode();

    // B5: 食事タブの週数アドバイスヒント
    renderMealTabAdviceTip();

    // リマインダー初期化
    if (typeof initReminders === 'function') initReminders();
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
    return fetch('data/foods.json')
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
            // 食品マスタ読み込み完了
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
            vitaminD: 0, vitaminB6: 0.02, vitaminB12: 0, zinc: 0.6, fiber: 0.3, dha: 0,
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
            vitaminD: 1.8, vitaminB6: 0.08, vitaminB12: 0.9, zinc: 1.3, fiber: 0, dha: 120,
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
            vitaminD: 0, vitaminB6: 0.08, vitaminB12: 0, zinc: 0.7, fiber: 3.6, dha: 0,
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
            vitaminD: 0.3, vitaminB6: 0.03, vitaminB12: 0.3, zinc: 0.4, fiber: 0, dha: 0,
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
            vitaminD: 0, vitaminB6: 0.08, vitaminB12: 0, zinc: 0.1, fiber: 1.0, dha: 0,
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
            vitaminD: 32.0, vitaminB6: 0.64, vitaminB12: 9.4, zinc: 0.5, fiber: 0, dha: 820,
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
            vitaminD: 0, vitaminB6: 0.27, vitaminB12: 0, zinc: 0.7, fiber: 4.4, dha: 0,
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
            vitaminD: 0, vitaminB6: 0.38, vitaminB12: 0, zinc: 0.2, fiber: 1.1, dha: 0,
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
            vitaminD: 0.5, vitaminB6: 0.04, vitaminB12: 1.5, zinc: 3.2, fiber: 0, dha: 0,
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
            vitaminD: 0.1, vitaminB6: 0.54, vitaminB12: 0.2, zinc: 0.7, fiber: 0, dha: 10,
            category: 'protein'
        }
    ];
    // サンプル食品データを使用
}

// ===== イベントリスナーの登録 =====
function setupEventListeners() {
    // 食事タイプタブ
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentMealType = e.target.dataset.type;
            updateMealFormPanelTitle();
        });
    });

    // FABボタン
    document.getElementById('mealFab').addEventListener('click', () => {
        openMealFormPanel();
    });

    // フォームパネル閉じるボタン
    document.getElementById('closeMealFormPanel').addEventListener('click', () => {
        if (pendingMeals.length > 0) {
            if (confirm(`${pendingMeals.length}品が未確定です。確定してから閉じますか？`)) {
                confirmPendingMeals();
            } else {
                pendingMeals = [];
                renderPendingMeals();
                closeMealFormPanel();
            }
        } else {
            closeMealFormPanel();
        }
    });

    // 一括確定ボタン
    document.getElementById('confirmPendingMeals').addEventListener('click', () => {
        confirmPendingMeals();
    });

    // 食品検索（デバウンス付き、1文字以上で検索開始）
    let foodSearchTimer = null;
    document.getElementById('foodSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        clearTimeout(foodSearchTimer);
        if (searchTerm.length >= 1) {
            foodSearchTimer = setTimeout(() => showFoodSuggestions(searchTerm), 150);
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

    // 一括確定ボタン
    document.getElementById('confirmAllMealsBtn').addEventListener('click', confirmAllMeals);

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
    // フォーム内のオリジナル食品登録リンク
    document.getElementById('openCustomFoodFromForm').addEventListener('click', () => {
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

    // 類似食品検索（lookupモード、デバウンス付き）
    let lookupTimer = null;
    document.getElementById('lookupSearch').addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(lookupTimer);
        if (term.length >= 1) {
            lookupTimer = setTimeout(() => showLookupSuggestions(term), 150);
        } else {
            document.getElementById('lookupSuggestions').classList.add('hidden');
        }
    });

    // 「この栄養素を使う」ボタン
    document.getElementById('applyLookupBtn').addEventListener('click', () => {
        applyLookupNutrients();
    });

    // レシピモード: 食材検索（デバウンス付き）
    let recipeSearchTimer = null;
    document.getElementById('recipeAddSearch').addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(recipeSearchTimer);
        if (term.length >= 1) {
            recipeSearchTimer = setTimeout(() => showRecipeAddSuggestions(term), 150);
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

    // API設定: プロバイダー選択
    const providerSelect = document.getElementById('aiProviderSelect');
    const savedProvider = localStorage.getItem('aiProvider') || 'claude';
    providerSelect.value = savedProvider;
    updateAiApiKeyHint();

    providerSelect.addEventListener('change', () => {
        localStorage.setItem('aiProvider', providerSelect.value);
        updateAiApiKeyHint();
        updateApiKeyStatus();
    });

    // API設定: 保存
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('aiApiKeyInput').value.trim();
        if (!key) {
            alert('APIキーを入力してください');
            return;
        }
        const provider = document.getElementById('aiProviderSelect').value;
        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('aiApiKey_' + provider, key);
        document.getElementById('aiApiKeyInput').value = '';
        updateApiKeyStatus();
    });

    // API設定: 削除
    document.getElementById('deleteApiKeyBtn').addEventListener('click', () => {
        const provider = document.getElementById('aiProviderSelect').value;
        localStorage.removeItem('aiApiKey_' + provider);
        document.getElementById('aiApiKeyInput').value = '';
        updateApiKeyStatus();
    });

    // API設定: 接続テスト
    document.getElementById('testApiKeyBtn').addEventListener('click', () => {
        testApiConnection();
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
            <div class="food-suggestion-item" data-food-id="${escapeAttr(food.foodId)}">
                <p class="food-suggestion-name">${escapeHtml(food.name)} ${dishTag}</p>
                <p class="food-suggestion-category">${escapeHtml(categoryText)}</p>
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
            <span class="ingredient-name">${escapeHtml(ing.name)}</span>
            <input type="text" class="ingredient-amount-input" value="${escapeAttr(ing.amount)}" data-index="${i}">
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
        <div class="ingredient-add-item" data-name="${escapeAttr(food.name)}">
            ${escapeHtml(food.name)} <span style="color:#999; font-size:0.8rem">${escapeHtml(getCategoryLabel(food.category))}</span>
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

    // 栄養素を計算（料理で食材が編集されている場合は食材ベースで計算）
    let nutrients;
    let savedIngredients = null;

    if (editableIngredients.length > 0) {
        nutrients = calculateNutrientsFromIngredients(editableIngredients, quantityInput);
        savedIngredients = editableIngredients.map(ing => ({ name: ing.name, amount: ing.amount }));
    } else {
        nutrients = calculateNutrients(selectedFood, quantityInGrams);
    }

    // 仮リストに追加
    const mealItem = {
        id: generateUUID(),
        mealType: currentMealType,
        foodId: selectedFood.foodId,
        foodName: selectedFood.name,
        quantity: quantityInGrams,
        displayQuantity: quantityInput,
        displayUnit: unitLabel,
        nutrients: nutrients,
        ingredients: savedIngredients,
        createdAt: new Date().toISOString(),
        planned: isFutureDate(targetDate)
    };

    pendingMeals.push(mealItem);

    // 食品名を保持してからフォームをリセット
    const addedFoodName = selectedFood.name;
    resetForm();

    // 仮リストの表示を更新
    renderPendingMeals();
    showToast(`${addedFoodName} をリストに追加`);
}

function renderPendingMeals() {
    const section = document.getElementById('pendingMealsSection');
    const list = document.getElementById('pendingMealsList');
    const count = document.getElementById('pendingMealsCount');
    const confirmBtn = document.getElementById('confirmPendingMeals');
    if (!section || !list) return;

    if (pendingMeals.length === 0) {
        section.classList.add('hidden');
        if (confirmBtn) confirmBtn.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    if (confirmBtn) confirmBtn.classList.remove('hidden');
    if (count) count.textContent = pendingMeals.length;

    list.innerHTML = pendingMeals.map((item, idx) => `
        <div class="pending-meal-item">
            <div class="pending-meal-info">
                <span class="pending-meal-name">${escapeHtml(item.foodName)}</span>
                <span class="pending-meal-qty">${escapeHtml(item.displayQuantity)}${escapeHtml(item.displayUnit)} (${Math.round(item.nutrients.calories)}kcal)</span>
            </div>
            <button type="button" class="pending-meal-remove" data-idx="${idx}">&times;</button>
        </div>
    `).join('');

    list.querySelectorAll('.pending-meal-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingMeals.splice(parseInt(btn.dataset.idx), 1);
            renderPendingMeals();
        });
    });
}

function confirmPendingMeals() {
    if (pendingMeals.length === 0) return;

    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    pendingMeals.forEach(item => {
        allRecords[targetDate].meals.push(item);
        addToHistory(item);
    });

    safeSetItem('mealRecords', allRecords);

    const addedCount = pendingMeals.length;
    pendingMeals = [];
    renderPendingMeals();
    resetForm();

    displayMeals();
    displayMealHistory(currentMealType);
    updateNutrientsSummary();
    renderSuggestionSection();
    closeMealFormPanel();
    updateStreak();
    updateNutritionScore();

    showToast(`${addedCount}品を追加しました`);

    // リマインダー再チェック
    if (typeof checkAndRenderReminders === 'function') checkAndRenderReminders();
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
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };

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

// ===== 食事一覧を表示（ダイアリー形式） =====
function displayMeals() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const todayMeals = allRecords[targetDate]?.meals || [];

    const diaryContainer = document.getElementById('mealDiary');

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

    const mealTypeLabels = {
        breakfast: '朝食',
        lunch: '昼食',
        dinner: '夕食',
        snack: '間食'
    };

    const mealTypeIcons = {
        breakfast: '<svg class="meal-type-svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 8h3M17 8h3M12 2v2M6.3 3.8l1.4 1.4M17.7 3.8l-1.4 1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 18h16M6 18v2M18 18v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        lunch: '<svg class="meal-type-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        dinner: '<svg class="meal-type-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        snack: '<svg class="meal-type-svg" viewBox="0 0 24 24"><path d="M12 3C8 3 5 6 5 10c0 3 2 5 4 6v2h6v-2c2-1 4-3 4-6 0-4-3-7-7-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 18h6M10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };

    // 各タイプのカロリー小計を計算（確定/予定を分離）
    const mealTypeCalories = {};
    const mealTypePlannedCal = {};
    Object.keys(groupedMeals).forEach(type => {
        mealTypeCalories[type] = groupedMeals[type].reduce((sum, m) => sum + (m.nutrients.calories || 0), 0);
        mealTypePlannedCal[type] = groupedMeals[type]
            .filter(m => m.planned === true)
            .reduce((sum, m) => sum + (m.nutrients.calories || 0), 0);
    });

    let html = '';

    Object.keys(groupedMeals).forEach(type => {
        const meals = groupedMeals[type];
        const cal = mealTypeCalories[type];
        const plannedCal = mealTypePlannedCal[type];

        // セクションの開閉状態を復元（デフォルト:開）
        const collapsed = getDiarySectionCollapsed(type);

        // カロリー表示（予定分があれば内訳表示）
        let calDisplay = '';
        if (cal > 0) {
            if (plannedCal > 0 && plannedCal < cal) {
                calDisplay = `<span class="diary-section-cal">${Math.round(cal)} kcal <span class="diary-cal-planned">(うち${Math.round(plannedCal)}予定)</span></span>`;
            } else if (plannedCal > 0 && plannedCal === cal) {
                calDisplay = `<span class="diary-section-cal diary-cal-all-planned">${Math.round(cal)} kcal (予定)</span>`;
            } else {
                calDisplay = `<span class="diary-section-cal">${Math.round(cal)} kcal</span>`;
            }
        }

        html += `
            <div class="diary-section${collapsed ? ' collapsed' : ''}" data-meal-type="${type}">
                <div class="diary-section-header" role="button" tabindex="0" aria-expanded="${!collapsed}">
                    <div class="diary-section-title">
                        <span class="diary-section-icon">${mealTypeIcons[type]}</span>
                        <span class="diary-section-label">${mealTypeLabels[type]}</span>
                        ${calDisplay}
                    </div>
                    <div class="diary-section-actions">
                        <button type="button" class="btn-copy-meals" data-type="${type}" title="前の日からコピー"><svg class="copy-icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
                        <button type="button" class="diary-add-btn" data-type="${type}" aria-label="${mealTypeLabels[type]}を追加">+</button>
                        <span class="diary-chevron"></span>
                    </div>
                </div>
                <div class="diary-section-items">
        `;

        if (meals.length === 0) {
            html += `<p class="diary-empty-hint">タップして${mealTypeLabels[type]}を追加</p>`;
        } else {
            meals.forEach(meal => {
                const displayQuantity = meal.displayQuantity !== undefined ? meal.displayQuantity : meal.quantity;
                const displayUnit = meal.displayUnit || 'g';

                const isPlanned = meal.planned === true;
                const plannedClass = isPlanned ? ' planned' : '';
                let statusBadge = '';
                if (isPlanned) {
                    statusBadge = '<span class="meal-planned-badge">予定</span>';
                } else if (meal.planned === false && isFutureDate(targetDate)) {
                    statusBadge = '<span class="meal-confirmed-badge">確定</span>';
                }

                const confirmBtn = isPlanned
                    ? `<button class="btn-confirm-sm" data-meal-id="${meal.id}">確定</button>`
                    : '';

                const favClass = isFavorite(meal.foodId) ? ' is-favorite' : '';
                html += `
                    <div class="meal-item-compact${plannedClass}">
                        <div class="meal-item-info">
                            <button class="btn-fav-star${favClass}" data-food-id="${escapeAttr(meal.foodId)}" data-food-name="${escapeAttr(meal.foodName)}" data-qty="${escapeAttr(displayQuantity)}" data-unit="${escapeAttr(displayUnit)}">★</button>
                            <span class="meal-item-name-inline">${escapeHtml(meal.foodName)}</span>
                            ${statusBadge}
                            <span class="meal-item-meta">${escapeHtml(displayQuantity)}${escapeHtml(displayUnit)} / ${meal.nutrients.calories}kcal</span>
                        </div>
                        <div class="meal-item-actions">
                            ${confirmBtn}
                            <button class="btn-delete-sm" data-meal-id="${meal.id}">&times;</button>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
    });

    diaryContainer.innerHTML = html;

    // ダイアリーセクションの「+」ボタンイベント
    diaryContainer.querySelectorAll('.diary-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            openMealFormPanel(type);
        });
    });

    // 空ヒントタップでもフォームを開く
    diaryContainer.querySelectorAll('.diary-empty-hint').forEach(hint => {
        hint.addEventListener('click', () => {
            const type = hint.closest('.diary-section').dataset.mealType;
            openMealFormPanel(type);
        });
    });

    // セクションヘッダーの開閉トグル
    diaryContainer.querySelectorAll('.diary-section-header').forEach(header => {
        const toggleSection = (e) => {
            if (e.target.closest('.diary-add-btn') || e.target.closest('.btn-copy-meals')) return;
            const section = header.closest('.diary-section');
            const type = section.dataset.mealType;
            section.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
            setDiarySectionCollapsed(type, section.classList.contains('collapsed'));
        };
        header.addEventListener('click', toggleSection);
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection(e);
            }
        });
    });

    // 削除ボタンのイベントリスナー
    diaryContainer.querySelectorAll('.btn-delete-sm').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealId = e.target.dataset.mealId;
            deleteMeal(mealId);
        });
    });

    // 確定ボタンのイベントリスナー
    diaryContainer.querySelectorAll('.btn-confirm-sm').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealId = e.target.dataset.mealId;
            confirmMeal(mealId);
        });
    });

    // コピーボタンのイベントリスナー (A1)
    diaryContainer.querySelectorAll('.btn-copy-meals').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMealCopyPicker(btn.dataset.type);
        });
    });

    // お気に入りボタンのイベントリスナー (A2)
    diaryContainer.querySelectorAll('.btn-fav-star').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.foodId, btn.dataset.foodName, parseFloat(btn.dataset.qty), btn.dataset.unit);
        });
    });
}

// ===== ダイアリーセクション開閉状態管理 =====
function getDiarySectionCollapsed(type) {
    try {
        const state = JSON.parse(localStorage.getItem('diaryCollapsed') || '{}');
        return state[type] === true;
    } catch { return false; }
}

function setDiarySectionCollapsed(type, collapsed) {
    try {
        const state = JSON.parse(localStorage.getItem('diaryCollapsed') || '{}');
        state[type] = collapsed;
        localStorage.setItem('diaryCollapsed', JSON.stringify(state));
    } catch {}
}

// ===== フォームパネルの開閉 =====
function openMealFormPanel(mealType) {
    if (mealType) {
        currentMealType = mealType;
        // タブボタンも同期
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === mealType);
        });
    }
    // 仮リストをリセット
    pendingMeals = [];
    renderPendingMeals();

    updateMealFormPanelTitle();
    const panel = document.getElementById('mealFormPanel');
    panel.classList.remove('hidden');
    panel.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    displayMealHistory(currentMealType);
    // FABを隠す
    document.getElementById('mealFab').classList.add('hidden');
}

function closeMealFormPanel() {
    document.getElementById('mealFormPanel').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('mealFab').classList.remove('hidden');
    resetForm();
}

function updateMealFormPanelTitle() {
    const labels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
    const titleEl = document.getElementById('mealFormPanelTitle');
    if (titleEl) {
        titleEl.textContent = `${labels[currentMealType] || '食事'}を追加`;
    }
}

// ===== 予定の食事を確定する =====
function confirmMeal(mealId) {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const meals = allRecords[targetDate]?.meals || [];

    const meal = meals.find(m => m.id === mealId);
    if (meal) {
        meal.planned = false;
        safeSetItem('mealRecords', allRecords);
        displayMeals();
        updateNutrientsSummary();
    }
}

// ===== 予定の食事を一括確定する =====
function confirmAllMeals() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const meals = allRecords[targetDate]?.meals || [];

    let confirmedCount = 0;
    meals.forEach(meal => {
        if (meal.planned === true) {
            meal.planned = false;
            confirmedCount++;
        }
    });

    if (confirmedCount > 0) {
        safeSetItem('mealRecords', allRecords);
        displayMeals();
        updateNutrientsSummary();
        showToast(`${confirmedCount}件の食事を確定しました`);
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
    safeSetItem('mealRecords', allRecords);

    // 表示を更新
    displayMeals();
    displayMealHistory(currentMealType);
    updateNutrientsSummary();
    renderSuggestionSection();
    updateStreak();
    updateNutritionScore();
}

// ===== 栄養素サマリーを更新 =====
function updateNutrientsSummary() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const todayMeals = allRecords[targetDate]?.meals || [];

    // 確定と予定を分けて集計
    const confirmedTotals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
    const plannedTotals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };

    todayMeals.forEach(meal => {
        const isPlanned = meal.planned === true;
        Object.keys(totals).forEach(nutrient => {
            const val = meal.nutrients[nutrient] || 0;
            totals[nutrient] += val;
            if (isPlanned) {
                plannedTotals[nutrient] += val;
            } else {
                confirmedTotals[nutrient] += val;
            }
        });
    });

    const hasPlanned = plannedTotals.calories > 0;

    // グリッドを生成（グループ別）
    const grid = document.getElementById('nutrientsGrid');
    grid.innerHTML = '';

    const groupLabels = {
        macro: '三大栄養素',
        mineral: 'ミネラル',
        vitamin: 'ビタミン',
        other: 'その他'
    };
    const groupOrder = ['macro', 'mineral', 'vitamin', 'other'];
    let lastGroup = null;

    Object.keys(NUTRIENT_RECOMMENDATIONS).forEach(nutrientKey => {
        const recommendation = NUTRIENT_RECOMMENDATIONS[nutrientKey];

        // グループヘッダーを挿入
        const currentGroup = recommendation.group || 'other';
        if (currentGroup !== lastGroup) {
            const header = document.createElement('div');
            header.className = 'nutrient-group-header';
            header.textContent = groupLabels[currentGroup] || currentGroup;
            grid.appendChild(header);
            lastGroup = currentGroup;
        }

        const current = totals[nutrientKey];
        const confirmed = confirmedTotals[nutrientKey];
        const planned = plannedTotals[nutrientKey];
        const percentage = (current / recommendation.recommended) * 100;
        const confirmedPct = (confirmed / recommendation.recommended) * 100;
        const plannedPct = (planned / recommendation.recommended) * 100;

        // 100%超えかどうかでカード背景を切り替え（つわりモード時は緩和）
        let statusClass = '';
        const overThreshold = isMorningSicknessMode() ? 150 : 100;
        if (percentage > overThreshold) {
            statusClass = 'over';
        }

        const confirmedBarWidth = Math.min(confirmedPct, 100);
        const plannedBarWidth = Math.min(plannedPct, 100 - confirmedBarWidth);
        const overText = percentage > 100 ? `(+${(percentage - 100).toFixed(0)}%)` : '';

        // 予定分の表示テキスト
        const plannedNote = hasPlanned && planned > 0
            ? `<span class="nutrient-planned-note">うち${planned.toFixed(1)}${recommendation.unit}予定</span>`
            : '';

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
                <div class="progress-bar confirmed" style="width: ${confirmedBarWidth}%"></div>
                <div class="progress-bar planned" style="width: ${plannedBarWidth}%; left: ${confirmedBarWidth}%"></div>
            </div>
            <div class="nutrient-percentage ${statusClass}">
                ${percentage.toFixed(0)}% ${overText}
            </div>
            ${plannedNote}
        `;

        grid.appendChild(card);
    });

    // ドーナツチャートを更新（確定/予定分けて渡す）
    updateCalorieDonut(confirmedTotals.calories, plannedTotals.calories);
}

function updateCalorieDonut(confirmed, planned) {
    const consumed = confirmed + planned;
    const calRec = NUTRIENT_RECOMMENDATIONS.calories;
    const goal = calRec ? calRec.recommended : 2000;
    const remaining = Math.round(goal - consumed);
    const circumference = 314.16; // 2 * PI * 50

    // 確定分のドーナツ
    const confirmedPercent = Math.min(confirmed / goal, 1);
    const confirmedOffset = circumference * (1 - confirmedPercent);

    // 確定+予定分のドーナツ（予定は確定の上に追加）
    const totalPercent = Math.min(consumed / goal, 1);
    const totalOffset = circumference * (1 - totalPercent);

    const donut = document.getElementById('donutProgress');
    const donutPlanned = document.getElementById('donutProgressPlanned');
    const remEl = document.getElementById('donutCalRemaining');
    const eqGoal = document.getElementById('eqGoal');
    const eqFood = document.getElementById('eqFood');
    const eqRemaining = document.getElementById('eqRemaining');
    const eqPlannedNote = document.getElementById('eqPlannedNote');

    if (donutPlanned) {
        donutPlanned.style.strokeDashoffset = totalOffset;
        donutPlanned.classList.toggle('hidden-circle', planned === 0);
    }
    if (donut) {
        donut.style.strokeDashoffset = confirmedOffset;
        donut.classList.toggle('over', consumed / goal > 1);
    }
    if (remEl) {
        remEl.textContent = remaining > 0 ? remaining : 0;
    }
    if (eqGoal) eqGoal.textContent = Math.round(goal);
    if (eqFood) eqFood.textContent = Math.round(consumed);
    if (eqRemaining) {
        eqRemaining.textContent = remaining;
        eqRemaining.style.color = remaining < 0 ? 'var(--danger-red)' : '';
    }
    if (eqPlannedNote) {
        eqPlannedNote.textContent = planned > 0 ? `うち${Math.round(planned)}予定` : '';
    }
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
    safeSetItem('mealRecords', allRecords);

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
            document.querySelectorAll('.nav-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');

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

            // 買い物タブに切り替えた時は買い物モジュールを初期化
            if (targetTab === 'shopping') {
                initShoppingModule();
            }

            // FABの表示/非表示（食事記録タブのみ表示）
            const fab = document.getElementById('mealFab');
            const formPanel = document.getElementById('mealFormPanel');
            if (targetTab === 'meals') {
                if (formPanel.classList.contains('hidden')) {
                    fab.classList.remove('hidden');
                }
            } else {
                fab.classList.add('hidden');
                formPanel.classList.add('hidden');
            }
        });
    });
}

// ===== 献立予定から食事記録タブに遷移 =====
function navigateToMealEntry(dateStr) {
    // 日付を設定
    currentMealDate = dateStr;
    const datePicker = document.getElementById('mealDatePicker');
    if (datePicker) datePicker.value = dateStr;
    updateMealDateDisplay();
    displayMeals();
    updateNutrientsSummary();

    // 食事記録タブに切り替え
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const mealsTab = document.querySelector('.nav-tab[data-tab="meals"]');
    if (mealsTab) mealsTab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const mealsContent = document.getElementById('tab-meals');
    if (mealsContent) mealsContent.classList.add('active');
}

// ===== 食事記録の日付セレクター =====
// 週間日付タブの起点日（週の最初の日 = 月曜）
let weekStartDate = null;

function initMealDateSelector() {
    const datePicker = document.getElementById('mealDatePicker');

    // 週の起点を計算（今日を含む週：月曜始まり）
    weekStartDate = getWeekStart(currentMealDate);
    renderWeekDateTabs();

    document.getElementById('weekPrev').addEventListener('click', () => {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() - 7);
        weekStartDate = d.toISOString().split('T')[0];
        renderWeekDateTabs();
    });

    document.getElementById('weekNext').addEventListener('click', () => {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + 7);
        weekStartDate = d.toISOString().split('T')[0];
        renderWeekDateTabs();
    });

    datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
            setMealDate(e.target.value);
        }
    });

    updateMealDateDisplay();
}

function getWeekStart(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // 月曜始まり
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

function renderWeekDateTabs() {
    const container = document.getElementById('weekDateTabs');
    const today = getTodayString();
    const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

    let html = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isSelected = dateStr === currentMealDate;
        const isToday = dateStr === today;
        const dayNum = d.getDate();
        const dayLabel = dayLabels[i];

        html += `<button type="button" class="week-date-tab${isSelected ? ' selected' : ''}${isToday ? ' is-today' : ''}" data-date="${dateStr}">
            <span class="week-day-label">${dayLabel}</span>
            <span class="week-day-num">${dayNum}</span>
        </button>`;
    }
    container.innerHTML = html;

    // タブクリックイベント
    container.querySelectorAll('.week-date-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setMealDate(tab.dataset.date);
        });
        // 長押しでdate picker
        let pressTimer;
        tab.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                const picker = document.getElementById('mealDatePicker');
                picker.value = currentMealDate;
                picker.showPicker();
            }, 500);
        }, { passive: true });
        tab.addEventListener('touchend', () => clearTimeout(pressTimer));
    });
}

function setMealDate(dateStr) {
    currentMealDate = dateStr;
    // 選択した日付が現在の週範囲外なら週を移動
    const newWeekStart = getWeekStart(dateStr);
    if (newWeekStart !== weekStartDate) {
        weekStartDate = newWeekStart;
    }
    renderWeekDateTabs();
    updateMealDateDisplay();
    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();
    displayMealHistory(currentMealType);
    updateWaterDisplay();
    updateNutritionScore();
}

function updateMealDateDisplay() {
    const banner = document.getElementById('plannedBanner');
    const today = getTodayString();
    const isFuture = currentMealDate > today;

    // 未来日のバナー表示
    if (banner) {
        banner.classList.toggle('hidden', !isFuture);
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

    // 妊娠週数サマリー / 産後表示
    const weekInfo = document.getElementById('dashboardWeekInfo');
    if (weekInfo && profile.mode === 'postpartum') {
        const feedingType = profile.feedingType || 'breastfeeding';
        const feedingLabels = { breastfeeding: '完全母乳', mixed: '混合（母乳+ミルク）', formula: '完全ミルク' };
        let dayText = '産後';
        let daysCount = 0;
        if (profile.birthDate) {
            const birth = new Date(profile.birthDate);
            const now = new Date();
            daysCount = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
            dayText = `産後 ${daysCount}日目`;
        }
        const monthText = daysCount > 0 ? `（約${Math.floor(daysCount / 30)}ヶ月）` : '';
        const feedingComments = {
            breastfeeding: '母乳育児では通常より多くのエネルギーと栄養が必要です。水分補給を忘れずに、カルシウム・ビタミンB12・亜鉛をしっかり摂りましょう。',
            mixed: '混合育児では、母乳の割合に応じた栄養補給が大切です。バランスの良い食事と水分補給を心がけましょう。',
            formula: 'ご自身の体の回復を大切にしましょう。バランスの良い食事を心がけ、無理のないペースで過ごしてください。'
        };
        weekInfo.innerHTML = `
            <div class="week-number">${dayText}</div>
            <div class="week-trimester">${feedingLabels[feedingType]}${monthText}</div>
            <div class="week-comment">${feedingComments[feedingType]}</div>
        `;
        weekInfo.classList.remove('hidden');
    } else if (weekInfo && profile.pregnancyStartDate) {
        const week = getPregnancyWeek(profile.pregnancyStartDate);
        const trimester = getTrimester(week);
        const label = getTrimesterLabel(trimester);
        const dueDate = profile.dueDate ? new Date(profile.dueDate) : new Date(profile.pregnancyStartDate);
        if (!profile.dueDate) dueDate.setDate(dueDate.getDate() + 280);
        const dueDateStr = `${dueDate.getFullYear()}/${dueDate.getMonth()+1}/${dueDate.getDate()}`;
        const remainWeeks = 40 - (week || 0);

        const trimesterComment = trimester === 'first'
            ? 'つわりがつらい時期。食べられるものを少量ずつ摂りましょう。葉酸の摂取が特に大切です。'
            : trimester === 'second'
            ? '安定期に入り食欲が戻る時期。バランスよく栄養を摂りましょう。鉄分・カルシウムを意識して。'
            : '赤ちゃんの成長が加速する時期。鉄分・たんぱく質をしっかり摂り、体重管理も意識しましょう。';

        weekInfo.innerHTML = `
            <div class="week-number">妊娠 ${week} 週</div>
            <div class="week-trimester">妊娠${label}（${trimester === 'first' ? '〜15週' : trimester === 'second' ? '16〜27週' : '28週〜'}）</div>
            <div class="week-due-date">出産予定日: ${dueDateStr}（あと約${remainWeeks}週）</div>
            <div class="week-comment">${trimesterComment}</div>
        `;
        weekInfo.classList.remove('hidden');
    } else if (weekInfo) {
        weekInfo.classList.add('hidden');
    }

    // 妊娠週数アドバイス (B5) — 産後モードでは非表示
    if (profile.mode === 'postpartum') {
        const adviceCard = document.getElementById('pregnancyAdviceCard');
        if (adviceCard) adviceCard.classList.add('hidden');
        const predCard = document.getElementById('weightPredictionCard');
        if (predCard) predCard.classList.add('hidden');
    } else {
        renderPregnancyAdviceCard();
        // 体重増加ペース予測 (B6)
        renderWeightPrediction();
    }

    // 週間・月間レポート (A4)
    setupReportPeriodTabs();
    renderReport(7);

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
    const nutrients = ['calories', 'protein', 'iron', 'calcium', 'folate', 'vitaminD', 'vitaminB6', 'vitaminB12', 'zinc', 'fiber', 'dha'];
    const nutrientLabels = {
        calories: 'カロリー',
        protein: 'タンパク質',
        iron: '鉄',
        calcium: 'カルシウム',
        folate: '葉酸',
        vitaminD: 'ビタミンD',
        vitaminB6: 'ビタミンB6',
        vitaminB12: 'ビタミンB12',
        zinc: '亜鉛',
        fiber: '食物繊維',
        dha: 'DHA'
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
            if (val > 0) cls = 'good';
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
    const isPostpartum = profile.mode === 'postpartum';
    if (isPostpartum && records.length > 0 && profile.prePregnancyWeight) {
        // 産後モード: 妊娠前体重との比較（体重回復の参考情報としてやさしいトーンで表示）
        const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));
        const latest = sorted[0];
        const diff = latest.weight - profile.prePregnancyWeight;
        let icon, cls, title, detail;
        if (Math.abs(diff) < 0.5) {
            icon = '✓'; cls = 'good';
            title = '体重は妊娠前とほぼ同じです';
            detail = `現在 ${latest.weight.toFixed(1)}kg（妊娠前: ${profile.prePregnancyWeight}kg）`;
        } else if (diff > 0) {
            icon = 'i'; cls = 'good';
            title = '体重の変化を記録しています';
            detail = `現在 ${latest.weight.toFixed(1)}kg（妊娠前より +${diff.toFixed(1)}kg）。産後の体重変化は個人差が大きいです。無理のないペースで過ごしましょう`;
        } else {
            icon = 'i'; cls = 'good';
            title = '体重の変化を記録しています';
            detail = `現在 ${latest.weight.toFixed(1)}kg（妊娠前より ${diff.toFixed(1)}kg）。しっかり栄養を摂ることが大切です`;
        }
        items.push({ icon, cls, title, detail });
    } else if (!isPostpartum && records.length > 0 && profile.prePregnancyWeight && profile.height) {
        // 妊娠中モード: 推奨体重増加範囲と比較
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
    return fetch('data/nutrients.json')
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

    // 活動レベル別カロリーオフセット（18-49歳女性、ふつう基準）
    const activityOffsets = { low: -250, moderate: 0, high: 300 };
    const activityOffset = activityOffsets[profile.activityLevel] || 0;

    // 産後モードの処理
    if (profile.mode === 'postpartum') {
        const feedingType = profile.feedingType || 'breastfeeding';
        const feedingKeyMap = {
            breastfeeding: 'postpartumBreastfeeding',
            mixed: 'postpartumMixed',
            formula: 'postpartumFormula'
        };
        const trimesterKey = feedingKeyMap[feedingType] || 'postpartumBreastfeeding';
        const feedingLabels = {
            breastfeeding: '完全母乳',
            mixed: '混合',
            formula: '完全ミルク'
        };
        if (weekDisplay) {
            let dayText = '産後';
            if (profile.birthDate) {
                const birth = new Date(profile.birthDate);
                const now = new Date();
                const diffDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
                dayText = `産後 ${diffDays}日目`;
            }
            weekDisplay.textContent = `現在: ${dayText}（${feedingLabels[feedingType]}）`;
            weekDisplay.classList.remove('hidden');
        }
        if (nutrientsData) {
            nutrientsData.forEach(nutrient => {
                const id = nutrient.nutrientId;
                if (NUTRIENT_RECOMMENDATIONS[id]) {
                    NUTRIENT_RECOMMENDATIONS[id].recommended = nutrient[trimesterKey];
                    NUTRIENT_RECOMMENDATIONS[id].label = NUTRIENT_RECOMMENDATIONS[id].label || nutrient.name;
                    NUTRIENT_RECOMMENDATIONS[id].unit = nutrient.unit;
                }
            });
        }
        if (NUTRIENT_RECOMMENDATIONS.calories && activityOffset !== 0) {
            NUTRIENT_RECOMMENDATIONS.calories.recommended += activityOffset;
        }
        updateNutrientsSummary();
        renderSuggestionSection();
        return;
    }

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
        nutrientsData.forEach(nutrient => {
            const id = nutrient.nutrientId;
            if (NUTRIENT_RECOMMENDATIONS[id]) {
                NUTRIENT_RECOMMENDATIONS[id].recommended = nutrient[trimesterKey];
                NUTRIENT_RECOMMENDATIONS[id].label = NUTRIENT_RECOMMENDATIONS[id].label || nutrient.name;
                NUTRIENT_RECOMMENDATIONS[id].unit = nutrient.unit;
            }
        });
    }
    if (NUTRIENT_RECOMMENDATIONS.calories && activityOffset !== 0) {
        NUTRIENT_RECOMMENDATIONS.calories.recommended += activityOffset;
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
    if (profile.activityLevel) {
        document.getElementById('activityLevel').value = profile.activityLevel;
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

    // 既存のprofileを読み込んで産後モード関連フィールドを保持
    const existing = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const profile = {};
    if (pregnancyStartDate) profile.pregnancyStartDate = pregnancyStartDate;
    if (dueDate) profile.dueDate = dueDate;
    if (!isNaN(prePregnancyWeight)) profile.prePregnancyWeight = prePregnancyWeight;
    if (!isNaN(height)) profile.height = height;
    profile.activityLevel = document.getElementById('activityLevel').value || 'moderate';
    // 産後モードフィールドを保持
    if (existing.mode) profile.mode = existing.mode;
    if (existing.birthDate) profile.birthDate = existing.birthDate;
    if (existing.feedingType) profile.feedingType = existing.feedingType;

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

// ===== localStorage 安全書き込みラッパー =====
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('localStorage容量制限に到達。古いデータをアーカイブします。');
            pruneOldData();
            try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                return true;
            } catch (e2) {
                showToast('ストレージ容量が不足しています。設定からデータをエクスポートしてください。', 4000);
                return false;
            }
        }
        console.error('localStorage書き込みエラー:', e);
        return false;
    }
}

function safeGetItem(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        if (val === null) return fallback !== undefined ? fallback : null;
        return JSON.parse(val);
    } catch (e) {
        console.error('localStorageデータ破損:', key, e);
        return fallback !== undefined ? fallback : null;
    }
}

function pruneOldData() {
    // 90日より古い食事記録を削除
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const records = JSON.parse(localStorage.getItem('mealRecords') || '{}');
        let pruned = 0;
        Object.keys(records).forEach(dateStr => {
            if (dateStr < cutoffStr) {
                delete records[dateStr];
                pruned++;
            }
        });
        if (pruned > 0) {
            localStorage.setItem('mealRecords', JSON.stringify(records));
            // 古い食事記録をアーカイブ完了
        }

        // 水分記録も同様に整理
        const water = JSON.parse(localStorage.getItem('waterRecords') || '{}');
        let wPruned = 0;
        Object.keys(water).forEach(dateStr => {
            if (dateStr < cutoffStr) {
                delete water[dateStr];
                wPruned++;
            }
        });
        if (wPruned > 0) {
            localStorage.setItem('waterRecords', JSON.stringify(water));
        }
    } catch (e) {
        console.error('データ整理エラー:', e);
    }
}

function getStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        total += (localStorage.getItem(key) || '').length;
    }
    return { usedKB: Math.round(total / 1024), limitKB: 5120 };
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
    safeSetItem('mealHistory', mealHistory);
}

// ===== 食事タイプの履歴を表示 =====
function displayMealHistory(mealType) {
    // お気に入りも表示 (A2)
    displayFavorites();

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
        <div class="history-chip" data-index="${index}" data-meal-type="${escapeAttr(mealType)}">
            <span class="history-chip-text" data-index="${index}" data-meal-type="${escapeAttr(mealType)}">${escapeHtml(item.foodName)} (${escapeHtml(item.quantity)}${escapeHtml(item.unitName)})</span>
            <span class="history-chip-delete" data-index="${index}" data-meal-type="${escapeAttr(mealType)}">&times;</span>
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
        safeSetItem('mealHistory', mealHistory);
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
        <div class="food-suggestion-item" data-food-id="${escapeAttr(food.foodId)}">
            <p class="food-suggestion-name">${escapeHtml(food.name)}</p>
            <p class="food-suggestion-category">${escapeHtml(getCategoryLabel(food.category))} - ${food.calories}kcal/100g</p>
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
        <div class="food-suggestion-item" data-food-id="${escapeAttr(food.foodId)}">
            <p class="food-suggestion-name">${escapeHtml(food.name)}</p>
            <p class="food-suggestion-category">${escapeHtml(getCategoryLabel(food.category))}</p>
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
            <span class="recipe-ingredient-name">${escapeHtml(ing.name)}</span>
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
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
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
        <span>VD: <strong>${per100g.vitaminD || 0}</strong>μg</span>
        <span>B6: <strong>${per100g.vitaminB6 || 0}</strong>mg</span>
        <span>B12: <strong>${per100g.vitaminB12 || 0}</strong>μg</span>
        <span>亜鉛: <strong>${per100g.zinc || 0}</strong>mg</span>
        <span>食物繊維: <strong>${per100g.fiber || 0}</strong>g</span>
        <span>DHA: <strong>${per100g.dha || 0}</strong>mg</span>
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
        const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
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
    // オリジナル食品を保存完了
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
                <span class="custom-food-name">${escapeHtml(food.name)}</span>
                <span class="custom-food-cal">${food.calories}kcal/100g</span>
            </div>
            <div class="custom-food-actions">
                <button type="button" class="btn-edit custom-food-edit" data-food-id="${escapeAttr(food.foodId)}">編集</button>
                <button type="button" class="btn-delete custom-food-delete" data-food-id="${escapeAttr(food.foodId)}">削除</button>
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

// ===== AI プロバイダー設定 =====
const AI_PROVIDERS = {
    claude: { name: 'Claude', placeholder: 'sk-ant-...' },
    chatgpt: { name: 'ChatGPT', placeholder: 'sk-...' },
    gemini: { name: 'Gemini', placeholder: 'AIza...' }
};

function getActiveAIConfig() {
    const provider = localStorage.getItem('aiProvider') || 'claude';
    const apiKey = localStorage.getItem('aiApiKey_' + provider);
    return { provider, apiKey };
}

function updateAiApiKeyHint() {
    const provider = document.getElementById('aiProviderSelect').value;
    const hint = document.getElementById('aiApiKeyHint');
    const input = document.getElementById('aiApiKeyInput');
    if (hint) hint.textContent = AI_PROVIDERS[provider]?.name + ' の APIキーを入力';
    if (input) input.placeholder = AI_PROVIDERS[provider]?.placeholder || '';

    // ガイドの表示切替: 選択中のプロバイダーのみ表示
    const guideMap = { claude: 'guideClaudeSection', chatgpt: 'guideChatGPTSection', gemini: 'guideGeminiSection' };
    Object.entries(guideMap).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (key === provider) ? '' : 'none';
    });
}

function updateApiKeyStatus() {
    const statusEl = document.getElementById('apiKeyStatus');
    const { provider, apiKey } = getActiveAIConfig();
    const providerName = AI_PROVIDERS[provider]?.name || provider;
    if (apiKey) {
        statusEl.textContent = `${providerName} APIキー設定済み（${apiKey.slice(0, 4)}****）`;
        statusEl.style.color = 'var(--success-green)';
    } else {
        statusEl.textContent = `${providerName} APIキー未設定（ローカル解析を使用）`;
        statusEl.style.color = 'var(--light-text)';
    }
}

// ===== API接続テスト =====
async function testApiConnection() {
    const statusEl = document.getElementById('apiKeyStatus');
    const { provider, apiKey } = getActiveAIConfig();
    const providerName = AI_PROVIDERS[provider]?.name || provider;

    if (!apiKey) {
        statusEl.textContent = 'APIキーが保存されていません。先にキーを保存してください。';
        statusEl.style.color = 'var(--danger-red)';
        return;
    }

    statusEl.textContent = `${providerName} に接続テスト中...`;
    statusEl.style.color = 'var(--light-text)';

    try {
        const result = await callAI('「こんにちは」と一言だけ返してください。', 32);
        if (result) {
            statusEl.textContent = `${providerName} 接続成功: "${result.trim().slice(0, 30)}"`;
            statusEl.style.color = 'var(--success-green)';
        } else {
            statusEl.textContent = `${providerName} 接続失敗: APIからの応答がありません。Consoleを確認してください。`;
            statusEl.style.color = 'var(--danger-red)';
        }
    } catch (error) {
        statusEl.textContent = `${providerName} 接続失敗: ${error.message}`;
        statusEl.style.color = 'var(--danger-red)';
    }
}

// ===== 統一AIコール関数 =====
async function callAI(prompt, maxTokens) {
    const { provider, apiKey } = getActiveAIConfig();
    if (!apiKey) return null;

    maxTokens = maxTokens || 1024;

    try {
        if (provider === 'claude') {
            return await callClaude(apiKey, prompt, maxTokens);
        } else if (provider === 'chatgpt') {
            return await callChatGPT(apiKey, prompt, maxTokens);
        } else if (provider === 'gemini') {
            return await callGemini(apiKey, prompt, maxTokens);
        }
    } catch (error) {
        console.error(`AI API error (${provider}):`, error);
        return null;
    }
}

async function callClaude(apiKey, prompt, maxTokens) {
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
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    if (!response.ok) {
        console.error('Claude API error:', response.status);
        return null;
    }
    const data = await response.json();
    return data.content[0].text;
}

async function callChatGPT(apiKey, prompt, maxTokens) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    if (!response.ok) {
        console.error('OpenAI API error:', response.status);
        return null;
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

// Geminiモデルの優先順位（無料枠が残っているモデルからフォールバック）
const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
];

async function callGemini(apiKey, prompt, maxTokens) {
    // 複数モデルを順にトライ（無料枠切れ対策）
    for (const model of GEMINI_MODELS) {
        const result = await callGeminiModel(apiKey, prompt, maxTokens, model);
        if (result !== null) return result;
    }
    return null;
}

async function callGeminiModel(apiKey, prompt, maxTokens, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.7
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        })
    });
    if (!response.ok) {
        // 429 (quota exceeded) の場合は次のモデルを試す
        if (response.status === 429) {
            console.warn(`Gemini ${model}: 無料枠超過、次のモデルを試行します`);
            return null;
        }
        console.error(`Gemini API error (${model}):`, response.status);
        return null;
    }
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        console.error(`Gemini ${model}: candidatesが空です`);
        return null;
    }
    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
        console.error(`Gemini ${model}: 安全フィルターによりブロックされました`);
        return null;
    }
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error(`Gemini ${model}: contentが空です`);
        return null;
    }
    // Gemini応答取得完了
    return candidate.content.parts[0].text;
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

// ===== AI レシピパーサー =====
async function parseRecipeWithAI(text) {
    const { apiKey } = getActiveAIConfig();
    if (!apiKey) return null;

    const prompt = `以下のレシピテキストから食材名と分量（グラム数）を抽出してJSON形式で返してください。
調味料も含めてください。分量が「適量」「少々」の場合はgramsを0にしてください。
大さじ1=15g、小さじ1=5g、1カップ=200gで換算してください。

レスポンスは以下のJSON配列のみを返してください（説明文不要）:
[{"name": "食材名", "grams": グラム数}]

レシピテキスト:
${text}`;

    try {
        const content = await callAI(prompt, 1024);
        if (!content) return null;

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
        console.error('AI parsing error:', error);
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
    const { apiKey } = getActiveAIConfig();
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
                <span class="paste-result-name">${escapeHtml(ing.name)}</span>
                <span class="paste-result-quantity">${escapeHtml(ing.rawQuantity)}${ing.grams > 0 ? ` (${Math.round(ing.grams)}g)` : ''}</span>
            </div>
            <div class="paste-result-actions">
                ${ing.matched
                    ? `<span class="match-badge match-ok">${escapeHtml(ing.matchedFood.name)}</span>
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

// ===== データバックアップ（エクスポート/インポート） =====

const BACKUP_KEYS = [
    'mealRecords', 'weightRecords', 'userProfile', 'mealHistory',
    'customFoods', 'pantryItems', 'shoppingList', 'aiProvider',
    'waterRecords', 'diaryCollapsed', 'favoriteFoods', 'morningSicknessMode', 'appTheme'
];

function setupBackupEvents() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importDataFile');
    if (exportBtn) exportBtn.addEventListener('click', exportAppData);
    if (importInput) importInput.addEventListener('change', importAppData);
}

function exportAppData() {
    const data = {};
    BACKUP_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = JSON.parse(val);
    });
    data._exportedAt = new Date().toISOString();
    data._appVersion = 'maternity-nutrition-v1';

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maternity-nutrition-backup-${getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('データをエクスポートしました');
}

function importAppData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const msgEl = document.getElementById('backupMessage');

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const raw = event.target.result;
            // サイズ制限（10MB）
            if (raw.length > 10 * 1024 * 1024) {
                if (msgEl) {
                    msgEl.textContent = 'ファイルサイズが大きすぎます（上限10MB）。';
                    msgEl.className = 'backup-message error';
                    msgEl.classList.remove('hidden');
                }
                return;
            }
            const data = JSON.parse(raw);

            // バリデーション: オブジェクトであること
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                if (msgEl) {
                    msgEl.textContent = 'このファイルは有効なバックアップファイルではありません。';
                    msgEl.className = 'backup-message error';
                    msgEl.classList.remove('hidden');
                }
                return;
            }

            // バリデーション: 許可されたキーのみ処理
            const validKeys = BACKUP_KEYS.filter(key => key in data);
            if (validKeys.length === 0) {
                if (msgEl) {
                    msgEl.textContent = 'このファイルは有効なバックアップファイルではありません。';
                    msgEl.className = 'backup-message error';
                    msgEl.classList.remove('hidden');
                }
                return;
            }

            if (!confirm(`${validKeys.length}種類のデータを復元します。現在のデータは上書きされます。よろしいですか？`)) {
                e.target.value = '';
                return;
            }

            // APIキーは復元しない（セキュリティ上の理由）
            // __proto__, constructor, prototype などの危険なキーを除外
            validKeys.forEach(key => {
                if (key.startsWith('aiApiKey_')) return;
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
                localStorage.setItem(key, JSON.stringify(data[key]));
            });

            if (msgEl) {
                msgEl.textContent = `${validKeys.length}種類のデータを復元しました。ページを再読み込みします...`;
                msgEl.className = 'backup-message success';
                msgEl.classList.remove('hidden');
            }

            showToast('データを復元しました');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = 'ファイルの読み込みに失敗しました。JSONファイルか確認してください。';
                msgEl.className = 'backup-message error';
                msgEl.classList.remove('hidden');
            }
        }
        e.target.value = '';
    };
    reader.readAsText(file);
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
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
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

        // 推奨食品を選定: 対象栄養素の含有量が多い順に上位8品
        const recommendations = getRecommendedFoods(def.nutrientId, deficit);

        // 棒グラフの色（統一してグリーン）
        let barClass = 'good';

        // 最初の3品と残りを分ける
        const visibleRecs = recommendations.slice(0, 3);
        const hiddenRecs = recommendations.slice(3);

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
                ${visibleRecs.length > 0 ? `
                    <div class="recommended-foods">
                        <p class="recommended-foods-label">おすすめ食品（不足分: ${deficit.toFixed(1)}${def.unit}）</p>
                        <div class="recommended-foods-list">
                            ${visibleRecs.map(rec => `
                                <div class="recommended-food-card">
                                    <div class="recommended-food-info">
                                        <span class="recommended-food-name">${rec.name}</span>
                                        <span class="recommended-food-amount">${rec.nutrientPer100g.toFixed(1)}${def.unit}/100g</span>
                                        <span class="recommended-food-needed">${rec.neededGrams}gで不足分を補完</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${hiddenRecs.length > 0 ? `
                            <details class="recommended-foods-more">
                                <summary>さらに${hiddenRecs.length}品を表示</summary>
                                <div class="recommended-foods-list">
                                    ${hiddenRecs.map(rec => `
                                        <div class="recommended-food-card">
                                            <div class="recommended-food-info">
                                                <span class="recommended-food-name">${rec.name}</span>
                                                <span class="recommended-food-amount">${rec.nutrientPer100g.toFixed(1)}${def.unit}/100g</span>
                                                <span class="recommended-food-needed">${rec.neededGrams}gで不足分を補完</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // 組み合わせ提案を生成・描画
    const combos = generateFoodCombinations(deficients);
    renderCombinationCards(combos);

    // 作り置きレシピ提案を描画
    renderMealPrepRecipes(deficients, trimester);

    // AI献立セクションの表示制御
    const aiSection = document.getElementById('aiRecipeSection');
    const aiDetailsWrap = aiSection ? aiSection.closest('.suggestion-sub-details') : null;
    if (aiSection) {
        const { apiKey } = getActiveAIConfig();
        if (apiKey) {
            if (aiDetailsWrap) aiDetailsWrap.classList.remove('hidden');
            // ボタンイベント（重複登録を防止）
            const btn = document.getElementById('generateAIRecipeBtn');
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', async () => {
                const loading = document.getElementById('aiRecipeLoading');
                const results = document.getElementById('aiRecipeResults');
                loading.classList.remove('hidden');
                results.innerHTML = '';
                newBtn.disabled = true;

                const mealType = document.getElementById('aiMealTypeSelect').value;
                const recipes = await fetchAIRecipes(deficients, mealType);
                loading.classList.add('hidden');
                newBtn.disabled = false;

                if (recipes && recipes.length > 0) {
                    renderAIRecipeCards(recipes);
                } else {
                    const { provider } = getActiveAIConfig();
                    const providerName = AI_PROVIDERS[provider]?.name || provider;
                    results.innerHTML = `<p class="ai-recipe-error">献立の生成に失敗しました。${providerName}のAPIキーと接続を確認してください。<br><span style="font-size:0.8rem;color:var(--light-text)">詳細はブラウザの開発者ツール（F12 → Console）で確認できます。</span></p>`;
                }
            });
        } else {
            if (aiDetailsWrap) aiDetailsWrap.classList.add('hidden');
        }
    }
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
        .slice(0, 8);

    return sorted;
}

// ===== 組み合わせ提案: 不足栄養素を複数食品で補う =====
function generateFoodCombinations(deficients) {
    // 微量栄養素の不足のみ対象
    const targetNutrients = deficients.filter(d =>
        ['iron', 'calcium', 'folate', 'vitaminD', 'vitaminB6', 'vitaminB12', 'zinc', 'fiber', 'dha'].includes(d.nutrientId)
    );
    if (targetNutrients.length === 0 || foodMasterData.length === 0) return [];

    // 各食品について不足栄養素のカバー率スコアを計算
    function scoreFoodForDeficits(food, remaining) {
        let score = 0;
        remaining.forEach(d => {
            const deficit = d.recommendedAmount - d.currentAmount;
            if (deficit > 0 && food[d.nutrientId]) {
                // 100gあたりの寄与率
                score += Math.min(food[d.nutrientId] / deficit, 1);
            }
        });
        return score;
    }

    const combos = [];
    // 2〜3セットの組み合わせを生成
    for (let attempt = 0; attempt < 3 && combos.length < 3; attempt++) {
        const usedFoodIds = new Set(combos.flatMap(c => c.foods.map(f => f.foodId)));
        const remaining = targetNutrients.map(d => ({ ...d }));
        const combo = { foods: [], coverageMap: {} };

        // 貪欲法で最大3食品を選定
        for (let pick = 0; pick < 3; pick++) {
            const candidates = foodMasterData
                .filter(f => !usedFoodIds.has(f.foodId))
                .map(f => ({ food: f, score: scoreFoodForDeficits(f, remaining) }))
                .filter(c => c.score > 0)
                .sort((a, b) => b.score - a.score);

            if (candidates.length === 0) break;
            const chosen = candidates[0].food;
            usedFoodIds.add(chosen.foodId);

            // 推奨量: 不足分を最も補う量（上限200g）
            let bestGrams = 100;
            remaining.forEach(d => {
                const deficit = d.recommendedAmount - d.currentAmount;
                if (deficit > 0 && chosen[d.nutrientId] > 0) {
                    const needed = Math.ceil(deficit / chosen[d.nutrientId] * 100);
                    bestGrams = Math.max(bestGrams, Math.min(needed, 200));
                }
            });
            bestGrams = Math.min(bestGrams, 200);

            combo.foods.push({
                foodId: chosen.foodId,
                name: chosen.name,
                grams: bestGrams
            });

            // 残りの不足を更新
            remaining.forEach(d => {
                if (chosen[d.nutrientId]) {
                    d.currentAmount += chosen[d.nutrientId] * bestGrams / 100;
                }
            });
        }

        if (combo.foods.length >= 2) {
            // カバー率を計算
            targetNutrients.forEach(d => {
                let covered = 0;
                combo.foods.forEach(f => {
                    const food = foodMasterData.find(fm => fm.foodId === f.foodId);
                    if (food && food[d.nutrientId]) {
                        covered += food[d.nutrientId] * f.grams / 100;
                    }
                });
                const deficit = d.recommendedAmount - d.currentAmount;
                combo.coverageMap[d.nutrientId] = {
                    name: d.name,
                    unit: d.unit,
                    covered: Math.round(covered * 10) / 10,
                    deficit: Math.round(deficit * 10) / 10,
                    rate: deficit > 0 ? Math.min(Math.round(covered / deficit * 100), 100) : 100
                };
            });
            combos.push(combo);
        }
    }

    return combos;
}

function renderCombinationCards(combos) {
    const container = document.getElementById('comboSuggestions');
    if (!container) return;

    if (combos.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    let html = '<h3 class="combo-title">おすすめメニュー（組み合わせ）</h3>';

    combos.forEach((combo, idx) => {
        const comboJSON = escapeAttr(JSON.stringify(combo.foods));
        html += `
            <div class="combo-card">
                <div class="combo-card-header">
                    <span class="combo-label">セット ${idx + 1}</span>
                </div>
                <div class="combo-foods-list">
                    ${combo.foods.map(f => `
                        <span class="combo-food-pill">${escapeHtml(f.name)} ${f.grams}g</span>
                    `).join('')}
                </div>
                <div class="combo-coverage">
                    ${Object.entries(combo.coverageMap).map(([, cov]) => `
                        <div class="combo-coverage-item">
                            <span class="combo-coverage-label">${escapeHtml(cov.name)}</span>
                            <div class="mini-progress-bar-container">
                                <div class="mini-progress-bar" style="width: ${Math.min(100, Math.max(0, Number(cov.rate) || 0))}%"></div>
                            </div>
                            <span class="combo-coverage-rate">${escapeHtml(cov.rate)}%補完</span>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-small btn-apply btn-add-combo"
                    data-combo="${comboJSON}">まとめて追加</button>
            </div>
        `;
    });

    container.innerHTML = html;

    // まとめて追加ボタンのイベント
    container.querySelectorAll('.btn-add-combo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addComboFoods(e.target.dataset.combo);
        });
    });
}

function addComboFoods(comboDataJSON) {
    let foods;
    try {
        foods = JSON.parse(comboDataJSON);
    } catch (e) {
        console.error('コンボデータの解析に失敗:', e);
        return;
    }

    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    const addedNames = [];

    foods.forEach(f => {
        const food = foodMasterData.find(fm => fm.foodId === f.foodId);
        if (!food) return;

        const nutrients = calculateNutrients(food, f.grams);
        const mealItem = {
            id: generateUUID(),
            mealType: currentMealType,
            foodId: food.foodId,
            foodName: food.name,
            quantity: f.grams,
            displayQuantity: f.grams,
            displayUnit: 'g',
            nutrients: nutrients,
            ingredients: null,
            createdAt: new Date().toISOString(),
            planned: isFutureDate(targetDate)
        };

        allRecords[targetDate].meals.push(mealItem);
        addToHistory(mealItem);
        addedNames.push(food.name);
    });

    safeSetItem('mealRecords', allRecords);

    // 表示を一度だけリフレッシュ
    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();

    showToast(`${addedNames.join('、')} を追加しました`);
}

// ===== AI献立生成 =====
const MEAL_TYPE_LABELS = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
    snack: '間食・おやつ',
    mealprep: '作り置き'
};

const MEAL_TYPE_HINTS = {
    breakfast: '朝に手軽に作れるもの。調理時間は15分以内を目安に',
    lunch: '昼食向けのバランスの良いメニュー',
    dinner: '夕食のメインディッシュや副菜の組み合わせ',
    snack: '小腹が空いたときの軽食やおやつ。甘いもの・しょっぱいもの両方OK',
    mealprep: '作り置き可能なおかず。冷蔵・冷凍保存ができ、複数人前を一度に作れるレシピ'
};

async function fetchAIRecipes(deficients, mealType) {
    const { apiKey } = getActiveAIConfig();
    if (!apiKey) return null;

    mealType = mealType || 'dinner';
    const mealLabel = MEAL_TYPE_LABELS[mealType] || '夕食';
    const mealHint = MEAL_TYPE_HINTS[mealType] || '';

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    let trimesterInfo = '妊娠中期';
    if (profile.pregnancyStartDate) {
        const week = getPregnancyWeek(profile.pregnancyStartDate);
        const trimester = getTrimester(week);
        trimesterInfo = `妊娠${week}週（${getTrimesterLabel(trimester)}）`;
    }

    const deficientList = deficients
        .filter(d => d.nutrientId !== 'calories')
        .map(d => `${d.name}: 現在${d.currentAmount.toFixed(1)}${d.unit} / 推奨${d.recommendedAmount}${d.unit}（不足${(d.recommendedAmount - d.currentAmount).toFixed(1)}${d.unit}）`)
        .join('\n');

    const isMealPrep = mealType === 'mealprep';
    const mealPrepJsonExtra = isMealPrep ? `\n  "storageInfo": "保存方法と日持ち（例: 冷蔵3日 / 冷凍2週間）",\n  "servings": 人数（3〜5人前）,` : '';
    const mealPrepConditions = isMealPrep ? `\n- 作り置き可能なレシピにする（冷蔵・冷凍保存できるもの）\n- 保存方法と日持ち期間を必ず記載する\n- 3〜5人前の分量で記載する` : '\n- 1人前の分量で記載';

    const prompt = `あなたは妊婦向け栄養管理の専門家です。以下の不足栄養素を補う「${mealLabel}」のレシピを2〜3品提案してください。

対象者: ${trimesterInfo}の妊婦
食事タイプ: ${mealLabel}（${mealHint}）
不足栄養素:
${deficientList}

以下のJSON配列のみを返してください（説明文不要）:
[{
  "name": "料理名",
  "cookTime": "調理時間（例: 15分）",${mealPrepJsonExtra}
  "ingredients": [{"name": "食材名", "amount": "分量テキスト", "grams": グラム数}],
  "steps": ["手順1", "手順2"],
  "estimatedNutrients": {"iron": 数値, "calcium": 数値, "folate": 数値, "protein": 数値, "vitaminD": 数値, "vitaminB6": 数値, "vitaminB12": 数値, "zinc": 数値, "fiber": 数値, "dha": 数値}
}]

条件:
- 妊婦が避けるべき食材（生肉、生魚、アルコール等）は使わない
- ${mealLabel}にふさわしいメニューにする
- 簡単に作れるレシピを優先${mealPrepConditions}`;

    try {
        const content = await callAI(prompt, 2048);
        if (!content) return null;

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return null;

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('AI献立生成エラー:', error);
        return null;
    }
}

function renderAIRecipeCards(recipes) {
    const container = document.getElementById('aiRecipeResults');
    if (!container || !recipes || recipes.length === 0) return;

    let html = '';

    recipes.forEach((recipe, idx) => {
        const recipeJSON = escapeAttr(JSON.stringify(recipe));
        const nutrientBadges = recipe.estimatedNutrients
            ? Object.entries(recipe.estimatedNutrients)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => {
                    const labels = { iron: '鉄', calcium: 'Ca', folate: '葉酸', protein: 'タンパク質', vitaminD: 'VD', vitaminB6: 'B6', vitaminB12: 'B12', zinc: '亜鉛', fiber: '食物繊維', dha: 'DHA' };
                    const units = { iron: 'mg', calcium: 'mg', folate: 'μg', protein: 'g', vitaminD: 'μg', vitaminB6: 'mg', vitaminB12: 'μg', zinc: 'mg', fiber: 'g', dha: 'mg' };
                    return `<span class="nutrient-badge">${labels[k] || k} ${v}${units[k] || ''}</span>`;
                }).join('')
            : '';

        html += `
            <div class="ai-recipe-card">
                <div class="ai-recipe-card-header">
                    <h4 class="ai-recipe-name">${escapeHtml(recipe.name)}</h4>
                    <span class="ai-recipe-time">${escapeHtml(recipe.cookTime || '')}</span>
                </div>
                ${recipe.storageInfo ? `<div class="recipe-meta-badges"><span class="recipe-storage-badge">${escapeHtml(recipe.storageInfo)}</span>${recipe.servings ? `<span class="recipe-servings-badge">${escapeHtml(recipe.servings)}人前</span>` : ''}</div>` : ''}
                <div class="ai-recipe-nutrients">${nutrientBadges}</div>
                <div class="ai-recipe-ingredients">
                    <p class="ai-recipe-sub-label">食材:</p>
                    <ul>
                        ${recipe.ingredients.map(ing =>
                            `<li>${escapeHtml(ing.name)} ${escapeHtml(ing.amount)}</li>`
                        ).join('')}
                    </ul>
                </div>
                <details class="ai-recipe-steps">
                    <summary>作り方を見る</summary>
                    <ol>
                        ${recipe.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                    </ol>
                </details>
                <button type="button" class="btn btn-small btn-apply btn-add-recipe-ingredients"
                    data-recipe="${recipeJSON}">食材を追加</button>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-add-recipe-ingredients').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recipeData = JSON.parse(e.target.dataset.recipe);
            addRecipeIngredients(recipeData);
        });
    });
}

function addRecipeIngredients(recipe) {
    if (!recipe || !recipe.ingredients) return;

    // matchIngredientsToMasterを再利用
    const ingredients = recipe.ingredients.map(ing => ({
        name: ing.name,
        rawQuantity: ing.amount,
        grams: ing.grams || 0,
        matched: false,
        matchedFood: null
    }));

    const matched = matchIngredientsToMaster(ingredients);

    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    if (!allRecords[targetDate]) {
        allRecords[targetDate] = { meals: [] };
    }

    let addedCount = 0;

    matched.forEach(ing => {
        if (!ing.matched || !ing.matchedFood || ing.grams <= 0) return;

        const nutrients = calculateNutrients(ing.matchedFood, ing.grams);
        const mealItem = {
            id: generateUUID(),
            mealType: currentMealType,
            foodId: ing.matchedFood.foodId,
            foodName: ing.matchedFood.name,
            quantity: ing.grams,
            displayQuantity: ing.grams,
            displayUnit: 'g',
            nutrients: nutrients,
            ingredients: null,
            createdAt: new Date().toISOString(),
            planned: isFutureDate(targetDate)
        };

        allRecords[targetDate].meals.push(mealItem);
        addToHistory(mealItem);
        addedCount++;
    });

    safeSetItem('mealRecords', allRecords);

    displayMeals();
    updateNutrientsSummary();
    renderSuggestionSection();

    const unmatchedCount = matched.filter(i => !i.matched).length;
    let msg = `${recipe.name}の食材 ${addedCount}品を追加しました`;
    if (unmatchedCount > 0) {
        msg += `（${unmatchedCount}品はマッチしませんでした）`;
    }
    showToast(msg, 3000);
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

// ===== 記録ストリーク計算 =====
function updateStreak() {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = getTodayString();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const meals = allRecords[dateStr]?.meals || [];
        if (meals.length > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    const countEl = document.getElementById('streakCount');
    if (countEl) countEl.textContent = streak;
}

// ===== 栄養スコア（あすけん健康度風 100点満点） =====
function updateNutritionScore() {
    const targetDate = currentMealDate || getTodayString();
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const meals = allRecords[targetDate]?.meals || [];

    if (meals.length === 0) {
        const el = document.getElementById('nutritionScoreValue');
        if (el) el.textContent = '--';
        return;
    }

    // 各栄養素の合計を計算
    const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
    meals.forEach(m => {
        Object.keys(totals).forEach(k => { totals[k] += (m.nutrients[k] || 0); });
    });

    let score = 0;

    // つわりモード: 何か食べた=50点ベースの優しいスコアリング (B7)
    if (isMorningSicknessMode()) {
        score = 50; // 何か食べただけで50点
        const calGoal = NUTRIENT_RECOMMENDATIONS.calories?.recommended || 2250;
        const calRatio = totals.calories / calGoal;
        if (calRatio >= 0.3) score += 15;
        else if (calRatio > 0) score += 10;
        // 水分を摂れたかのボーナス
        const waterCount = getWaterCount();
        if (waterCount >= 4) score += 15;
        else if (waterCount >= 2) score += 10;
        // 複数回に分けて食べたボーナス
        const typesUsed = new Set(meals.map(m => m.mealType));
        if (typesUsed.size >= 3) score += 20;
        else if (typesUsed.size >= 2) score += 15;
        else score += 5;
        score = Math.min(score, 100);
    } else {
    // 通常モード
    // カロリー適合度（30点）: 目標の80-120%が満点
    const calGoal = NUTRIENT_RECOMMENDATIONS.calories?.recommended || 2250;
    const calRatio = totals.calories / calGoal;
    if (calRatio >= 0.8 && calRatio <= 1.2) {
        score += 30;
    } else if (calRatio >= 0.6 && calRatio <= 1.4) {
        score += 20;
    } else if (calRatio > 0) {
        score += 10;
    }

    // PFCバランス（20点）
    const totalCal = totals.calories || 1;
    const pRatio = (totals.protein * 4) / totalCal;
    const fRatio = (totals.fat * 9) / totalCal;
    const cRatio = (totals.carbohydrate * 4) / totalCal;
    // 理想: P13-20%, F20-30%, C50-65%
    if (pRatio >= 0.13 && pRatio <= 0.20) score += 7;
    else if (pRatio >= 0.10) score += 4;
    if (fRatio >= 0.20 && fRatio <= 0.30) score += 7;
    else if (fRatio >= 0.15 && fRatio <= 0.35) score += 4;
    if (cRatio >= 0.50 && cRatio <= 0.65) score += 6;
    else if (cRatio >= 0.40) score += 3;

    // 微量栄養素（30点: 主要3種各6点 + 新規4種各3点 = 30点）
    const microNutrients = [
        { key: 'iron', points: 6 },
        { key: 'calcium', points: 6 },
        { key: 'folate', points: 6 },
        { key: 'vitaminD', points: 3 },
        { key: 'vitaminB12', points: 3 },
        { key: 'zinc', points: 3 },
        { key: 'fiber', points: 3 }
    ];
    microNutrients.forEach(({ key, points }) => {
        const rec = NUTRIENT_RECOMMENDATIONS[key]?.recommended || 1;
        const ratio = totals[key] / rec;
        if (ratio >= 0.8) score += points;
        else if (ratio >= 0.5) score += Math.round(points * 0.6);
        else if (ratio > 0) score += Math.round(points * 0.3);
    });

    // 食事回数バランス（20点）: 3食以上で満点
    const typesUsed = new Set(meals.map(m => m.mealType));
    if (typesUsed.size >= 3) score += 20;
    else if (typesUsed.size >= 2) score += 12;
    else score += 5;
    } // end normal mode

    const el = document.getElementById('nutritionScoreValue');
    if (el) {
        el.textContent = score;
        // スコアに応じた色
        if (score >= 70) el.style.color = '#259D63';
        else if (score >= 40) el.style.color = '#C16800';
        else el.style.color = '#EC0000';
    }
}

// ===== 水分記録 =====
function initWaterTracker() {
    const container = document.getElementById('waterGlasses');
    if (!container) return;

    let html = '';
    for (let i = 0; i < 8; i++) {
        html += `<button type="button" class="water-glass" data-index="${i}"></button>`;
    }
    container.innerHTML = html;

    // 今日のデータを読み込み
    updateWaterDisplay();

    // クリックイベント
    container.querySelectorAll('.water-glass').forEach(glass => {
        glass.addEventListener('click', () => {
            const idx = parseInt(glass.dataset.index);
            const current = getWaterCount();
            // タップしたグラスが既にfillの最後なら1つ減らす、それ以外はそこまでfill
            if (idx + 1 === current) {
                setWaterCount(idx);
            } else {
                setWaterCount(idx + 1);
            }
            updateWaterDisplay();
        });
    });
}

function getWaterCount() {
    const dateKey = currentMealDate || getTodayString();
    const data = JSON.parse(localStorage.getItem('waterRecords') || '{}');
    return data[dateKey] || 0;
}

function setWaterCount(count) {
    const dateKey = currentMealDate || getTodayString();
    const data = JSON.parse(localStorage.getItem('waterRecords') || '{}');
    data[dateKey] = count;
    safeSetItem('waterRecords', data);

    // リマインダー再チェック
    if (typeof checkAndRenderReminders === 'function') checkAndRenderReminders();
}

function updateWaterDisplay() {
    const count = getWaterCount();
    const container = document.getElementById('waterGlasses');
    if (!container) return;

    container.querySelectorAll('.water-glass').forEach((glass, i) => {
        glass.classList.toggle('filled', i < count);
    });

    const amountEl = document.getElementById('waterAmount');
    if (amountEl) amountEl.textContent = count * 250;
}

// ============================================================
// B7: つわり対応モード
// ============================================================

const MORNING_SICKNESS_EASY_FOODS = [
    { name: 'クラッカー', tip: '起床前にベッドで数枚食べると楽に' },
    { name: '生姜湯・ジンジャーエール', tip: '生姜は吐き気を和らげる効果' },
    { name: 'レモン水', tip: '冷たくしてこまめに少量ずつ' },
    { name: '冷たいおにぎり', tip: '匂いが少なく食べやすい' },
    { name: '素うどん', tip: '消化が良くお腹に優しい' },
    { name: 'バナナ', tip: 'エネルギー補給に最適' },
    { name: 'ゼリー・寒天', tip: '水分補給も兼ねて' },
    { name: '豆腐（冷奴）', tip: 'タンパク質を摂りやすい' },
    { name: 'りんご', tip: 'すりおろすとさらに食べやすい' },
    { name: 'ヨーグルト', tip: '整腸作用もあり一石二鳥' }
];

function isMorningSicknessMode() {
    return localStorage.getItem('morningSicknessMode') === 'true';
}

// ===== テーマカラー切り替え =====
const ALLOWED_THEMES = ['default', 'sage', 'terracotta'];

function initThemePicker() {
    // 保存済みテーマを適用（ホワイトリスト検証）
    const saved = localStorage.getItem('appTheme');
    if (saved && saved !== 'default' && ALLOWED_THEMES.includes(saved)) {
        document.documentElement.setAttribute('data-theme', saved);
    }

    const picker = document.getElementById('themePicker');
    if (!picker) return;

    // 保存済みのアクティブ状態を反映
    if (saved) {
        picker.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === saved);
        });
    }

    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-option');
        if (!btn) return;

        const theme = btn.dataset.theme;
        if (!ALLOWED_THEMES.includes(theme)) return;

        // アクティブ状態の更新
        picker.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // テーマ適用
        if (theme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        localStorage.setItem('appTheme', theme);
        showToast('テーマカラーを変更しました');
    });
}

function initMorningSicknessMode() {
    const toggle = document.getElementById('morningSicknessToggle');
    if (!toggle) return;
    toggle.checked = isMorningSicknessMode();
    toggle.addEventListener('change', () => {
        toggleMorningSicknessMode(toggle.checked);
    });
    updateMorningSicknessUI();
}

function toggleMorningSicknessMode(enabled) {
    localStorage.setItem('morningSicknessMode', enabled ? 'true' : 'false');
    updateMorningSicknessUI();
    updateNutrientsSummary();
    updateNutritionScore();
    showToast(enabled ? 'つわりモードをONにしました' : 'つわりモードをOFFにしました');
}

function updateMorningSicknessUI() {
    const enabled = isMorningSicknessMode();
    const banner = document.getElementById('morningSicknessBanner');
    if (banner) banner.classList.toggle('hidden', !enabled);

    const foodsContainer = document.getElementById('morningSicknessEasyFoods');
    if (foodsContainer) {
        foodsContainer.classList.toggle('hidden', !enabled);
        if (enabled) {
            foodsContainer.innerHTML = `
                <h4>食べやすい食品リスト</h4>
                ${MORNING_SICKNESS_EASY_FOODS.map(f => `
                    <div class="ms-easy-food-item">
                        <span>${f.name}</span>
                        <span class="ms-easy-food-tip">${f.tip}</span>
                    </div>
                `).join('')}
            `;
        }
    }
}

// ============================================================
// 産後モード
// ============================================================

function initPostpartumMode() {
    const toggle = document.getElementById('postpartumToggle');
    const dateGroup = document.getElementById('postpartumDateGroup');
    const dateInput = document.getElementById('birthDateInput');
    const feedingSelect = document.getElementById('feedingTypeSelect');
    if (!toggle) return;

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    toggle.checked = profile.mode === 'postpartum';
    if (toggle.checked && dateGroup) dateGroup.classList.remove('hidden');
    if (profile.birthDate && dateInput) dateInput.value = profile.birthDate;
    if (profile.feedingType && feedingSelect) feedingSelect.value = profile.feedingType;

    toggle.addEventListener('change', () => {
        const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (toggle.checked) {
            profile.mode = 'postpartum';
            if (dateGroup) dateGroup.classList.remove('hidden');
            if (!profile.birthDate) {
                profile.birthDate = getTodayString();
                if (dateInput) dateInput.value = profile.birthDate;
            }
            if (!profile.feedingType) {
                profile.feedingType = 'breastfeeding';
                if (feedingSelect) feedingSelect.value = 'breastfeeding';
            }
        } else {
            delete profile.mode;
            delete profile.birthDate;
            delete profile.feedingType;
            if (dateGroup) dateGroup.classList.add('hidden');
        }
        localStorage.setItem('userProfile', JSON.stringify(profile));
        updateRecommendationsForTrimester();
        renderDashboard();
        showToast(toggle.checked ? '産後モードに切り替えました' : '妊娠モードに戻しました');
    });

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            profile.birthDate = dateInput.value;
            localStorage.setItem('userProfile', JSON.stringify(profile));
            updateRecommendationsForTrimester();
            renderDashboard();
        });
    }

    if (feedingSelect) {
        feedingSelect.addEventListener('change', () => {
            const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            profile.feedingType = feedingSelect.value;
            localStorage.setItem('userProfile', JSON.stringify(profile));
            updateRecommendationsForTrimester();
            renderDashboard();
            const labels = { breastfeeding: '完全母乳', mixed: '混合', formula: '完全ミルク' };
            showToast(`授乳方法を「${labels[feedingSelect.value]}」に変更しました`);
        });
    }
}

// ============================================================
// A2: お気に入り食品
// ============================================================

function getFavoriteFoods() {
    return JSON.parse(localStorage.getItem('favoriteFoods') || '[]');
}

function saveFavoriteFoods(favorites) {
    localStorage.setItem('favoriteFoods', JSON.stringify(favorites));
}

function isFavorite(foodId) {
    return getFavoriteFoods().some(f => f.foodId === foodId);
}

function toggleFavorite(foodId, foodName, quantity, unitName) {
    let favorites = getFavoriteFoods();
    const index = favorites.findIndex(f => f.foodId === foodId);
    if (index >= 0) {
        favorites.splice(index, 1);
        showToast(`${foodName} をお気に入りから削除`);
    } else {
        favorites.push({ foodId, foodName, quantity: quantity || 1, unitName: unitName || 'g' });
        showToast(`${foodName} をお気に入りに追加`);
    }
    saveFavoriteFoods(favorites);
    displayMeals();
    displayFavorites();
}

function displayFavorites() {
    const section = document.getElementById('favoritesSection');
    const list = document.getElementById('favoritesList');
    if (!section || !list) return;

    const favorites = getFavoriteFoods();
    if (favorites.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');
    list.innerHTML = favorites.map((fav, i) => `
        <div class="favorite-chip" data-index="${i}">
            <span class="fav-star">★</span>
            <span class="fav-text">${escapeHtml(fav.foodName)} (${escapeHtml(fav.quantity)}${escapeHtml(fav.unitName)})</span>
            <span class="fav-remove" data-food-id="${escapeAttr(fav.foodId)}">&times;</span>
        </div>
    `).join('');

    list.querySelectorAll('.fav-text').forEach((el, i) => {
        el.addEventListener('click', () => {
            const fav = favorites[i];
            const food = foodMasterData.find(f => f.foodId === fav.foodId);
            if (food) {
                selectedFood = food;
                document.getElementById('foodSearch').value = food.name;
                document.getElementById('selectedFoodDisplay').classList.remove('hidden');
                document.getElementById('selectedFoodName').textContent = food.name;
                hideFoodSuggestions();
                updateUnitSelect(food);
                const unitSelect = document.getElementById('unitSelect');
                for (let option of unitSelect.options) {
                    if (option.textContent === fav.unitName) {
                        unitSelect.value = option.value;
                        break;
                    }
                }
                document.getElementById('quantity').value = fav.quantity;
                updateQuantityHint();
            }
        });
    });

    list.querySelectorAll('.fav-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const foodId = btn.dataset.foodId;
            const fav = favorites.find(f => f.foodId === foodId);
            if (fav) toggleFavorite(fav.foodId, fav.foodName);
        });
    });
}

// ============================================================
// A1: 食事コピー機能
// ============================================================

function getRecentDatesWithMeals(mealType, maxDays) {
    maxDays = maxDays || 14;
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = new Date();
    const targetDate = currentMealDate || getTodayString();
    const results = [];

    for (let i = 1; i <= maxDays; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr === targetDate) continue;
        const meals = allRecords[dateStr]?.meals || [];
        const typeMeals = meals.filter(m => m.mealType === mealType);
        if (typeMeals.length > 0) {
            results.push({
                date: dateStr,
                count: typeMeals.length,
                foods: typeMeals.map(m => m.foodName).join(', ')
            });
        }
    }
    return results;
}

function showMealCopyPicker(mealType) {
    const dates = getRecentDatesWithMeals(mealType);
    if (dates.length === 0) {
        showToast('コピー元の食事記録がありません');
        return;
    }

    const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
    const overlay = document.createElement('div');
    overlay.className = 'meal-copy-overlay';
    overlay.id = 'mealCopyOverlay';
    overlay.innerHTML = `
        <div class="meal-copy-sheet">
            <h3>${mealLabels[mealType]}をコピー</h3>
            ${dates.map(d => {
                const dt = new Date(d.date);
                const weekdays = ['日','月','火','水','木','金','土'];
                const label = `${dt.getMonth()+1}/${dt.getDate()}(${weekdays[dt.getDay()]})`;
                return `
                    <div class="copy-date-item" data-date="${d.date}" data-type="${mealType}">
                        <div>
                            <div class="copy-date-label">${label}</div>
                            <div class="copy-date-count">${d.foods}</div>
                        </div>
                        <span>${d.count}品</span>
                    </div>
                `;
            }).join('')}
            <button class="copy-close-btn">閉じる</button>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.copy-close-btn').addEventListener('click', closeMealCopyPicker);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeMealCopyPicker();
    });

    overlay.querySelectorAll('.copy-date-item').forEach(item => {
        item.addEventListener('click', () => {
            copyMealsFromDate(item.dataset.date, item.dataset.type);
            closeMealCopyPicker();
        });
    });
}

function copyMealsFromDate(sourceDate, mealType) {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const sourceMeals = (allRecords[sourceDate]?.meals || []).filter(m => m.mealType === mealType);
    if (sourceMeals.length === 0) return;

    const targetDate = currentMealDate || getTodayString();
    if (!allRecords[targetDate]) allRecords[targetDate] = { meals: [] };

    sourceMeals.forEach(meal => {
        const copied = JSON.parse(JSON.stringify(meal));
        copied.id = generateUUID();
        copied.createdAt = new Date().toISOString();
        copied.planned = isFutureDate(targetDate);
        allRecords[targetDate].meals.push(copied);
    });

    safeSetItem('mealRecords', allRecords);
    displayMeals();
    updateNutrientsSummary();
    updateNutritionScore();
    updateStreak();
    renderSuggestionSection();
    showToast(`${sourceMeals.length}品をコピーしました`);
}

function closeMealCopyPicker() {
    const overlay = document.getElementById('mealCopyOverlay');
    if (overlay) overlay.remove();
}

// ============================================================
// B5: 妊娠週数アドバイス
// ============================================================

const PREGNANCY_WEEK_ADVICE = [
    { min: 0, max: 3, title: '妊娠超初期（0〜3週）', advice: '妊娠に気づく前の時期。葉酸の摂取を意識しましょう。', nutrients: ['葉酸'], foods: ['ほうれん草', 'ブロッコリー', '枝豆'] },
    { min: 4, max: 7, title: '妊娠初期（4〜7週）', advice: 'つわりが始まることも。食べられるものを少量ずつ。葉酸は引き続き重要です。', nutrients: ['葉酸', 'ビタミンB6'], foods: ['バナナ', 'アボカド', '玄米'] },
    { min: 8, max: 11, title: '妊娠初期（8〜11週）', advice: 'つわりのピーク期。水分補給を最優先に。脱水に注意しましょう。', nutrients: ['葉酸', '水分'], foods: ['ゼリー', '果物', 'スープ'] },
    { min: 12, max: 15, title: '妊娠初期後半（12〜15週）', advice: 'つわりが落ち着く頃。バランスの良い食事を再開しましょう。', nutrients: ['葉酸', '鉄'], foods: ['赤身肉', 'レバー', '小松菜'] },
    { min: 16, max: 19, title: '安定期（16〜19週）', advice: '食欲が出てくる時期。鉄分とカルシウムを意識的に摂りましょう。', nutrients: ['鉄', 'カルシウム'], foods: ['牛乳', '小魚', 'ひじき'] },
    { min: 20, max: 23, title: '妊娠中期（20〜23週）', advice: '赤ちゃんの骨格が発達中。カルシウムとビタミンDが大切です。', nutrients: ['カルシウム', 'ビタミンD'], foods: ['鮭', 'しらす', 'きのこ'] },
    { min: 24, max: 27, title: '妊娠中期後半（24〜27週）', advice: '血液量が増加。鉄分不足に注意。貧血検査の結果もチェック。', nutrients: ['鉄', 'タンパク質'], foods: ['赤身肉', '納豆', 'あさり'] },
    { min: 28, max: 31, title: '妊娠後期（28〜31週）', advice: 'お腹が大きくなり胃が圧迫されます。少量頻回の食事がおすすめ。', nutrients: ['鉄', 'カルシウム', 'DHA'], foods: ['サバ', 'イワシ', '豆腐'] },
    { min: 32, max: 35, title: '妊娠後期（32〜35週）', advice: '出産準備期。体力づくりのためにタンパク質と鉄をしっかり。', nutrients: ['タンパク質', '鉄'], foods: ['鶏むね肉', '卵', 'ほうれん草'] },
    { min: 36, max: 39, title: '臨月（36〜39週）', advice: '赤ちゃんの体重増加期。バランス良く食べつつ体重管理も意識。', nutrients: ['タンパク質', 'ビタミンK'], foods: ['納豆', 'ブロッコリー', 'ほうれん草'] },
    { min: 40, max: 42, title: '出産予定日前後（40〜42週）', advice: 'いつ出産になっても大丈夫。消化の良い食事で体力温存。', nutrients: ['炭水化物', 'タンパク質'], foods: ['おにぎり', 'バナナ', 'ゼリー'] }
];

function getWeekAdvice(week) {
    if (week === null || week === undefined) return null;
    return PREGNANCY_WEEK_ADVICE.find(a => week >= a.min && week <= a.max) || null;
}

function renderPregnancyAdviceCard() {
    const card = document.getElementById('pregnancyAdviceCard');
    if (!card) return;

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    // 産後モードでは妊娠アドバイスを表示しない
    if (profile.mode === 'postpartum' || !profile.pregnancyStartDate) {
        card.classList.add('hidden');
        return;
    }

    const week = getPregnancyWeek(profile.pregnancyStartDate);
    const advice = getWeekAdvice(week);
    if (!advice) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    card.innerHTML = `
        <div class="pregnancy-advice-card">
            <div class="advice-card-header">
                <svg class="advice-icon-svg" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <h3>${advice.title}</h3>
            </div>
            <div class="advice-card-body">
                <p>${advice.advice}</p>
                <div class="advice-nutrients">
                    ${advice.nutrients.map(n => `<span class="advice-nutrient-tag">${n}</span>`).join('')}
                </div>
                <div class="advice-foods">おすすめ: ${advice.foods.join('、')}</div>
            </div>
        </div>
    `;
}

function renderMealTabAdviceTip() {
    const tip = document.getElementById('weekAdviceTip');
    if (!tip) return;

    if (sessionStorage.getItem('weekAdviceTipClosed') === 'true') {
        tip.classList.add('hidden');
        return;
    }

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    // 産後モードまたは妊娠開始日未設定の場合は非表示
    if (profile.mode === 'postpartum' || !profile.pregnancyStartDate) {
        tip.classList.add('hidden');
        return;
    }

    const week = getPregnancyWeek(profile.pregnancyStartDate);
    const advice = getWeekAdvice(week);
    if (!advice) {
        tip.classList.add('hidden');
        return;
    }

    tip.classList.remove('hidden');
    tip.innerHTML = `
        <button class="tip-close" id="closeTipBtn">&times;</button>
        <div class="tip-title">${advice.title}</div>
        <div>注目: ${advice.nutrients.join('、')} | おすすめ: ${advice.foods.join('、')}</div>
    `;

    document.getElementById('closeTipBtn').addEventListener('click', () => {
        tip.classList.add('hidden');
        sessionStorage.setItem('weekAdviceTipClosed', 'true');
    });
}

// ============================================================
// B6: 体重増加ペース予測（ダッシュボードカード部分）
// ============================================================

function renderWeightPrediction() {
    const card = document.getElementById('weightPredictionCard');
    if (!card) return;

    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const records = JSON.parse(localStorage.getItem('weightRecords') || '[]');

    // 産後モードでは体重予測を表示しない
    if (profile.mode === 'postpartum' || !profile.pregnancyStartDate || !profile.prePregnancyWeight || !profile.height || records.length < 2) {
        card.classList.add('hidden');
        return;
    }

    const projection = projectFinalWeight(profile, records);
    if (!projection) {
        card.classList.add('hidden');
        return;
    }

    const heightM = profile.height / 100;
    const bmi = profile.prePregnancyWeight / (heightM * heightM);
    const range = getRecommendedGainRange(bmi);

    let statusClass = 'good';
    let statusText = '推奨範囲内';
    if (projection.totalGain > range.max) {
        statusClass = 'over';
        statusText = '推奨上限を超える見込み';
    } else if (projection.totalGain < range.min) {
        statusClass = 'warning';
        statusText = '推奨下限を下回る見込み';
    }

    card.classList.remove('hidden');
    card.innerHTML = `
        <h3 style="font-size:0.9rem;margin-bottom:0.4rem;color:var(--dark-text)">体重増加ペース予測</h3>
        <div class="weight-prediction-card">
            <div class="prediction-main">
                <span class="prediction-value">${projection.totalGain >= 0 ? '+' : ''}${projection.totalGain.toFixed(1)}</span>
                <span class="prediction-unit">kg（出産時予測）</span>
            </div>
            <div class="prediction-status ${statusClass}">${statusText}（推奨: +${range.min}〜+${range.max}kg）</div>
            <div class="prediction-detail">
                週あたり ${projection.weeklyRate >= 0 ? '+' : ''}${projection.weeklyRate.toFixed(2)}kg/週ペース
                （現在 ${projection.currentWeight.toFixed(1)}kg / 妊娠前 ${profile.prePregnancyWeight}kg）
            </div>
        </div>
    `;
}

// ============================================================
// A4: 週間・月間レポート
// ============================================================

function setupReportPeriodTabs() {
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderReport(parseInt(tab.dataset.days));
        });
    });
}

function renderReport(days) {
    days = days || 7;
    const container = document.getElementById('reportContainer');
    if (!container) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stats = calculatePeriodNutritionStats(startStr, endStr);
    let html = '';

    html += renderAverageScoreReport(stats);
    html += renderNutrientAchievementReport(stats);
    html += renderReportComment(stats, days);

    container.innerHTML = html;
}

function calculatePeriodNutritionStats(startDate, endDate) {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const days = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const meals = allRecords[dateStr]?.meals || [];
        const totals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
        meals.forEach(m => {
            Object.keys(totals).forEach(k => { totals[k] += (m.nutrients[k] || 0); });
        });
        days.push({ date: dateStr, totals, mealCount: meals.length });
        current.setDate(current.getDate() + 1);
    }

    const daysWithMeals = days.filter(d => d.mealCount > 0);
    const avgTotals = { calories: 0, protein: 0, fat: 0, carbohydrate: 0, iron: 0, calcium: 0, folate: 0, vitaminD: 0, vitaminB6: 0, vitaminB12: 0, zinc: 0, fiber: 0, dha: 0 };
    if (daysWithMeals.length > 0) {
        daysWithMeals.forEach(d => {
            Object.keys(avgTotals).forEach(k => { avgTotals[k] += d.totals[k]; });
        });
        Object.keys(avgTotals).forEach(k => { avgTotals[k] /= daysWithMeals.length; });
    }

    // 日別スコアを計算
    const dayScores = days.map(d => {
        if (d.mealCount === 0) return { ...d, score: 0 };
        let score = 0;
        const calGoal = NUTRIENT_RECOMMENDATIONS.calories?.recommended || 2250;
        const calRatio = d.totals.calories / calGoal;
        if (calRatio >= 0.8 && calRatio <= 1.2) score += 30;
        else if (calRatio >= 0.6 && calRatio <= 1.4) score += 20;
        else if (calRatio > 0) score += 10;

        ['iron', 'calcium', 'folate', 'vitaminD', 'vitaminB12', 'zinc', 'fiber'].forEach(key => {
            const rec = NUTRIENT_RECOMMENDATIONS[key]?.recommended || 1;
            const ratio = d.totals[key] / rec;
            const pts = ['iron', 'calcium', 'folate'].includes(key) ? 6 : 3;
            if (ratio >= 0.8) score += pts;
            else if (ratio >= 0.5) score += Math.round(pts * 0.6);
            else if (ratio > 0) score += Math.round(pts * 0.3);
        });

        score += Math.min(d.mealCount, 3) >= 3 ? 20 : (d.mealCount >= 2 ? 12 : 5);
        // Simplified PFC score
        const totalCal = d.totals.calories || 1;
        const pRatio = (d.totals.protein * 4) / totalCal;
        if (pRatio >= 0.13 && pRatio <= 0.20) score += 10;
        else if (pRatio >= 0.10) score += 5;

        return { ...d, score };
    });

    return { days, daysWithMeals, avgTotals, dayScores, totalDays: days.length };
}

function renderNutrientAchievementReport(stats) {
    const nutrients = ['calories', 'protein', 'iron', 'calcium', 'folate', 'vitaminD', 'vitaminB6', 'vitaminB12', 'zinc', 'fiber', 'dha'];
    let html = '<div class="report-section"><h4>栄養素別 平均達成率</h4>';

    nutrients.forEach(key => {
        const rec = NUTRIENT_RECOMMENDATIONS[key];
        if (!rec) return;
        const avg = stats.avgTotals[key];
        const pct = Math.round((avg / rec.recommended) * 100);
        const color = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-pink)' : 'var(--sumi-500)';

        html += `
            <div class="report-achievement-bar">
                <span class="report-bar-label">${rec.label}</span>
                <div class="report-bar-track">
                    <div class="report-bar-fill" style="width:${Math.min(pct, 100)}%; background:${color}"></div>
                </div>
                <span class="report-bar-value" style="color:${color}">${pct}%</span>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function renderBestWorstDaysReport(stats) {
    const scored = stats.dayScores.filter(d => d.mealCount > 0).sort((a, b) => b.score - a.score);
    if (scored.length === 0) return '<div class="report-section"><h4>ベスト/ワーストの日</h4><p style="font-size:0.85rem;color:var(--light-text)">データがありません</p></div>';

    const best = scored[0];
    const worst = scored[scored.length - 1];
    const formatDate = (d) => {
        const dt = new Date(d);
        const wd = ['日','月','火','水','木','金','土'];
        return `${dt.getMonth()+1}/${dt.getDate()}(${wd[dt.getDay()]})`;
    };

    return `
        <div class="report-section">
            <h4>ベスト/ワーストの日</h4>
            <div class="report-day-card" style="border-left:3px solid var(--success-green)">
                <span>ベスト: ${formatDate(best.date)}</span>
                <span style="font-weight:600;color:var(--success-green)">${best.score}点</span>
            </div>
            <div class="report-day-card" style="border-left:3px solid var(--danger-red)">
                <span>ワースト: ${formatDate(worst.date)}</span>
                <span style="font-weight:600;color:var(--danger-red)">${worst.score}点</span>
            </div>
        </div>
    `;
}

function renderWeightTrendReport(days) {
    const records = JSON.parse(localStorage.getItem('weightRecords') || '[]');
    if (records.length < 2) return '<div class="report-section"><h4>体重推移</h4><p style="font-size:0.85rem;color:var(--light-text)">体重記録が2件以上必要です</p></div>';

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const periodRecords = sorted.filter(r => r.date >= cutoffStr);

    if (periodRecords.length < 1) {
        return '<div class="report-section"><h4>体重推移</h4><p style="font-size:0.85rem;color:var(--light-text)">期間内の記録がありません</p></div>';
    }

    const first = periodRecords[0];
    const last = periodRecords[periodRecords.length - 1];
    const change = last.weight - first.weight;

    return `
        <div class="report-section">
            <h4>体重推移（期間内）</h4>
            <div class="report-weight-summary">
                <div class="report-weight-item">
                    <span class="rw-value">${first.weight.toFixed(1)} kg</span>
                    <span class="rw-label">期間開始</span>
                </div>
                <div class="report-weight-item">
                    <span class="rw-value">${last.weight.toFixed(1)} kg</span>
                    <span class="rw-label">最新</span>
                </div>
                <div class="report-weight-item">
                    <span class="rw-value" style="color:${change > 0 ? 'var(--danger-red)' : 'var(--success-green)'}">${change >= 0 ? '+' : ''}${change.toFixed(1)} kg</span>
                    <span class="rw-label">変化量</span>
                </div>
                <div class="report-weight-item">
                    <span class="rw-value">${periodRecords.length}</span>
                    <span class="rw-label">記録回数</span>
                </div>
            </div>
        </div>
    `;
}

function renderAverageScoreReport(stats) {
    const scored = stats.dayScores.filter(d => d.mealCount > 0);
    if (scored.length === 0) return '<div class="report-section"><div class="report-score-big"><span class="score-num">--</span><div class="score-label">平均栄養スコア</div></div></div>';

    const avg = Math.round(scored.reduce((s, d) => s + d.score, 0) / scored.length);
    const color = avg >= 70 ? 'var(--accent-green)' : avg >= 40 ? 'var(--accent-pink)' : 'var(--sumi-500)';

    return `
        <div class="report-section">
            <div class="report-score-big">
                <span class="score-num" style="color:${color}">${avg}</span>
                <div class="score-label">平均栄養スコア（${scored.length}日間）</div>
            </div>
        </div>
    `;
}

function renderReportComment(stats, days) {
    const scored = stats.dayScores.filter(d => d.mealCount > 0);
    if (scored.length === 0) {
        const periodLabel = days <= 7 ? 'この1週間' : 'この1ヶ月';
        return `<div class="report-comment">${periodLabel}はまだ食事記録がありません。記録を続けてアドバイスを受けましょう。</div>`;
    }

    const avg = Math.round(scored.reduce((s, d) => s + d.score, 0) / scored.length);
    const periodLabel = days <= 7 ? 'この1週間' : 'この1ヶ月';

    // 不足栄養素を特定
    const nutrientKeys = ['iron', 'folate', 'calcium', 'protein'];
    const lowNutrients = [];
    nutrientKeys.forEach(key => {
        const rec = NUTRIENT_RECOMMENDATIONS[key];
        if (!rec) return;
        let totalAmt = 0, dataCnt = 0;
        scored.forEach(d => {
            if (d.totals && d.totals[key] !== undefined) {
                totalAmt += d.totals[key];
                dataCnt++;
            }
        });
        if (dataCnt > 0 && (totalAmt / dataCnt) < rec.recommended * 0.7) {
            lowNutrients.push(rec.label);
        }
    });

    let comment = '';
    if (avg >= 70) {
        comment = `${periodLabel}の栄養バランスは良好です。この調子で続けましょう！`;
    } else if (avg >= 40) {
        comment = `${periodLabel}の栄養スコアはまずまずです。`;
    } else {
        comment = `${periodLabel}は栄養が偏り気味です。バランスを意識してみましょう。`;
    }

    if (lowNutrients.length > 0) {
        comment += `特に${lowNutrients.join('・')}が不足傾向です。意識して摂取しましょう。`;
    }

    const recordRate = Math.round(scored.length / days * 100);
    if (recordRate < 50) {
        comment += `記録率は${recordRate}%です。毎日の記録が正確な分析につながります。`;
    }

    return `<div class="report-comment">${comment}</div>`;
}

function renderStreakReport() {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = getTodayString();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const meals = allRecords[dateStr]?.meals || [];
        if (meals.length > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    // 記録率（過去30日）
    let recorded = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (allRecords[ds]?.meals?.length > 0) recorded++;
    }
    const rate = Math.round((recorded / 30) * 100);

    return `
        <div class="report-section">
            <h4>記録継続</h4>
            <div class="report-streak-info">
                <div class="streak-num">${streak}日</div>
                <div>連続記録中</div>
                <div style="margin-top:8px;font-size:0.82rem;color:var(--light-text)">過去30日の記録率: ${rate}%（${recorded}/30日）</div>
            </div>
        </div>
    `;
}
