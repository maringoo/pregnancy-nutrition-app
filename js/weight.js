/**
 * 体重管理モジュール
 * 体重記録のCRUD操作とChart.jsによるグラフ描画
 */

let weightChart = null;
let currentChartPeriod = 'all';
let editingWeightId = null; // 編集中の体重記録ID

// ===== 体重記録の初期化 =====
function initWeightModule() {
    // 測定日のデフォルトを今日に設定
    const dateInput = document.getElementById('weightDate');
    if (dateInput) {
        dateInput.value = getTodayString();
    }

    // フォーム送信
    const weightForm = document.getElementById('weightForm');
    if (weightForm) {
        weightForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (editingWeightId) {
                saveWeightEdit();
            } else {
                addWeightRecord();
            }
        });
    }

    // 編集キャンセルボタン
    const cancelBtn = document.getElementById('cancelWeightEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelWeightEdit);
    }

    // 期間切替タブ
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const period = e.target.dataset.period;
            currentChartPeriod = period === 'all' ? 'all' : parseInt(period);
            renderWeightChart();
        });
    });

    // 表示を更新
    displayWeightRecords();
    renderWeightChart();
}

// ===== 体重記録を追加 =====
function addWeightRecord() {
    const dateInput = document.getElementById('weightDate');
    const valueInput = document.getElementById('weightValue');
    const memoInput = document.getElementById('weightMemo');
    const errorEl = document.getElementById('weightFormError');

    // エラークリア
    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const date = dateInput.value;
    const weight = parseFloat(valueInput.value);
    const memo = memoInput.value.trim();

    // バリデーション
    if (!date) {
        errorEl.textContent = '測定日を入力してください';
        errorEl.classList.remove('hidden');
        return;
    }

    if (isNaN(weight) || weight < 40 || weight > 200) {
        errorEl.textContent = '体重は40〜200kgの範囲で入力してください';
        errorEl.classList.remove('hidden');
        return;
    }

    // 小数第1位に丸める
    const roundedWeight = Math.round(weight * 10) / 10;

    const record = {
        id: generateUUID(),
        date: date,
        weight: roundedWeight,
        memo: memo
    };

    // localStorage に保存
    const records = getWeightRecords();
    records.push(record);
    records.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem('weightRecords', JSON.stringify(records));

    // フォームリセット
    valueInput.value = '';
    memoInput.value = '';
    dateInput.value = getTodayString();

    // 表示更新
    displayWeightRecords();
    renderWeightChart();
}

// ===== 体重記録を取得 =====
function getWeightRecords() {
    return JSON.parse(localStorage.getItem('weightRecords') || '[]');
}

// ===== 体重記録を削除 =====
function deleteWeightRecord(id) {
    if (!confirm('この体重記録を削除しますか？')) return;

    let records = getWeightRecords();
    records = records.filter(r => r.id !== id);
    localStorage.setItem('weightRecords', JSON.stringify(records));

    // 編集中の記録が削除された場合はキャンセル
    if (editingWeightId === id) {
        cancelWeightEdit();
    }

    displayWeightRecords();
    renderWeightChart();
}

