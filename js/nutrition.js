/**
 * 栄養計算ロジックモジュール
 * 妊婦向け栄養管理アプリの核となる計算機能を提供
 */

/**
 * 妊娠開始日から現在の妊娠週数を計算する
 *
 * @param {string} pregnancyStartDate - 妊娠開始日（YYYY-MM-DD形式）
 * @param {Date} [referenceDate] - 基準日（省略時は今日）
 * @returns {number|null} 妊娠週数（0〜42）、無効な場合はnull
 */
function getPregnancyWeek(pregnancyStartDate, referenceDate) {
    if (!pregnancyStartDate) return null;

    const start = new Date(pregnancyStartDate);
    const now = referenceDate || new Date();

    if (isNaN(start.getTime())) return null;

    const diffMs = now.getTime() - start.getTime();
    if (diffMs < 0) return null;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);

    return Math.min(weeks, 42);
}

/**
 * 妊娠週数からtrimester（妊娠期）を判定する
 *
 * @param {number} week - 妊娠週数
 * @returns {string} "first" | "second" | "third"
 */
function getTrimester(week) {
    if (week === null || week === undefined || week < 0) return 'second'; // デフォルト中期
    if (week <= 15) return 'first';
    if (week <= 27) return 'second';
    return 'third';
}

/**
 * trimesterの日本語ラベルを取得する
 *
 * @param {string} trimester - "first" | "second" | "third"
 * @returns {string} 日本語ラベル
 */
function getTrimesterLabel(trimester) {
    const labels = {
        first: '初期',
        second: '中期',
        third: '後期'
    };
    return labels[trimester] || '中期';
}

/**
 * 食品の摂取量から栄養素を計算する
 *
 * @param {Object} food - 食品データ（100gあたりの値）
 * @param {number} quantity - 摂取量（グラム）
 * @returns {Object} 計算された栄養素 { calories, protein, fat, carbohydrate, iron, calcium, folate }
 *
 * 例）ごはん100gを食べた場合：
 * calculateNutrients(food, 100) → { calories: 168, protein: 2.5, ... }
 */
function calculateNutrients(food, quantity) {
  // 入力値の検証
  if (!food || typeof quantity !== 'number' || quantity < 0) {
    console.error('不正な入力です。食品データと0以上の数値を指定してください。');
    return null;
  }

  // 100gあたりの値から実際の摂取量に換算
  const ratio = quantity / 100;

  return {
    calories: Math.round(food.calories * ratio * 10) / 10,      // 小数第1位まで
    protein: Math.round(food.protein * ratio * 10) / 10,        // タンパク質(g)
    fat: Math.round(food.fat * ratio * 10) / 10,                // 脂質(g)
    carbohydrate: Math.round(food.carbohydrate * ratio * 10) / 10, // 炭水化物(g)
    iron: Math.round(food.iron * ratio * 100) / 100,            // 鉄(mg)
    calcium: Math.round(food.calcium * ratio * 10) / 10,        // カルシウム(mg)
    folate: Math.round(food.folate * ratio * 10) / 10           // 葉酸(μg)
  };
}

/**
 * 1日の食事記録から栄養素の合計を計算する
 *
 * @param {Array} meals - 食事記録の配列
 *   各要素は { food: foodData, quantity: グラム数 } の形式
 * @param {Array} foodsData - 食品マスタデータの配列
 * @returns {Object} 1日の栄養素合計
 *
 * 例）
 * calculateDailyTotal(
 *   [
 *     { foodId: 'food-001', quantity: 150 },
 *     { foodId: 'food-025', quantity: 50 }
 *   ],
 *   foodsData
 * ) → { calories: 350, protein: 10.5, ... }
 */
function calculateDailyTotal(meals, foodsData) {
  // 入力値の検証
  if (!Array.isArray(meals) || !Array.isArray(foodsData)) {
    console.error('不正な入力です。配列を指定してください。');
    return null;
  }

  // 初期化：全栄養素を0で設定
  const dailyTotal = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrate: 0,
    iron: 0,
    calcium: 0,
    folate: 0
  };

  // 各食事記録について計算
  meals.forEach(meal => {
    // foodIdから食品データを検索
    const food = foodsData.find(f => f.foodId === meal.foodId);

    if (!food) {
      console.warn(`食品が見つかりません: ${meal.foodId}`);
      return;
    }

    // その食事の栄養素を計算
    const mealNutrients = calculateNutrients(food, meal.quantity);

    if (mealNutrients) {
      // 1日の合計に加算
      dailyTotal.calories += mealNutrients.calories;
      dailyTotal.protein += mealNutrients.protein;
      dailyTotal.fat += mealNutrients.fat;
      dailyTotal.carbohydrate += mealNutrients.carbohydrate;
      dailyTotal.iron += mealNutrients.iron;
      dailyTotal.calcium += mealNutrients.calcium;
      dailyTotal.folate += mealNutrients.folate;
    }
  });

  // 小数第1位で四捨五入（見やすさのため）
  return {
    calories: Math.round(dailyTotal.calories * 10) / 10,
    protein: Math.round(dailyTotal.protein * 10) / 10,
    fat: Math.round(dailyTotal.fat * 10) / 10,
    carbohydrate: Math.round(dailyTotal.carbohydrate * 10) / 10,
    iron: Math.round(dailyTotal.iron * 100) / 100,
    calcium: Math.round(dailyTotal.calcium * 10) / 10,
    folate: Math.round(dailyTotal.folate * 10) / 10
  };
}

