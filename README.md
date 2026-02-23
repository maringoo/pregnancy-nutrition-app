# mamori - マタニティ栄養サポート

妊娠期・産後の栄養管理をサポートするPWA（Progressive Web App）です。食事記録・体重管理・栄養提案で、ママと赤ちゃんの健康を守ります。

**[https://maringoo.github.io/pregnancy-nutrition-app/](https://maringoo.github.io/pregnancy-nutrition-app/)**

## 主な機能

### 食事記録
- 805品目の食品データベース（日本食品標準成分表ベース）
- あいまい検索による食品検索
- 13種類の栄養素を自動計算（カロリー、タンパク質、鉄、葉酸、カルシウムなど）
- オリジナル食品の登録（類似食品からの推定、食材から計算、レシピ貼り付け）
- お気に入り・履歴からのクイック入力
- 週間カレンダーによる日付管理・献立予定

### 栄養管理
- 妊娠期別（初期・中期・後期）の推奨摂取量に基づく充足率表示
- 栄養スコアと連続記録ストリーク
- 不足栄養素に基づくおすすめ食品の提案
- 食品の組み合わせ提案（おすすめメニュー）
- 作り置きレシピ提案

### AI献立提案
- Claude / ChatGPT / Gemini に対応
- 不足栄養素を補う献立を自動提案
- レシピ貼り付けのAI解析

### 体重管理
- 体重記録とグラフ表示（Chart.js）
- 妊娠期別の推奨増加範囲の表示
- 体重増加ペース予測

### 買い物・在庫管理
- 献立予定からの買い物リスト自動生成
- 冷蔵庫・食品在庫管理（賞味期限アラート付き）
- パートナーへの共有リンク作成

### その他
- つわり対応モード（栄養基準を緩和）
- 産後モード（授乳期の栄養推奨量に対応）
- リマインダー機能（食事・体重・水分）
- データのエクスポート/インポート
- テーマカラー選択（3種類）
- オフライン対応（Service Worker）
- ホーム画面への追加（PWA）

## 技術構成

- **フロントエンド**: HTML / CSS / Vanilla JavaScript（フレームワーク不使用）
- **データ保存**: localStorage（端末内のみ、サーバー送信なし）
- **グラフ描画**: [Chart.js](https://www.chartjs.org/)
- **AI連携**: Claude API / OpenAI API / Gemini API（ユーザーがAPIキーを設定した場合のみ）
- **ネイティブアプリ**: [Capacitor](https://capacitorjs.com/)（iOS対応）
- **ホスティング**: GitHub Pages
- **CI/CD**: GitHub Actions

## セットアップ

### Webアプリとして利用
特別なセットアップは不要です。ブラウザでアクセスするだけで利用できます。

### ローカル開発
```bash
git clone https://github.com/maringoo/pregnancy-nutrition-app.git
cd pregnancy-nutrition-app
# 任意のHTTPサーバーで起動
npx serve .
# または
python3 -m http.server 8000
```

### iOS ビルド（Capacitor）
```bash
npm install
npx cap sync
npx cap open ios
```

## データについて

- 食品の栄養成分値は日本食品標準成分表（八訂）等を参考にした概算値です
- 妊娠期別の推奨摂取量は厚生労働省「日本人の食事摂取基準」を参考にしています
- 本アプリは医療上の診断やアドバイスに代わるものではありません

## プライバシー

- すべてのデータはお使いの端末内（localStorage）に保存されます
- 外部サーバーへのデータ送信は行いません（AI機能利用時のAPI通信を除く）
- 詳細はアプリ内の「設定 > プライバシーポリシー」をご覧ください

## ライセンス

[MIT License](LICENSE)
