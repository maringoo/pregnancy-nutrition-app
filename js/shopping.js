// ===== 買い物モジュール (shopping.js) =====
// 献立予定・在庫管理・買い物リスト機能

let shoppingModuleInitialized = false;
let currentShoppingSubTab = 'meal-plan';

// ===== 単位ヘルパー =====
// 食品マスタからg以外の単位情報を取得（なければnull）
function getAltUnit(foodId) {
    if (!foodId) return null;
    const food = foodMasterData.find(f => f.foodId === foodId);
    if (!food || !food.units) return null;
    const alt = food.units.find(u => u.name !== 'g');
    return alt || null; // { name, label, gramsPerUnit }
}

// グラムを別単位に変換（小数第1位まで）
function gramsToAltUnit(grams, altUnit) {
    if (!altUnit || !altUnit.gramsPerUnit) return null;
    return Math.round(grams / altUnit.gramsPerUnit * 10) / 10;
}

// 別単位をグラムに変換
function altUnitToGrams(qty, altUnit) {
    if (!altUnit || !altUnit.gramsPerUnit) return 0;
    return Math.round(qty * altUnit.gramsPerUnit * 10) / 10;
}

// g表記 + 別単位併記のフォーマット（例: "300g（2個）"）
function formatQuantityWithUnit(grams, foodId) {
    const alt = getAltUnit(foodId);
    let text = `${Math.round(grams)}g`;
    if (alt) {
        const altQty = gramsToAltUnit(grams, alt);
        if (altQty > 0) {
            text += `（${altQty}${alt.label}）`;
        }
    }
    return text;
}

// ===== 初期化 =====
function initShoppingModule() {
    if (shoppingModuleInitialized) {
        // 再表示時は献立予定を更新
        if (currentShoppingSubTab === 'meal-plan') {
            renderWeeklyMealPlan();
        } else if (currentShoppingSubTab === 'pantry') {
            renderPantryList();
        } else if (currentShoppingSubTab === 'shopping-list') {
            renderShoppingList();
        }
        return;
    }
    shoppingModuleInitialized = true;

    setupShoppingSubTabs();
    renderWeeklyMealPlan();
}

// ===== サブタブ切り替え =====
function setupShoppingSubTabs() {
    document.querySelectorAll('.shopping-sub-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.target.dataset.subtab;
            currentShoppingSubTab = target;

            document.querySelectorAll('.shopping-sub-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            document.querySelectorAll('.shopping-sub-content').forEach(c => c.classList.remove('active'));
            const targetContent = document.getElementById(`subtab-${target}`);
            if (targetContent) targetContent.classList.add('active');

            // コンテンツを更新
            if (target === 'meal-plan') {
                renderWeeklyMealPlan();
            } else if (target === 'pantry') {
                renderPantryList();
            } else if (target === 'shopping-list') {
                renderShoppingList();
            }
        });
    });
}

// ========================================
//  献立予定（週間ビュー）
// ========================================

function renderWeeklyMealPlan() {
    const container = document.getElementById('weeklyMealPlanContainer');
    if (!container) return;

    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const today = new Date();
    const mealTypes = [
        { key: 'breakfast', label: '朝食' },
        { key: 'lunch', label: '昼食' },
        { key: 'dinner', label: '夕食' },
        { key: 'snack', label: '間食' }
    ];

    let html = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        const isToday = i === 0;
        const dayLabel = isToday ? '今日' : `${d.getMonth() + 1}/${d.getDate()}`;

        const dayMeals = allRecords[dateStr]?.meals || [];

        html += `<div class="weekly-day-card${isToday ? ' today' : ''}">`;
        html += `<div class="weekly-day-header">`;
        html += `<span class="weekly-day-date">${dayLabel}（${dayOfWeek}）</span>`;
        html += `</div>`;
        html += `<div class="weekly-day-meals">`;

        mealTypes.forEach(mt => {
            const meals = dayMeals.filter(m => m.mealType === mt.key);
            html += `<div class="weekly-meal-slot">`;
            html += `<span class="weekly-meal-label">${mt.label}</span>`;
            if (meals.length > 0) {
                meals.forEach(m => {
                    const badge = m.planned ? '<span class="chip-planned">予定</span>' : '';
                    html += `<span class="weekly-meal-chip">${m.foodName}${badge}</span>`;
                });
            } else {
                html += `<span class="weekly-meal-empty">未設定</span>`;
            }
            html += `</div>`;
        });

        html += `</div>`;
        html += `<button type="button" class="btn btn-small btn-outline weekly-add-btn" data-date="${dateStr}">+ 食事を追加</button>`;
        html += `</div>`;
    }

    container.innerHTML = html;

    // 「食事を追加」ボタンのイベント
    container.querySelectorAll('.weekly-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dateStr = e.target.dataset.date;
            navigateToMealEntry(dateStr);
        });
    });
}

