// ============================================================
// リマインダー機能
// ============================================================

// ===== デフォルト設定 =====
const DEFAULT_REMINDER_SETTINGS = {
    enabled: true,
    meal: {
        enabled: true,
        breakfast: { enabled: true, time: '09:00' },
        lunch: { enabled: true, time: '12:00' },
        dinner: { enabled: true, time: '19:00' }
    },
    weight: { enabled: true },
    water: { enabled: true, intervalHours: 2 }
};

// ===== データ層 =====

function getReminderSettings() {
    const stored = localStorage.getItem('reminderSettings');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(DEFAULT_REMINDER_SETTINGS));
}

function saveReminderSettings(settings) {
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
}

function getDismissedReminders() {
    const stored = localStorage.getItem('reminderDismissed');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    return {};
}

function dismissReminder(id) {
    const dismissed = getDismissedReminders();
    const today = getTodayString();
    if (!dismissed[today]) dismissed[today] = {};
    dismissed[today][id] = true;
    localStorage.setItem('reminderDismissed', JSON.stringify(dismissed));
}

function cleanOldDismissals() {
    const dismissed = getDismissedReminders();
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 2);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let changed = false;
    Object.keys(dismissed).forEach(dateKey => {
        if (dateKey < cutoffStr) {
            delete dismissed[dateKey];
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem('reminderDismissed', JSON.stringify(dismissed));
    }
}

function getTodayWaterCount() {
    const today = getTodayString();
    const data = JSON.parse(localStorage.getItem('waterRecords') || '{}');
    return data[today] || 0;
}

// ===== チェックロジック =====

function checkReminders() {
    const settings = getReminderSettings();
    if (!settings.enabled) return [];

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = currentHour * 60 + now.getMinutes();
    const today = getTodayString();
    const dismissed = getDismissedReminders()[today] || {};
    const reminders = [];

    // 食事チェック
    if (settings.meal && settings.meal.enabled) {
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' };

        const allRecords = JSON.parse(localStorage.getItem('mealRecords') || '{}');
        const todayMeals = allRecords[today]?.meals || [];
        const recordedTypes = new Set(todayMeals.map(m => m.mealType));

        mealTypes.forEach(type => {
            const mealSetting = settings.meal[type];
            if (!mealSetting || !mealSetting.enabled) return;

            const id = 'meal_' + type;
            if (dismissed[id]) return;
            if (recordedTypes.has(type)) return;

            const [h, m] = mealSetting.time.split(':').map(Number);
            const settingMinutes = h * 60 + m;
            if (currentMinutes >= settingMinutes) {
                reminders.push({
                    id: id,
                    icon: '🍽️',
                    message: `${mealLabels[type]}がまだ記録されていません`
                });
            }
        });
    }

    // 体重チェック
    if (settings.weight && settings.weight.enabled) {
        if (!dismissed['weight']) {
            const records = JSON.parse(localStorage.getItem('weightRecords') || '[]');
            const hasTodayWeight = records.some(r => r.date === today);
            if (!hasTodayWeight) {
                reminders.push({
                    id: 'weight',
                    icon: '⚖️',
                    message: '今日の体重がまだ記録されていません'
                });
            }
        }
    }

    // 水分チェック
    if (settings.water && settings.water.enabled) {
        const interval = settings.water.intervalHours || 2;
        const slotId = Math.floor(currentHour / interval);
        const waterId = 'water_' + slotId;

        if (!dismissed[waterId]) {
            const count = getTodayWaterCount();
            if (count < 8) {
                reminders.push({
                    id: waterId,
                    icon: '💧',
                    message: `水分補給をしましょう（現在 ${count}/8 杯）`
                });
            }
        }
    }

    return reminders;
}

// ===== バナーUI =====

function checkAndRenderReminders() {
    const reminders = checkReminders();
    renderReminderBanner(reminders);
}

function renderReminderBanner(reminders) {
    // 既存バナーを削除
    const existing = document.querySelector('.reminder-banner');
    if (existing) existing.remove();

    if (!reminders || reminders.length === 0) return;

    const main = document.querySelector('.main-container');
    if (!main) return;

    const banner = document.createElement('div');
    banner.className = 'reminder-banner';

    const header = document.createElement('div');
    header.className = 'reminder-banner-header';
    header.innerHTML = `
        <span class="reminder-banner-title">📋 リマインダー</span>
        <button type="button" class="reminder-dismiss-all">すべて閉じる</button>
    `;
    banner.appendChild(header);

    const list = document.createElement('div');
    list.className = 'reminder-list';

    reminders.forEach(r => {
        const item = document.createElement('div');
        item.className = 'reminder-item';
        item.dataset.id = r.id;
        item.innerHTML = `
            <span class="reminder-icon">${r.icon}</span>
            <span class="reminder-message">${r.message}</span>
            <button type="button" class="reminder-dismiss" aria-label="閉じる">&times;</button>
        `;
        list.appendChild(item);
    });

    banner.appendChild(list);

    // <main> の先頭子要素として挿入
    main.insertBefore(banner, main.firstChild);

    // イベントリスナー
    banner.querySelector('.reminder-dismiss-all').addEventListener('click', () => {
        dismissAllReminders(reminders);
    });

    banner.querySelectorAll('.reminder-dismiss').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.reminder-item');
            dismissSingleReminder(item.dataset.id, item);
        });
    });
}

