/**
 * パートナー共有機能
 * 在庫・買い物リストデータをURL共有し、パートナーがブラウザで閲覧可能
 */

// LZ-String圧縮（軽量版）
const LZString = (function() {
    const f = String.fromCharCode;
    const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    function _compress(uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        let i, value, context_dictionary = {}, context_dictionaryToCreate = {},
            context_c = "", context_wc = "", context_w = "",
            context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2,
            context_data = [], context_data_val = 0, context_data_position = 0, ii;

        for (ii = 0; ii < uncompressed.length; ii++) {
            context_c = uncompressed.charAt(ii);
            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                context_dictionary[context_c] = context_dictSize++;
                context_dictionaryToCreate[context_c] = true;
            }
            context_wc = context_w + context_c;
            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                context_w = context_wc;
            } else {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 8; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 16; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                context_dictionary[context_wc] = context_dictSize++;
                context_w = String(context_c);
            }
        }
        if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) { context_data_val = (context_data_val << 1) | (value & 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } value = value >> 1; }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | value; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } value = 0; }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) { context_data_val = (context_data_val << 1) | (value & 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } value = value >> 1; }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | (value & 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } value = value >> 1; }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
        }
        value = 2;
        for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | (value & 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } value = value >> 1; }
        while (true) { context_data_val = (context_data_val << 1); if (context_data_position == bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; } else context_data_position++; }
        return context_data.join('');
    }

    function _decompress(length, resetValue, getNextValue) {
        let dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3,
            entry = "", result = [], i, w, bits, resb, maxpower, power, c,
            data = { val: getNextValue(0), position: resetValue, index: 1 };

        for (i = 0; i < 3; i++) dictionary[i] = i;
        bits = 0; maxpower = Math.pow(2, 2); power = 1;
        while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }
        switch (next = bits) {
            case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1;
                while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                c = f(bits); break;
            case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1;
                while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                c = f(bits); break;
            case 2: return "";
        }
        dictionary[3] = c; w = c; result.push(c);
        while (true) {
            if (data.index > length) return "";
            bits = 0; maxpower = Math.pow(2, numBits); power = 1;
            while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
            switch (c = bits) {
                case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1;
                    while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                    dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
                case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1;
                    while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                    dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
                case 2: return result.join('');
            }
            if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            if (dictionary[c]) { entry = dictionary[c]; } else { if (c === dictSize) { entry = w + w.charAt(0); } else { return null; } }
            result.push(entry);
            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            w = entry;
        }
    }

    return {
        compressToEncodedURIComponent: function(input) {
            if (input == null) return "";
            return _compress(input, 6, function(a) { return keyStrBase64.charAt(a); });
        },
        decompressFromEncodedURIComponent: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            input = input.replace(/ /g, "+");
            return _decompress(input.length, 32, function(index) { return keyStrBase64.indexOf(input.charAt(index)); });
        }
    };
})();

function createShareData() {
    const pantryItems = typeof getPantryItems === 'function' ? getPantryItems() : [];
    const shoppingList = JSON.parse(localStorage.getItem('shoppingListCache') || '[]');

    // 個人情報は含めない
    return {
        v: 1,
        ts: new Date().toISOString(),
        pantry: pantryItems.map(item => ({
            name: item.name || item.foodName,
            quantity: item.quantity,
            unit: item.unit || 'g',
            expiry: item.expiry
        })),
        shopping: shoppingList.map(item => ({
            name: item.name || item.foodName,
            quantity: item.quantity,
            unit: item.unit || 'g',
            checked: item.checked || false
        }))
    };
}

function generateShareURL() {
    const data = createShareData();
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url = `${location.origin}${location.pathname}#share=${compressed}`;
    return url;
}

function shareWithPartner() {
    const url = generateShareURL();

    // Web Share API対応チェック
    if (navigator.share) {
        navigator.share({
            title: 'mamori - 在庫・買い物リスト',
            text: '在庫と買い物リストを共有します',
            url: url
        }).catch(() => {
            copyShareURL(url);
        });
    } else {
        copyShareURL(url);
    }
}