/**
 * 推奨量に対する達成率を計算する
 *
 * @param {Object} dailyTotal - 1日の栄養素合計
 * @param {string} trimester - 妊娠時期 ("first", "second", "third")
 * @param {Array} nutrientsData - 栄養素基準データ（nutrients.jsonから読み込み）
 * @returns {Object} 各栄養素の達成率（％）
 *
 * 例）
 * calculateAchievementRate(
 *   { calories: 1800, protein: 45, ... },
 *   "second",
 *   nutrientsData
 * ) → { calories: 80, protein: 82, iron: 95, ... }
 */
function calculateAchievementRate(dailyTotal, trimester, nutrientsData) {
  // 入力値の検証
  if (!dailyTotal || !trimester || !Array.isArray(nutrientsData)) {
    console.error('不正な入力です。必要なパラメータを確認してください。');
    return null;
  }

  // 妊娠時期の検証
  const validTrimesters = ['first', 'second', 'third'];
  if (!validTrimesters.includes(trimester)) {
    console.error('妊娠時期は "first", "second", "third" のいずれかを指定してください。');
    return null;
  }

  // 時期に応じた推奨量キーを決定
  const recommendedKey = `${trimester}Trimester`;

  // 達成率を計算
  const achievementRate = {};

  nutrientsData.forEach(nutrient => {
    const nutrientId = nutrient.nutrientId;
    const recommended = nutrient[recommendedKey];
    const actual = dailyTotal[nutrientId] || 0;

    // 達成率を計算（百分率）
    const rate = recommended > 0 ? Math.round((actual / recommended) * 100) : 0;
    achievementRate[nutrientId] = rate;
  });

  return achievementRate;
}

/**
 * 不足栄養素を特定する
 *
 * @param {Object} achievementRate - calculateAchievementRateの戻り値
 * @param {Object} dailyTotal - 1日の栄養素合計
 * @param {string} trimester - 妊娠時期 ("first", "second", "third")
 * @param {Array} nutrientsData - 栄養素基準データ
 * @returns {Array} 不足栄養素の配列（達成率が低い順）
 *   各要素は {
 *     nutrientId: 栄養素ID,
 *     name: 栄養素名,
 *     unit: 単位,
 *     currentAmount: 現在の摂取量,
 *     recommendedAmount: 推奨量,
 *     deficitRate: 不足率(％)
 *   }
 *
 * 例）
 * getDeficientNutrients(achievementRate, dailyTotal, "second", nutrientsData)
 * → [
 *   { nutrientId: 'iron', name: '鉄', unit: 'mg', currentAmount: 10,
 *     recommendedAmount: 16, deficitRate: 37.5 },
 *   ...
 * ]
 */
function getDeficientNutrients(achievementRate, dailyTotal, trimester, nutrientsData) {
  // 入力値の検証
  if (!achievementRate || !dailyTotal || !trimester || !Array.isArray(nutrientsData)) {
    console.error('不正な入力です。必要なパラメータを確認してください。');
    return [];
  }

  const recommendedKey = `${trimester}Trimester`;
  const deficientNutrients = [];

  // 達成率が100%未満の栄養素のみを抽出
  nutrientsData.forEach(nutrient => {
    const nutrientId = nutrient.nutrientId;
    const rate = achievementRate[nutrientId] || 0;

    if (rate < 100) {
      const currentAmount = dailyTotal[nutrientId] || 0;
      const recommendedAmount = nutrient[recommendedKey];
      const deficitRate = 100 - rate;

      deficientNutrients.push({
        nutrientId: nutrientId,
        name: nutrient.name,
        unit: nutrient.unit,
        currentAmount: currentAmount,
        recommendedAmount: recommendedAmount,
        deficitRate: Math.round(deficitRate * 10) / 10
      });
    }
  });

  // 不足率が高い順（達成率が低い順）にソート
  deficientNutrients.sort((a, b) => b.deficitRate - a.deficitRate);

  return deficientNutrients;
}