function dismissSingleReminder(id, itemEl) {
    dismissReminder(id);
    if (itemEl) {
        itemEl.classList.add('reminder-item-dismissing');
        setTimeout(() => {
            itemEl.remove();
            // バナー内にアイテムがなくなったらバナーごと削除
            const list = document.querySelector('.reminder-list');
            if (list && list.children.length === 0) {
                const banner = document.querySelector('.reminder-banner');
                if (banner) banner.remove();
            }
        }, 200);
    }
}

function dismissAllReminders(reminders) {
    reminders.forEach(r => dismissReminder(r.id));
    const banner = document.querySelector('.reminder-banner');
    if (banner) {
        banner.classList.add('reminder-banner-dismissing');
        setTimeout(() => banner.remove(), 200);
    }
}

// ===== 設定UI =====

function initReminderSettings() {
    const settings = getReminderSettings();

    // マスタートグル
    const masterToggle = document.getElementById('reminderMasterToggle');
    const detailSection = document.getElementById('reminderDetailSettings');
    if (!masterToggle || !detailSection) return;

    masterToggle.checked = settings.enabled;
    detailSection.classList.toggle('hidden', !settings.enabled);

    masterToggle.addEventListener('change', () => {
        settings.enabled = masterToggle.checked;
        detailSection.classList.toggle('hidden', !masterToggle.checked);
        onReminderSettingChange(settings);
    });

    // 食事トグル・時刻
    ['breakfast', 'lunch', 'dinner'].forEach(type => {
        const toggle = document.getElementById('reminder_meal_' + type);
        const timeInput = document.getElementById('reminder_time_' + type);
        if (toggle) {
            toggle.checked = settings.meal[type].enabled;
            toggle.addEventListener('change', () => {
                settings.meal[type].enabled = toggle.checked;
                onReminderSettingChange(settings);
            });
        }
        if (timeInput) {
            timeInput.value = settings.meal[type].time;
            timeInput.addEventListener('change', () => {
                settings.meal[type].time = timeInput.value;
                onReminderSettingChange(settings);
            });
        }
    });

    // 体重トグル
    const weightToggle = document.getElementById('reminder_weight');
    if (weightToggle) {
        weightToggle.checked = settings.weight.enabled;
        weightToggle.addEventListener('change', () => {
            settings.weight.enabled = weightToggle.checked;
            onReminderSettingChange(settings);
        });
    }

    // 水分トグル・間隔
    const waterToggle = document.getElementById('reminder_water');
    const waterInterval = document.getElementById('reminder_water_interval');
    if (waterToggle) {
        waterToggle.checked = settings.water.enabled;
        waterToggle.addEventListener('change', () => {
            settings.water.enabled = waterToggle.checked;
            onReminderSettingChange(settings);
        });
    }
    if (waterInterval) {
        waterInterval.value = String(settings.water.intervalHours);
        waterInterval.addEventListener('change', () => {
            settings.water.intervalHours = parseInt(waterInterval.value, 10);
            onReminderSettingChange(settings);
        });
    }
}

function onReminderSettingChange(settings) {
    saveReminderSettings(settings);
    checkAndRenderReminders();
}

// ===== 初期化 =====

function initReminders() {
    cleanOldDismissals();
    initReminderSettings();
    checkAndRenderReminders();

    // タブ復帰時に再チェック
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkAndRenderReminders();
        }
    });

    // 5分ごと定期チェック
    setInterval(checkAndRenderReminders, 5 * 60 * 1000);
}