// ===== 体重記録の編集を開始 =====
function startWeightEdit(id) {
    const records = getWeightRecords();
    const record = records.find(r => r.id === id);
    if (!record) return;

    editingWeightId = id;

    // フォームに値をセット
    document.getElementById('weightDate').value = record.date;
    document.getElementById('weightValue').value = record.weight;
    document.getElementById('weightMemo').value = record.memo || '';

    // ボタン表示を切り替え
    document.getElementById('weightSubmitBtn').textContent = '更新する';
    document.getElementById('cancelWeightEditBtn').classList.remove('hidden');
    document.getElementById('weightFormTitle').textContent = '体重を編集';

    // フォームまでスクロール
    document.getElementById('weightForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== 体重記録の編集を保存 =====
function saveWeightEdit() {
    const dateInput = document.getElementById('weightDate');
    const valueInput = document.getElementById('weightValue');
    const memoInput = document.getElementById('weightMemo');
    const errorEl = document.getElementById('weightFormError');

    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const date = dateInput.value;
    const weight = parseFloat(valueInput.value);
    const memo = memoInput.value.trim();

    if (!date) {
        errorEl.textContent = '測定日を入力してください';
        errorEl.classList.remove('hidden');
        return;
    }

    if (isNaN(weight) || weight < 40 || weight > 200) {
        errorEl.textContent = '体重は40〜200kgの範囲で入力してください';
        errorEl.classList.remove('hidden');
        return;
    }

    const roundedWeight = Math.round(weight * 10) / 10;

    let records = getWeightRecords();
    const index = records.findIndex(r => r.id === editingWeightId);
    if (index === -1) {
        cancelWeightEdit();
        return;
    }

    records[index].date = date;
    records[index].weight = roundedWeight;
    records[index].memo = memo;

    records.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem('weightRecords', JSON.stringify(records));

    // 編集モードを解除
    cancelWeightEdit();

    displayWeightRecords();
    renderWeightChart();
}

// ===== 体重記録の編集をキャンセル =====
function cancelWeightEdit() {
    editingWeightId = null;

    // フォームリセット
    document.getElementById('weightValue').value = '';
    document.getElementById('weightMemo').value = '';
    document.getElementById('weightDate').value = getTodayString();

    // ボタン表示を戻す
    document.getElementById('weightSubmitBtn').textContent = '体重を記録';
    document.getElementById('cancelWeightEditBtn').classList.add('hidden');
    document.getElementById('weightFormTitle').textContent = '体重を記録';
}

// ===== 体重記録一覧を表示 =====
function displayWeightRecords() {
    const records = getWeightRecords();
    const container = document.getElementById('weightRecordsList');
    const emptyMsg = document.getElementById('emptyWeightMessage');

    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = '';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    // 日付降順で表示
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    // 日付昇順（前回比計算用）
    const sortedByDate = [...records].sort((a, b) => a.date.localeCompare(b.date));

    // ユーザープロフィールから妊娠開始日を取得
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

    container.innerHTML = sorted.map((record) => {
        // 前回比を計算
        const dateIndex = sortedByDate.findIndex(r => r.id === record.id);
        let changeHtml = '';
        if (dateIndex > 0) {
            const prev = sortedByDate[dateIndex - 1];
            const diff = record.weight - prev.weight;
            const sign = diff > 0 ? '+' : '';
            const cls = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'zero';
            changeHtml = `<span class="weight-record-change ${cls}">${sign}${diff.toFixed(1)}kg</span>`;
        }

        // 妊娠週数を計算
        let weekHtml = '';
        if (profile.pregnancyStartDate) {
            const week = getPregnancyWeek(profile.pregnancyStartDate, new Date(record.date));
            if (week !== null) {
                weekHtml = `<span class="weight-record-week">妊娠${week}週</span>`;
            }
        }

        const memoHtml = record.memo ? `<div class="weight-record-memo">${escapeHtml(record.memo)}</div>` : '';

        const isEditing = editingWeightId === record.id;
        const editingClass = isEditing ? ' weight-record-editing' : '';

        return `
            <div class="weight-record-item${editingClass}">
                <div class="weight-record-info">
                    <div class="weight-record-date">${formatDateJP(record.date)} ${weekHtml}</div>
                    <div>
                        <span class="weight-record-value">${record.weight.toFixed(1)} kg</span>
                        ${changeHtml}
                    </div>
                    ${memoHtml}
                </div>
                <div class="weight-record-actions">
                    <button class="btn btn-small btn-edit" onclick="startWeightEdit('${record.id}')">編集</button>
                    <button class="btn btn-small btn-delete" onclick="deleteWeightRecord('${record.id}')">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== 日付を日本語フォーマットに変換 =====
function formatDateJP(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===== HTMLエスケープ =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== BMI区分から推奨増加量を取得 =====
function getRecommendedGainRange(bmi) {
    if (bmi < 18.5) return { min: 9, max: 12, label: 'やせ型' };
    if (bmi < 25.0) return { min: 7, max: 12, label: '標準' };
    return { min: 5, max: 5, label: '肥満' };
}

// ===== 日付範囲の各日摂取カロリーを集計 =====
function getDailyCalories(startDate, endDate) {
    const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
    const result = {};

    // startDate〜endDateの範囲で各日のカロリーを集計
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayRecords = allRecords[dateStr];
        if (dayRecords && dayRecords.meals && dayRecords.meals.length > 0) {
            let totalCal = 0;
            dayRecords.meals.forEach(meal => {
                if (meal.nutrients && meal.nutrients.calories) {
                    totalCal += meal.nutrients.calories;
                }
            });
            result[dateStr] = Math.round(totalCal);
        }
        current.setDate(current.getDate() + 1);
    }

    return result;
}

// ===== 妊娠期間の週数ポイントを生成 =====
function generatePregnancyTimeline(pregnancyStartDate) {
    const start = new Date(pregnancyStartDate);
    const points = [];

    // 0週から40週まで、2週刻み
    for (let week = 0; week <= 40; week += 2) {
        const date = new Date(start);
        date.setDate(date.getDate() + week * 7);
        points.push({
            week: week,
            date: date.toISOString().split('T')[0]
        });
    }

    return points;
}

// ===== 体重グラフを描画 =====
function renderWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;

    const records = getWeightRecords();
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const notice = document.getElementById('weightChartNotice');
    const hasProfile = profile.pregnancyStartDate && profile.prePregnancyWeight && profile.height;

    // プロフィール未設定の通知
    if (notice) {
        notice.classList.toggle('hidden', !!hasProfile);
    }

    // 既存のチャートを破棄
    if (weightChart) {
        weightChart.destroy();
        weightChart = null;
    }

    // プロフィールなし & データなし → 描画しない
    if (!hasProfile && records.length === 0) return;

    // === X軸のタイムラインを構築 ===
    // プロフィールがある場合は妊娠0週〜40週をベースにする
    let timelinePoints = [];
    let labels = [];

    if (hasProfile) {
        // 妊娠期間のタイムラインを生成
        const pregnancyTimeline = generatePregnancyTimeline(profile.pregnancyStartDate);

        // 期間フィルタの適用
        let filteredTimeline = pregnancyTimeline;
        if (currentChartPeriod !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - currentChartPeriod);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            filteredTimeline = pregnancyTimeline.filter(p => p.date >= cutoffStr);
        }

        timelinePoints = filteredTimeline;
        labels = filteredTimeline.map(p => {
            const d = new Date(p.date);
            return `${p.week}w (${d.getMonth()+1}/${d.getDate()})`;
        });
    } else {
        // プロフィールなし → 体重データの日付をそのまま使用
        let filteredRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
        if (currentChartPeriod !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - currentChartPeriod);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            filteredRecords = filteredRecords.filter(r => r.date >= cutoffStr);
        }
        if (filteredRecords.length === 0) return;

        timelinePoints = filteredRecords.map(r => ({ date: r.date, week: null }));
        labels = filteredRecords.map(r => formatDateJP(r.date));
    }

    if (timelinePoints.length === 0) return;

    // === データセット構築 ===
    const datasets = [];

    // 1) 推奨基準線（プロフィール設定済みの場合、データ有無に関わらず表示）
    if (hasProfile) {
        const heightM = profile.height / 100;
        const bmi = profile.prePregnancyWeight / (heightM * heightM);
        const range = getRecommendedGainRange(bmi);
        const baseWeight = profile.prePregnancyWeight;

        // 推奨上限線
        const upperLine = timelinePoints.map(p => {
            const week = p.week !== null ? p.week : getPregnancyWeek(profile.pregnancyStartDate, new Date(p.date));
            if (week === null || week === 0) return baseWeight;
            return Math.round((baseWeight + (range.max * week / 40)) * 10) / 10;
        });

        // 推奨下限線
        const lowerLine = timelinePoints.map(p => {
            const week = p.week !== null ? p.week : getPregnancyWeek(profile.pregnancyStartDate, new Date(p.date));
            if (week === null || week === 0) return baseWeight;
            return Math.round((baseWeight + (range.min * week / 40)) * 10) / 10;
        });

        // 推奨範囲を塗りつぶしで表示
        datasets.push({
            label: `推奨上限 (+${range.max}kg)`,
            data: upperLine,
            borderColor: 'rgba(165, 214, 167, 0.8)',
            backgroundColor: 'rgba(165, 214, 167, 0.15)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
        });

        datasets.push({
            label: `推奨下限 (+${range.min}kg)`,
            data: lowerLine,
            borderColor: 'rgba(165, 214, 167, 0.8)',
            backgroundColor: 'rgba(165, 214, 167, 0.15)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: '-1', // 上限線との間を塗りつぶし
            yAxisID: 'y'
        });

        // 妊娠前体重の基準線
        datasets.push({
            label: '妊娠前体重',
            data: timelinePoints.map(() => baseWeight),
            borderColor: 'rgba(176, 190, 197, 0.5)',
            borderWidth: 1,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
        });
    }

    // 2) 実測体重（データがある場合）
    if (records.length > 0) {
        const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

        // 各タイムラインポイントに最も近い体重データをマッピング
        const weightData = timelinePoints.map(p => {
            // その日付と一致する体重記録を探す
            const exactMatch = sortedRecords.find(r => r.date === p.date);
            if (exactMatch) return exactMatch.weight;

            // プロフィールありの場合：タイムラインポイントの日付に最も近い記録を探す
            // ただし、7日以内の記録のみマッチ
            if (hasProfile) {
                const pDate = new Date(p.date);
                let closest = null;
                let closestDiff = Infinity;
                sortedRecords.forEach(r => {
                    const rDate = new Date(r.date);
                    const diff = Math.abs(pDate - rDate);
                    if (diff < closestDiff && diff <= 7 * 24 * 60 * 60 * 1000) {
                        closestDiff = diff;
                        closest = r;
                    }
                });
                return closest ? closest.weight : null;
            }

            return null;
        });

        datasets.push({
            label: '体重 (kg)',
            data: weightData,
            borderColor: '#FFB6C1',
            backgroundColor: 'rgba(255, 182, 193, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#FFB6C1',
            pointRadius: 4,
            tension: 0.3,
            fill: false,
            spanGaps: true,
            yAxisID: 'y'
        });
    }

    // 3) 日別摂取カロリー
    const firstDate = timelinePoints[0].date;
    const lastDate = timelinePoints[timelinePoints.length - 1].date;
    const dailyCalories = getDailyCalories(firstDate, lastDate);

    const hasCalorieData = Object.keys(dailyCalories).length > 0;

    if (hasCalorieData) {
        const calorieData = timelinePoints.map(p => {
            // タイムラインの日付 ±3日以内のカロリーデータを探す
            if (dailyCalories[p.date]) return dailyCalories[p.date];

            if (hasProfile) {
                const pDate = new Date(p.date);
                let closest = null;
                let closestDiff = Infinity;
                Object.keys(dailyCalories).forEach(dateStr => {
                    const diff = Math.abs(pDate - new Date(dateStr));
                    if (diff < closestDiff && diff <= 3 * 24 * 60 * 60 * 1000) {
                        closestDiff = diff;
                        closest = dailyCalories[dateStr];
                    }
                });
                return closest;
            }
            return null;
        });

        datasets.push({
            label: '摂取カロリー (kcal)',
            data: calorieData,
            borderColor: 'rgba(255, 183, 77, 0.8)',
            backgroundColor: 'rgba(255, 183, 77, 0.1)',
            borderWidth: 1.5,
            pointBackgroundColor: 'rgba(255, 183, 77, 0.8)',
            pointRadius: 3,
            tension: 0.3,
            fill: false,
            spanGaps: true,
            yAxisID: 'y1'
        });
    }

    // === チャート描画 ===
    const ctx = canvas.getContext('2d');

    const scales = {
        x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
        },
        y: {
            position: 'left',
            title: {
                display: true,
                text: '体重 (kg)',
                font: { size: 11 }
            },
            ticks: {
                font: { size: 11 },
                callback: function(value) {
                    return value.toFixed(1);
                }
            }
        }
    };

    if (hasCalorieData) {
        scales.y1 = {
            position: 'right',
            title: {
                display: true,
                text: 'kcal',
                font: { size: 11 }
            },
            ticks: {
                font: { size: 11 },
                callback: function(value) {
                    return value.toFixed(0);
                }
            },
            grid: { drawOnChartArea: false }
        };
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 11 },
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.yAxisID === 'y1') {
                                return context.parsed.y !== null
                                    ? `${context.dataset.label}: ${context.parsed.y.toFixed(0)} kcal`
                                    : '';
                            }
                            return context.parsed.y !== null
                                ? `${context.dataset.label}: ${context.parsed.y.toFixed(1)} kg`
                                : '';
                        }
                    }
                }
            },
            scales: scales
        }
    });
}