function copyShareURL(url) {
    if (!url) url = generateShareURL();
    navigator.clipboard.writeText(url).then(() => {
        if (typeof showToast === 'function') {
            showToast('共有リンクをコピーしました');
        }
    }).catch(() => {
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (typeof showToast === 'function') {
            showToast('共有リンクをコピーしました');
        }
    });
}

function validateShareData(data) {
    if (!data || typeof data !== 'object') return null;
    return {
        v: Number(data.v) || 0,
        ts: typeof data.ts === 'string' ? data.ts : '',
        pantry: Array.isArray(data.pantry)
            ? data.pantry.map(item => ({
                name: String(item.name || ''),
                quantity: Number(item.quantity) || 0,
                unit: String(item.unit || 'g'),
                expiry: typeof item.expiry === 'string' ? item.expiry : ''
            }))
            : [],
        shopping: Array.isArray(data.shopping)
            ? data.shopping.map(item => ({
                name: String(item.name || ''),
                quantity: Number(item.quantity) || 0,
                unit: String(item.unit || 'g'),
                checked: !!item.checked
            }))
            : []
    };
}

function checkShareURL() {
    const hash = location.hash;
    if (!hash.startsWith('#share=')) return;

    const compressed = hash.substring(7);
    try {
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) return;
        const raw = JSON.parse(json);
        const data = validateShareData(raw);
        if (!data) return;
        showShareViewer(data);
    } catch (e) {
        console.error('共有データの読み込みに失敗しました');
    }
    // URLフラグメントをクリア
    history.replaceState(null, '', location.pathname);
}

function showShareViewer(data) {
    const viewer = document.getElementById('shareViewerOverlay');
    if (!viewer) return;

    const pantryHTML = (data.pantry && data.pantry.length > 0)
        ? data.pantry.map(item => {
            const expiry = item.expiry ? ` (期限: ${escapeHtml(item.expiry)})` : '';
            return `<div class="share-viewer-item"><span>${escapeHtml(item.name)}</span><span>${escapeHtml(item.quantity)}${escapeHtml(item.unit)}${expiry}</span></div>`;
        }).join('')
        : '<p style="color:var(--light-text);font-size:0.85rem">在庫データはありません</p>';

    const shoppingHTML = (data.shopping && data.shopping.length > 0)
        ? data.shopping.map(item => {
            const checked = item.checked ? ' style="text-decoration:line-through;opacity:0.5"' : '';
            return `<div class="share-viewer-item"${checked}><span>${escapeHtml(item.name)}</span><span>${escapeHtml(item.quantity)}${escapeHtml(item.unit)}</span></div>`;
        }).join('')
        : '<p style="color:var(--light-text);font-size:0.85rem">買い物リストはありません</p>';

    const dateStr = data.ts ? new Date(data.ts).toLocaleString('ja-JP') : '';

    viewer.innerHTML = `
        <div class="share-viewer">
            <h2>共有データ</h2>
            <span class="share-viewer-badge">読み取り専用</span>
            <p style="font-size:0.8rem;color:var(--light-text);margin-bottom:1rem">更新: ${dateStr}</p>
            <h3>冷蔵庫・食品在庫</h3>
            ${pantryHTML}
            <h3>買い物リスト</h3>
            ${shoppingHTML}
            <button type="button" class="btn btn-primary share-viewer-close-btn" style="margin-top:1.5rem;width:100%">閉じる</button>
        </div>
    `;
    viewer.classList.remove('hidden');

    const closeBtn = viewer.querySelector('.share-viewer-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeShareViewer);
}

function closeShareViewer() {
    const viewer = document.getElementById('shareViewerOverlay');
    if (viewer) viewer.classList.add('hidden');
}

// 共有ボタンのイベント登録
document.addEventListener('DOMContentLoaded', () => {
    const shareBtn = document.getElementById('shareWithPartnerBtn');
    if (shareBtn) shareBtn.addEventListener('click', shareWithPartner);
    const copyBtn = document.getElementById('copyShareURLBtn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyShareURL());
});
