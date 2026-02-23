/**
 * オンボーディングウィザード
 * 初回起動時にフルスクリーン7ステップウィザードを表示
 */

function checkOnboarding() {
    if (!localStorage.getItem('onboardingCompleted')) {
        showOnboardingWizard();
    }

    // URL共有チェック（sharing.jsから）
    if (typeof checkShareURL === 'function') {
        checkShareURL();
    }
}

function showOnboardingWizard() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    showOnboardingStep(1);

    // オンボーディング内のステップ遷移ボタン（data-step属性）にイベント登録
    overlay.querySelectorAll('[data-step]').forEach(btn => {
        if (btn.tagName === 'BUTTON') {
            btn.addEventListener('click', () => {
                showOnboardingStep(parseInt(btn.dataset.step));
            });
        }
    });

    // 設定完了ボタン
    const completeBtn = document.getElementById('completeOnboardingBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', completeOnboarding);
    }
}

function hideOnboardingWizard() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function showOnboardingStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(el => {
        el.classList.toggle('hidden', parseInt(el.dataset.step) !== step);
    });

    // プログレスバーを更新
    const dots = document.querySelectorAll('.onboarding-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i < step);
    });

    // ステップ2: 日付の相互計算を初期化
    if (step === 2) {
        initOnboardingPregnancyFields();
    }
    // ステップ3: BMI自動計算を初期化
    if (step === 3) {
        initOnboardingBodyFields();
    }
    // ステップ4: 活動レベル選択を初期化
    if (step === 4) {
        initOnboardingActivity();
    }
    // ステップ7: テーマ選択を初期化
    if (step === 7) {
        initOnboardingTheme();
    }
}

function initOnboardingPregnancyFields() {
    const startInput = document.getElementById('obPregnancyStart');
    const dueInput = document.getElementById('obDueDate');
    if (!startInput || !dueInput) return;

    // 既存プロフィールがあれば反映
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (profile.pregnancyStartDate) startInput.value = profile.pregnancyStartDate;
    if (profile.dueDate) dueInput.value = profile.dueDate;

    startInput.addEventListener('change', () => {
        if (startInput.value) {
            const start = new Date(startInput.value);
            const due = new Date(start);
            due.setDate(due.getDate() + 280);
            dueInput.value = due.toISOString().split('T')[0];
        }
    });

    dueInput.addEventListener('change', () => {
        if (dueInput.value) {
            const due = new Date(dueInput.value);
            const start = new Date(due);
            start.setDate(start.getDate() - 280);
            startInput.value = start.toISOString().split('T')[0];
        }
    });
}

function initOnboardingBodyFields() {
    const heightInput = document.getElementById('obHeight');
    const weightInput = document.getElementById('obWeight');
    const bmiResult = document.getElementById('obBmiResult');
    if (!heightInput || !weightInput) return;

    // 既存プロフィールがあれば反映
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (profile.height) heightInput.value = profile.height;
    if (profile.prePregnancyWeight) weightInput.value = profile.prePregnancyWeight;

    function updateOBBmi() {
        const h = parseFloat(heightInput.value);
        const w = parseFloat(weightInput.value);
        if (!isNaN(h) && !isNaN(w) && h > 0 && w > 0) {
            const hm = h / 100;
            const bmi = w / (hm * hm);
            let cat = '';
            if (bmi < 18.5) cat = 'やせ型 — 推奨増加: +9〜12kg';
            else if (bmi < 25.0) cat = '標準 — 推奨増加: +7〜12kg';
            else cat = '肥満 — 推奨増加: 約+5kg';
            bmiResult.textContent = `BMI: ${bmi.toFixed(1)} （${cat}）`;
            bmiResult.classList.remove('hidden');
        } else {
            bmiResult.classList.add('hidden');
        }
    }

    heightInput.addEventListener('input', updateOBBmi);
    weightInput.addEventListener('input', updateOBBmi);
    updateOBBmi();
}

