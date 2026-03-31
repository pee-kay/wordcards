(function () {
    'use strict';

    const STORAGE_KEY = 'wordCardsRadicalsInput';

    const wordInput = document.getElementById('radicalWordInput');
    const colsInput = document.getElementById('radicalCols');
    const seedInput = document.getElementById('radicalSeed');
    const shuffleCheck = document.getElementById('radicalShuffle');
    const answerKeyCheck = document.getElementById('radicalAnswerKey');
    const buildBtn = document.getElementById('radicalBuild');
    const printBtn = document.getElementById('radicalPrint');
    const statsEl = document.getElementById('radicalStats');
    const warningEl = document.getElementById('radicalWarning');
    const gridExercise = document.getElementById('radicalGridExercise');
    const gridAnswers = document.getElementById('radicalGridAnswers');
    const printRoot = document.getElementById('radicalPrintRoot');
    const exportBtn = document.getElementById('radicalExport');
    const importBtn = document.getElementById('radicalImport');
    const fileInput = document.getElementById('radicalFileInput');

    const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}]/u;

    function isCjkChar(ch) {
        return CJK_RE.test(ch);
    }

    function parseCards(text) {
        const lines = text.split('\n');
        const cards = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const parts = trimmed.split(',');
            const word = parts[0].trim();
            if (!word) continue;

            if (parts.length >= 3) {
                cards.push({
                    word,
                    pronunciation: parts[1].trim(),
                    meaning: parts.slice(2).join(',').trim()
                });
            } else if (parts.length === 2) {
                cards.push({
                    word,
                    pronunciation: parts[1].trim(),
                    meaning: ''
                });
            } else {
                cards.push({
                    word,
                    pronunciation: '',
                    meaning: ''
                });
            }
        }
        return cards;
    }

    function extractHanziSequence(cards) {
        const out = [];
        for (const card of cards) {
            for (const ch of card.word) {
                if (isCjkChar(ch)) out.push(ch);
            }
        }
        return out;
    }

    function getPinyinFn() {
        if (typeof pinyinPro !== 'undefined' && pinyinPro.pinyin) {
            return function (ch) {
                return pinyinPro.pinyin(ch, { toneType: 'symbol', type: 'string' }).trim();
            };
        }
        return null;
    }

    function splitUserPinyin(pronunciation) {
        return pronunciation.split(/\s+/).filter(Boolean);
    }

    function alignPinyinFromCard(word, pronunciation) {
        const hanzi = [];
        for (const ch of word) {
            if (isCjkChar(ch)) hanzi.push(ch);
        }
        if (hanzi.length === 0) return [];
        const syllables = splitUserPinyin(pronunciation);
        if (syllables.length === hanzi.length) {
            return hanzi.map((_, i) => syllables[i]);
        }
        if (syllables.length === 1 && hanzi.length === 1) {
            return [syllables[0]];
        }
        return null;
    }

    function buildPinyinList(cards, chars) {
        const pinyinFn = getPinyinFn();
        const byCharIndex = [];
        let charOffset = 0;

        for (const card of cards) {
            const aligned = alignPinyinFromCard(card.word, card.pronunciation);
            const cardHanzi = [];
            for (const ch of card.word) {
                if (isCjkChar(ch)) cardHanzi.push(ch);
            }
            if (aligned && cardHanzi.length === aligned.length) {
                for (let i = 0; i < cardHanzi.length; i++) {
                    byCharIndex[charOffset + i] = aligned[i];
                }
            } else if (pinyinFn && cardHanzi.length > 0) {
                for (let i = 0; i < cardHanzi.length; i++) {
                    byCharIndex[charOffset + i] = pinyinFn(cardHanzi[i]);
                }
            } else {
                for (let i = 0; i < cardHanzi.length; i++) {
                    byCharIndex[charOffset + i] = '?';
                }
            }
            charOffset += cardHanzi.length;
        }

        return chars.map((_, i) => byCharIndex[i] || '?');
    }

    function mulberry32(a) {
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hashSeed(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function drawMaskedCharacter(char, rng) {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        const fontPx = Math.round(size * 0.72);
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontPx}px "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif`;
        ctx.fillText(char, size / 2, size / 2);

        const tw = ctx.measureText(char).width;
        const th = fontPx * 0.92;
        const left = size / 2 - tw / 2;
        const top = size / 2 - th / 2;

        const region = Math.floor(rng() * 6);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;

        const wCover = tw * (0.38 + rng() * 0.18);
        const hCover = th * (0.38 + rng() * 0.18);

        let mx, my;
        switch (region) {
            case 0:
                mx = left;
                my = top;
                break;
            case 1:
                mx = left + tw - wCover;
                my = top;
                break;
            case 2:
                mx = left;
                my = top + th - hCover;
                break;
            case 3:
                mx = left + tw - wCover;
                my = top + th - hCover;
                break;
            case 4:
                mx = left + (tw - wCover) / 2;
                my = top;
                break;
            default:
                mx = left + (tw - wCover) / 2;
                my = top + th - hCover;
                break;
        }

        ctx.fillRect(mx, my, wCover, hCover);
        ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

        return canvas.toDataURL('image/png');
    }

    function showWarning(msg) {
        warningEl.textContent = msg;
        warningEl.classList.remove('hidden');
    }

    function hideWarning() {
        warningEl.classList.add('hidden');
    }

    function shuffleInPlace(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function buildCells(chars, pinyinList, rng) {
        return chars.map((ch, i) => ({
            char: ch,
            pinyin: pinyinList[i],
            maskedSrc: drawMaskedCharacter(ch, rng)
        }));
    }

    function renderGrid(container, cells, cols, mode) {
        container.innerHTML = '';
        container.style.setProperty('--radical-cols', String(cols));

        for (const cell of cells) {
            const wrap = document.createElement('div');
            wrap.className = 'radical-cell';

            if (mode === 'exercise') {
                const img = document.createElement('img');
                img.className = 'radical-char-img';
                img.src = cell.maskedSrc;
                img.alt = 'Character with a part hidden';
                wrap.appendChild(img);
            } else {
                const glyph = document.createElement('div');
                glyph.className = 'radical-char-full';
                glyph.textContent = cell.char;
                wrap.appendChild(glyph);
            }

            const py = document.createElement('div');
            py.className = 'radical-pinyin';
            py.textContent = cell.pinyin;
            wrap.appendChild(py);

            container.appendChild(wrap);
        }
    }

    function updateAnswerSheetVisibility() {
        const show = answerKeyCheck.checked;
        printRoot.classList.toggle('print-no-answers', !show);
    }

    function runBuild() {
        hideWarning();
        const cards = parseCards(wordInput.value);
        if (cards.length === 0) {
            showWarning('Add at least one non-empty line (single column, or word,pronunciation[,meaning]).');
            statsEl.textContent = 'No characters yet';
            gridExercise.innerHTML = '';
            gridAnswers.innerHTML = '';
            return;
        }

        let chars = extractHanziSequence(cards);
        if (chars.length === 0) {
            showWarning('No Chinese characters found in the word column.');
            statsEl.textContent = 'No Chinese characters';
            gridExercise.innerHTML = '';
            gridAnswers.innerHTML = '';
            return;
        }

        const pinyinList = buildPinyinList(cards, chars);
        const hasQuestion = pinyinList.some((p) => p === '?');
        const noLib = !getPinyinFn();
        if (hasQuestion && noLib) {
            showWarning('Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.');
        }

        const seedStr = seedInput.value.trim();
        const seedNum = seedStr === '' ? Date.now() : hashSeed(seedStr);
        const rng = mulberry32(seedNum);

        const charsCopy = chars.slice();
        const pyCopy = pinyinList.slice();
        if (shuffleCheck.checked) {
            const order = charsCopy.map((_, i) => i);
            shuffleInPlace(order, rng);
            chars = order.map((i) => charsCopy[i]);
            const pyOrdered = order.map((i) => pyCopy[i]);
            for (let i = 0; i < chars.length; i++) {
                pinyinList[i] = pyOrdered[i];
            }
        }

        const cols = Math.min(12, Math.max(2, parseInt(colsInput.value, 10) || 6));
        colsInput.value = String(cols);

        const cells = buildCells(chars, pinyinList, rng);
        renderGrid(gridExercise, cells, cols, 'exercise');
        renderGrid(gridAnswers, cells, cols, 'answers');

        statsEl.textContent = `${cells.length} characters · seed ${seedStr || '(time-based)'}`;
        updateAnswerSheetVisibility();
    }

    function printSheet() {
        updateAnswerSheetVisibility();
        window.print();
    }

    function exportRadicalsCsv() {
        const raw = wordInput.value;
        if (!raw.trim()) {
            alert('Nothing to export.');
            return;
        }
        const blob = new Blob(['\ufeff' + raw], {
            type: 'text/csv;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'radicals-list.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function restoreInput() {
        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (s) wordInput.value = s;
        } catch (_) {}
    }

    buildBtn.addEventListener('click', () => {
        try {
            localStorage.setItem(STORAGE_KEY, wordInput.value);
        } catch (_) {}
        runBuild();
    });

    printBtn.addEventListener('click', () => {
        runBuild();
        printSheet();
    });

    exportBtn.addEventListener('click', exportRadicalsCsv);

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            wordInput.value = String(reader.result || '');
            try {
                localStorage.setItem(STORAGE_KEY, wordInput.value);
            } catch (_) {}
            runBuild();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    answerKeyCheck.addEventListener('change', updateAnswerSheetVisibility);

    updateAnswerSheetVisibility();
    restoreInput();
    if (wordInput.value.trim()) {
        runBuild();
    }
})();