// ========================================
//  在庫管理
// ========================================

function getPantryItems() {
    return JSON.parse(localStorage.getItem('pantryItems') || '[]');
}

function savePantryItems(items) {
    localStorage.setItem('pantryItems', JSON.stringify(items));
}

function renderPantryList() {
    const container = document.getElementById('pantryContainer');
    if (!container) return;

    const items = getPantryItems();

    // 検索フォーム + 一覧
    let html = `
        <div class="pantry-add-section">
            <h3>食品を追加</h3>
            <div class="form-group">
                <div class="search-container">
                    <input type="text" id="pantryFoodSearch" class="food-search-input" placeholder="食品名を検索..." autocomplete="off">
                    <div id="pantryFoodSuggestions" class="food-suggestions hidden"></div>
                </div>
            </div>
            <div id="pantryAddForm" class="pantry-add-form hidden">
                <p>選択: <strong id="pantrySelectedName"></strong>
                    <button type="button" id="pantryClearSelection" class="btn-small btn-clear">変更</button>
                </p>
                <div class="pantry-add-fields">
                    <div class="form-group">
                        <label>数量 (g) <span class="required-mark">*</span></label>
                        <input type="number" id="pantryQuantity" class="quantity-input" placeholder="例: 300" min="0" step="any">
                    </div>
                    <div class="form-group pantry-alt-unit-group hidden" id="pantryAltUnitGroup">
                        <label id="pantryAltUnitLabel">数量</label>
                        <input type="number" id="pantryAltQuantity" class="quantity-input" placeholder="例: 2" min="0" step="any">
                    </div>
                    <div class="form-group">
                        <label>消費期限</label>
                        <input type="date" id="pantryExpiry" class="quantity-input">
                    </div>
                </div>
                <button type="button" id="pantryAddBtn" class="btn btn-primary btn-small">在庫に追加</button>
            </div>
        </div>
    `;

    // カテゴリ別グルーピング
    const categories = ['protein', 'vegetable', 'grain', 'dairy', 'fruit', 'oil', 'other'];
    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    items.forEach(item => {
        const cat = item.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    const todayStr = getTodayString();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const twoDaysStr = twoDaysLater.toISOString().split('T')[0];

    let hasItems = false;
    html += `<div class="pantry-list-section">`;
    html += `<h3>在庫一覧</h3>`;

    categories.forEach(cat => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return;
        hasItems = true;

        html += `<div class="pantry-category-group">`;
        html += `<h4 class="pantry-category-header">${getCategoryLabel(cat)}</h4>`;

        catItems.forEach(item => {
            const isExpiringSoon = item.expiryDate && item.expiryDate <= twoDaysStr && item.expiryDate >= todayStr;
            const isExpired = item.expiryDate && item.expiryDate < todayStr;
            let expiryClass = '';
            let expiryBadgeClass = '';
            let expiryText = '期限未設定';
            if (isExpired) {
                expiryClass = ' pantry-expired';
                expiryBadgeClass = ' expired';
                expiryText = '期限切れ';
            } else if (isExpiringSoon) {
                expiryClass = ' pantry-expiring';
                expiryBadgeClass = ' expiring';
                expiryText = '期限間近';
            } else if (item.expiryDate) {
                expiryText = `〜${item.expiryDate.slice(5).replace('-', '/')}`;
            }
            const expiryLabel = `<button type="button" class="pantry-expiry-btn${expiryBadgeClass}" data-id="${item.id}" data-expiry="${item.expiryDate || ''}" title="賞味期限を編集"><svg class="pantry-expiry-svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> ${expiryText}</button>`;

            const alt = getAltUnit(item.foodId);
            let altHtml = '';
            if (alt) {
                const altQty = gramsToAltUnit(item.quantity, alt);
                altHtml = `
                    <input type="number" class="pantry-alt-input" value="${altQty}" min="0" step="any" data-id="${item.id}" data-grams-per-unit="${alt.gramsPerUnit}">
                    <span class="pantry-unit">${alt.label}</span>
                `;
            }

            html += `
                <div class="pantry-item${expiryClass}" data-id="${item.id}">
                    <div class="pantry-item-info">
                        <span class="pantry-item-name">${item.name}</span>
                        ${expiryLabel}
                    </div>
                    <div class="pantry-item-actions">
                        <input type="number" class="pantry-qty-input" value="${item.quantity}" min="0" step="any" data-id="${item.id}">
                        <span class="pantry-unit">g</span>
                        ${altHtml}
                        <button type="button" class="btn-delete-sm pantry-delete-btn" data-id="${item.id}">&times;</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    if (!hasItems) {
        html += `<div class="empty-message"><p>在庫がありません。食品を検索して追加してください。</p></div>`;
    }
    html += `</div>`;

    container.innerHTML = html;

    // イベント設定
    setupPantryEvents();
}

let pantrySelectedFood = null;

function setupPantryEvents() {
    const searchInput = document.getElementById('pantryFoodSearch');
    const suggestionsDiv = document.getElementById('pantryFoodSuggestions');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length >= 1) {
            showPantryFoodSuggestions(term);
        } else {
            suggestionsDiv.classList.add('hidden');
        }
    });

    // 選択解除
    const clearBtn = document.getElementById('pantryClearSelection');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            pantrySelectedFood = null;
            document.getElementById('pantryAddForm').classList.add('hidden');
            document.getElementById('pantryFoodSearch').value = '';
        });
    }

    // 追加フォームのg ↔ 別単位の双方向連動
    const pantryQtyInput = document.getElementById('pantryQuantity');
    const pantryAltInput = document.getElementById('pantryAltQuantity');
    if (pantryQtyInput) {
        pantryQtyInput.addEventListener('input', () => {
            if (!pantrySelectedFood) return;
            const alt = getAltUnit(pantrySelectedFood.foodId);
            if (alt && pantryAltInput) {
                const g = parseFloat(pantryQtyInput.value) || 0;
                pantryAltInput.value = g > 0 ? gramsToAltUnit(g, alt) : '';
            }
        });
    }
    if (pantryAltInput) {
        pantryAltInput.addEventListener('input', () => {
            if (!pantrySelectedFood) return;
            const alt = getAltUnit(pantrySelectedFood.foodId);
            if (alt && pantryQtyInput) {
                const qty = parseFloat(pantryAltInput.value) || 0;
                pantryQtyInput.value = qty > 0 ? altUnitToGrams(qty, alt) : '';
            }
        });
    }

    // 追加ボタン
    const addBtn = document.getElementById('pantryAddBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addPantryItem);
    }

    // 数量変更（g入力 → 別単位に反映）
    document.querySelectorAll('.pantry-qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const newQty = parseFloat(e.target.value);
            if (isNaN(newQty) || newQty < 0) return;
            const items = getPantryItems();
            const item = items.find(i => i.id === id);
            if (item) {
                item.quantity = newQty;
                savePantryItems(items);
                // 別単位フィールドを連動更新
                const altInput = document.querySelector(`.pantry-alt-input[data-id="${id}"]`);
                if (altInput) {
                    const gpu = parseFloat(altInput.dataset.gramsPerUnit) || 1;
                    altInput.value = Math.round(newQty / gpu * 10) / 10;
                }
                showToast('数量を更新しました');
            }
        });
    });

    // 別単位入力 → g に反映
    document.querySelectorAll('.pantry-alt-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const altQty = parseFloat(e.target.value);
            const gpu = parseFloat(e.target.dataset.gramsPerUnit) || 1;
            if (isNaN(altQty) || altQty < 0) return;
            const newGrams = Math.round(altQty * gpu * 10) / 10;
            const items = getPantryItems();
            const item = items.find(i => i.id === id);
            if (item) {
                item.quantity = newGrams;
                savePantryItems(items);
                // g フィールドを連動更新
                const gInput = document.querySelector(`.pantry-qty-input[data-id="${id}"]`);
                if (gInput) gInput.value = newGrams;
                showToast('数量を更新しました');
            }
        });
    });

    // 削除ボタン
    document.querySelectorAll('.pantry-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const items = getPantryItems().filter(i => i.id !== id);
            savePantryItems(items);
            showToast('削除しました');
            renderPantryList();
        });
    });

    // 賞味期限編集ボタン
    document.querySelectorAll('.pantry-expiry-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const currentExpiry = e.target.dataset.expiry || '';
            showExpiryEditPicker(id, currentExpiry, e.target);
        });
    });
}

function showPantryFoodSuggestions(searchTerm) {
    const container = document.getElementById('pantryFoodSuggestions');
    const matched = fuzzySearchFoods(searchTerm);

    if (matched.length === 0) {
        container.innerHTML = '<div class="food-suggestion-item"><p>該当する食品が見つかりません</p></div>';
        container.classList.remove('hidden');
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
            const food = foodMasterData.find(f => f.foodId === foodId);
            if (food) {
                pantrySelectedFood = food;
                document.getElementById('pantrySelectedName').textContent = food.name;
                document.getElementById('pantryAddForm').classList.remove('hidden');
                document.getElementById('pantryFoodSearch').value = '';
                container.classList.add('hidden');

                // 別単位フィールドの表示切り替え
                const alt = getAltUnit(food.foodId);
                const altGroup = document.getElementById('pantryAltUnitGroup');
                const altInput = document.getElementById('pantryAltQuantity');
                if (alt) {
                    document.getElementById('pantryAltUnitLabel').textContent = `数量（${alt.label}）`;
                    altGroup.classList.remove('hidden');
                    altInput.value = '';
                } else {
                    altGroup.classList.add('hidden');
                }
                document.getElementById('pantryQuantity').value = '';
                document.getElementById('pantryQuantity').focus();
            }
        });
    });

    container.classList.remove('hidden');
}

function addPantryItem() {
    if (!pantrySelectedFood) {
        showToast('食品を選択してください');
        return;
    }

    const quantity = parseFloat(document.getElementById('pantryQuantity').value);
    if (!quantity || quantity <= 0) {
        showToast('数量を入力してください');
        return;
    }

    const expiry = document.getElementById('pantryExpiry').value || null;

    const items = getPantryItems();
    items.push({
        id: 'pantry-' + generateUUID(),
        foodId: pantrySelectedFood.foodId,
        name: pantrySelectedFood.name,
        category: pantrySelectedFood.category,
        quantity: quantity,
        addedDate: getTodayString(),
        expiryDate: expiry,
        memo: ''
    });

    savePantryItems(items);
    pantrySelectedFood = null;

    showToast(`${items[items.length - 1].name} を追加しました`);
    renderPantryList();
}

// ========================================
//  食材抽出ロジック（コア機能）
// ========================================

function extractIngredientsFromPlannedMeals(fromDate, toDate) {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const ingredientMap = {}; // name -> { foodId, category, totalGrams }

    Object.keys(allRecords).forEach(dateStr => {
        if (dateStr < fromDate || dateStr > toDate) return;

        const meals = allRecords[dateStr]?.meals || [];
        meals.forEach(meal => {
            if (meal.ingredients && meal.ingredients.length > 0) {
                // 料理（ingredients[]あり）: 食材をスケーリングして抽出
                meal.ingredients.forEach(ing => {
                    const grams = parseFloat(ing.amount) || 0;
                    if (grams <= 0) return;

                    const name = ing.name;
                    if (!ingredientMap[name]) {
                        // 食品マスタから情報を取得
                        const masterFood = foodMasterData.find(f =>
                            f.name.includes(name) || name.includes(f.name)
                        );
                        ingredientMap[name] = {
                            foodId: masterFood ? masterFood.foodId : null,
                            category: masterFood ? masterFood.category : 'other',
                            totalGrams: 0
                        };
                    }
                    ingredientMap[name].totalGrams += grams;
                });
            } else {
                // 単品食品（ingredients[]なし）: 食品そのものを食材として扱う
                const name = meal.foodName;
                const grams = meal.quantity || 0;
                if (grams <= 0) return;

                if (!ingredientMap[name]) {
                    ingredientMap[name] = {
                        foodId: meal.foodId || null,
                        category: 'other',
                        totalGrams: 0
                    };
                    // カテゴリを食品マスタから取得
                    const masterFood = foodMasterData.find(f => f.foodId === meal.foodId);
                    if (masterFood) {
                        ingredientMap[name].category = masterFood.category;
                    }
                }
                ingredientMap[name].totalGrams += grams;
            }
        });
    });

    return ingredientMap;
}

// ========================================
//  買い物リスト
// ========================================

function renderShoppingList() {
    const container = document.getElementById('shoppingListContainer');
    if (!container) return;

    const savedList = JSON.parse(localStorage.getItem('shoppingList') || 'null');

    // 期間選択 + 生成ボタン
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 6);
    const todayStr = getTodayString();
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    let html = `
        <div class="shopping-generate-section">
            <h3>買い物リストを生成</h3>
            <div class="shopping-date-range">
                <div class="form-group">
                    <label>開始日 <span class="required-mark">*</span></label>
                    <input type="date" id="shoppingFromDate" class="quantity-input" value="${savedList?.dateRange?.from || todayStr}">
                </div>
                <div class="form-group">
                    <label>終了日 <span class="required-mark">*</span></label>
                    <input type="date" id="shoppingToDate" class="quantity-input" value="${savedList?.dateRange?.to || nextWeekStr}">
                </div>
            </div>
            <button type="button" id="generateShoppingBtn" class="btn btn-primary">リストを生成</button>
        </div>
    `;

    // 既存のリストがあれば表示
    if (savedList && savedList.items && savedList.items.length > 0) {
        html += renderShoppingItems(savedList);
    } else if (savedList && savedList.items && savedList.items.length === 0) {
        html += `<div class="empty-message"><p>すべての食材が在庫にあります。買い足す必要はありません！</p></div>`;
    }

    // 手動追加セクション
    html += `
        <div class="shopping-manual-add">
            <h3>手動で追加</h3>
            <div class="shopping-manual-row">
                <input type="text" id="shoppingManualName" class="food-search-input" placeholder="品名を入力...">
                <button type="button" id="shoppingManualAddBtn" class="btn btn-small btn-outline">追加</button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // イベント
    document.getElementById('generateShoppingBtn').addEventListener('click', () => {
        const from = document.getElementById('shoppingFromDate').value;
        const to = document.getElementById('shoppingToDate').value;
        if (!from || !to) {
            showToast('期間を指定してください');
            return;
        }
        generateShoppingList(from, to);
    });

    document.getElementById('shoppingManualAddBtn').addEventListener('click', addManualShoppingItem);

    // チェックボックスイベント
    setupShoppingCheckboxes();
}

function renderShoppingItems(list) {
    const categories = ['grain', 'protein', 'vegetable', 'fruit', 'dairy', 'oil', 'other'];
    const grouped = {};
    categories.forEach(c => grouped[c] = []);

    list.items.forEach(item => {
        const cat = item.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    let html = `<div class="shopping-list-section">`;
    html += `<h3>買い物リスト</h3>`;
    if (list.dateRange) {
        html += `<p class="shopping-period">${list.dateRange.from.slice(5).replace('-', '/')} 〜 ${list.dateRange.to.slice(5).replace('-', '/')}</p>`;
    }

    categories.forEach(cat => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return;

        html += `<div class="shopping-category-group">`;
        html += `<h4 class="shopping-category-header">${getCategoryLabel(cat)}</h4>`;

        catItems.forEach(item => {
            const checked = item.checked ? ' checked' : '';
            const strikeClass = item.checked ? ' shopping-item-checked' : '';
            const qtyInfo = item.manual ? '' : `<span class="shopping-qty">${formatQuantityWithUnit(item.toBuyGrams, item.foodId)}</span>`;
            const pantryInfo = (!item.manual && item.pantryGrams > 0)
                ? `<span class="shopping-pantry-note">（在庫 ${formatQuantityWithUnit(item.pantryGrams, item.foodId)}）</span>` : '';

            html += `
                <div class="shopping-item${strikeClass}" data-id="${item.id}">
                    <label class="shopping-checkbox-label">
                        <input type="checkbox" class="shopping-checkbox" data-id="${item.id}"${checked}>
                        <span class="shopping-item-name">${item.name}</span>
                    </label>
                    ${qtyInfo}
                    ${pantryInfo}
                    <button type="button" class="btn-delete-sm shopping-remove-btn" data-id="${item.id}">&times;</button>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += `</div>`;

    return html;
}

function setupShoppingCheckboxes() {
    document.querySelectorAll('.shopping-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const savedList = JSON.parse(localStorage.getItem('shoppingList') || 'null');
            if (!savedList) return;

            const item = savedList.items.find(i => i.id === id);
            if (!item) return;

            if (e.target.checked) {
                // チェックON → モーダル表示（確定はモーダル側で行う）
                e.target.checked = false; // いったん戻す
                showPurchaseModal(item, e.target);
            } else {
                // チェックOFF → 単純にchecked=falseに戻す（在庫は残る）
                item.checked = false;
                localStorage.setItem('shoppingList', JSON.stringify(savedList));
                const itemEl = e.target.closest('.shopping-item');
                if (itemEl) {
                    itemEl.classList.remove('shopping-item-checked');
                }
            }
        });
    });

    document.querySelectorAll('.shopping-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const savedList = JSON.parse(localStorage.getItem('shoppingList') || 'null');
            if (!savedList) return;
            savedList.items = savedList.items.filter(i => i.id !== id);
            localStorage.setItem('shoppingList', JSON.stringify(savedList));
            renderShoppingList();
            showToast('削除しました');
        });
    });
}

function generateShoppingList(fromDate, toDate) {
    // 食材を抽出
    const ingredientMap = extractIngredientsFromPlannedMeals(fromDate, toDate);
    const pantryItems = getPantryItems();

    const shopItems = [];

    Object.keys(ingredientMap).forEach(name => {
        const ing = ingredientMap[name];
        const requiredGrams = Math.round(ing.totalGrams * 10) / 10;

        // 在庫から同じ食品を探す（名前またはfoodIdで一致）
        let pantryGrams = 0;
        pantryItems.forEach(p => {
            if ((ing.foodId && p.foodId === ing.foodId) || p.name === name) {
                pantryGrams += p.quantity;
            }
        });

        const toBuyGrams = Math.max(0, requiredGrams - pantryGrams);

        if (toBuyGrams > 0) {
            shopItems.push({
                id: 'shop-' + generateUUID(),
                name: name,
                category: ing.category,
                foodId: ing.foodId,
                requiredGrams: requiredGrams,
                pantryGrams: pantryGrams,
                toBuyGrams: toBuyGrams,
                checked: false,
                manual: false
            });
        }
    });

    const shoppingList = {
        generatedAt: new Date().toISOString(),
        dateRange: { from: fromDate, to: toDate },
        items: shopItems
    };

    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));

    if (shopItems.length === 0 && Object.keys(ingredientMap).length === 0) {
        showToast('指定期間に献立予定がありません');
    } else if (shopItems.length === 0) {
        showToast('すべての食材が在庫にあります');
    } else {
        showToast(`${shopItems.length}品目の買い物リストを生成しました`);
    }

    renderShoppingList();
}

function addManualShoppingItem() {
    const nameInput = document.getElementById('shoppingManualName');
    const name = nameInput.value.trim();
    if (!name) {
        showToast('品名を入力してください');
        return;
    }

    let savedList = JSON.parse(localStorage.getItem('shoppingList') || 'null');
    if (!savedList) {
        savedList = {
            generatedAt: new Date().toISOString(),
            dateRange: null,
            items: []
        };
    }

    savedList.items.push({
        id: 'shop-' + generateUUID(),
        name: name,
        category: 'other',
        foodId: null,
        requiredGrams: 0,
        pantryGrams: 0,
        toBuyGrams: 0,
        checked: false,
        manual: true
    });

    localStorage.setItem('shoppingList', JSON.stringify(savedList));
    nameInput.value = '';
    showToast(`${name} を追加しました`);
    renderShoppingList();
}

// ========================================
//  賞味期限インライン編集
// ========================================

function showExpiryEditPicker(itemId, currentExpiry, btnElement) {
    // 既存のピッカーがあれば除去
    const existing = document.querySelector('.pantry-expiry-picker-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'pantry-expiry-picker-popup';
    popup.innerHTML = `
        <input type="date" class="pantry-expiry-date-input" value="${currentExpiry}">
        <div class="pantry-expiry-picker-actions">
            <button type="button" class="btn btn-primary btn-small pantry-expiry-save">保存</button>
            <button type="button" class="btn btn-outline btn-small pantry-expiry-clear">クリア</button>
        </div>
    `;

    // ボタンの直下に配置
    btnElement.style.position = 'relative';
    btnElement.parentNode.style.position = 'relative';
    btnElement.parentNode.appendChild(popup);

    const dateInput = popup.querySelector('.pantry-expiry-date-input');
    dateInput.focus();

    const save = (newValue) => {
        const items = getPantryItems();
        const item = items.find(i => i.id === itemId);
        if (item) {
            item.expiryDate = newValue || null;
            savePantryItems(items);
            showToast('賞味期限を更新しました');
        }
        popup.remove();
        renderPantryList();
    };

    popup.querySelector('.pantry-expiry-save').addEventListener('click', () => {
        save(dateInput.value);
    });

    popup.querySelector('.pantry-expiry-clear').addEventListener('click', () => {
        save(null);
    });

    // 外側クリックで閉じる
    const closeOnOutside = (e) => {
        if (!popup.contains(e.target) && e.target !== btnElement) {
            popup.remove();
            document.removeEventListener('click', closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
}

// ========================================
//  購入 → 在庫追加モーダル
// ========================================

function showPurchaseModal(item, checkboxElement) {
    const modal = document.getElementById('purchaseModal');
    const nameEl = document.getElementById('purchaseModalItemName');
    const qtyInput = document.getElementById('purchaseQuantity');
    const expiryInput = document.getElementById('purchaseExpiry');
    const confirmBtn = document.getElementById('purchaseModalConfirm');
    const cancelBtn = document.getElementById('purchaseModalCancel');

    // アイテム名と購入量をプリフィル
    nameEl.textContent = item.name;
    qtyInput.value = item.toBuyGrams > 0 ? item.toBuyGrams : '';
    expiryInput.value = '';

    modal.classList.remove('hidden');
    qtyInput.focus();

    // 既存リスナーを除去するためクローンで置換
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    // 確認ボタン
    newConfirm.addEventListener('click', () => {
        const quantity = parseFloat(qtyInput.value);
        if (!quantity || quantity <= 0) {
            showToast('購入量を入力してください');
            return;
        }
        const expiry = expiryInput.value || null;
        addPurchaseToPantry(item, quantity, expiry);
        // チェック済みにしてUI更新
        checkboxElement.checked = true;
        const itemEl = checkboxElement.closest('.shopping-item');
        if (itemEl) {
            itemEl.classList.add('shopping-item-checked');
        }
        modal.classList.add('hidden');
    });

    // キャンセルボタン
    newCancel.addEventListener('click', () => {
        // チェックを戻す（既にfalseのまま）
        modal.classList.add('hidden');
    });

    // オーバーレイクリックでキャンセル
    const overlayHandler = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.removeEventListener('click', overlayHandler);
        }
    };
    modal.addEventListener('click', overlayHandler);
}

function addPurchaseToPantry(shopItem, quantity, expiryDate) {
    // パントリーに追加
    const pantryItems = getPantryItems();
    pantryItems.push({
        id: 'pantry-' + generateUUID(),
        foodId: shopItem.foodId,
        name: shopItem.name,
        category: shopItem.category || 'other',
        quantity: quantity,
        addedDate: getTodayString(),
        expiryDate: expiryDate || null,
        memo: ''
    });
    savePantryItems(pantryItems);

    // 買い物リストのchecked=trueを保存
    const savedList = JSON.parse(localStorage.getItem('shoppingList') || 'null');
    if (savedList) {
        const item = savedList.items.find(i => i.id === shopItem.id);
        if (item) {
            item.checked = true;
        }
        localStorage.setItem('shoppingList', JSON.stringify(savedList));
    }

    showToast(`${shopItem.name} を在庫に追加しました`);
}