function initOnboardingActivity() {
    const picker = document.getElementById('obActivityPicker');
    if (!picker) return;

    // 既存プロフィールがあれば反映
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (profile.activityLevel) {
        picker.querySelectorAll('.ob-activity-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.activity === profile.activityLevel);
        });
    }

    const ALLOWED_LEVELS = ['low', 'moderate', 'high'];
    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.ob-activity-option');
        if (!btn) return;
        if (!ALLOWED_LEVELS.includes(btn.dataset.activity)) return;
        picker.querySelectorAll('.ob-activity-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
}

function initOnboardingTheme() {
    const picker = document.getElementById('obThemePicker');
    if (!picker) return;

    const saved = localStorage.getItem('appTheme') || 'default';
    picker.querySelectorAll('.ob-theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === saved);
    });

    const ALLOWED_THEMES = ['default', 'sage', 'terracotta'];
    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.ob-theme-option');
        if (!btn) return;
        const theme = btn.dataset.theme;
        if (!ALLOWED_THEMES.includes(theme)) return;

        picker.querySelectorAll('.ob-theme-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (theme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('appTheme', theme);
    });
}

function completeOnboarding() {
    // プロフィール情報を収集して保存
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

    const startDate = document.getElementById('obPregnancyStart')?.value;
    const dueDate = document.getElementById('obDueDate')?.value;
    const height = parseFloat(document.getElementById('obHeight')?.value);
    const weight = parseFloat(document.getElementById('obWeight')?.value);

    const activityBtn = document.querySelector('#obActivityPicker .ob-activity-option.active');
    const activityLevel = activityBtn ? activityBtn.dataset.activity : 'moderate';

    if (startDate) profile.pregnancyStartDate = startDate;
    if (dueDate) profile.dueDate = dueDate;
    if (!isNaN(height) && height > 0) profile.height = height;
    if (!isNaN(weight) && weight > 0) profile.prePregnancyWeight = weight;
    profile.activityLevel = activityLevel;

    localStorage.setItem('userProfile', JSON.stringify(profile));
    localStorage.setItem('onboardingCompleted', 'true');

    // リマインダー設定を保存
    const reminderEnabled = document.getElementById('obReminderToggle')?.checked ?? true;
    const reminderSettings = typeof getReminderSettings === 'function'
        ? getReminderSettings()
        : JSON.parse(localStorage.getItem('reminderSettings') || '{"enabled":true}');
    reminderSettings.enabled = reminderEnabled;
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
    const masterToggle = document.getElementById('reminderMasterToggle');
    if (masterToggle) masterToggle.checked = reminderEnabled;

    hideOnboardingWizard();

    // 設定画面のフォームにも反映
    if (profile.pregnancyStartDate) {
        const el = document.getElementById('pregnancyStartDate');
        if (el) el.value = profile.pregnancyStartDate;
    }
    if (profile.dueDate) {
        const el = document.getElementById('dueDate');
        if (el) el.value = profile.dueDate;
    }
    if (profile.height) {
        const el = document.getElementById('userHeight');
        if (el) el.value = profile.height;
    }
    if (profile.prePregnancyWeight) {
        const el = document.getElementById('prePregnancyWeight');
        if (el) el.value = profile.prePregnancyWeight;
    }
    if (profile.activityLevel) {
        const el = document.getElementById('activityLevel');
        if (el) el.value = profile.activityLevel;
    }

    // 推奨量の再計算とダッシュボード更新
    if (typeof updateRecommendationsForTrimester === 'function') {
        updateRecommendationsForTrimester();
    }
    if (typeof updateBMIDisplay === 'function') {
        updateBMIDisplay();
    }
    if (typeof updatePregnancyCalcDisplay === 'function') {
        updatePregnancyCalcDisplay();
    }
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }

    if (typeof showToast === 'function') {
        showToast('プロフィールを保存しました');
    }
}

function resetOnboarding() {
    localStorage.removeItem('onboardingCompleted');
    // チュートリアルチップもリセット
    ['meals', 'weight', 'dashboard', 'shopping'].forEach(tab => {
        localStorage.removeItem('tutorialTipSeen_' + tab);
    });
    showOnboardingWizard();
}

// リセットボタンのイベント登録
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetOnboardingBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetOnboarding);
});
