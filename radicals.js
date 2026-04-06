(function () {
    'use strict';

    function t(key, vars) {
        return window.I18N && I18N.t ? I18N.t(key, vars) : key;
    }

    const STORAGE_KEY = 'wordCardsRadicalsInput';
    /** Same dataset as Hanzi Writer; load via fetch to avoid broken parallel loads on HanziWriter.loadCharacterData (singleton LoadingManager). */
    const HANZI_WRITER_DATA_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

    const SVG_SIZE = 72;
    const SVG_PADDING = Math.max(2, Math.round(SVG_SIZE * 0.08));

    const charDataCache = new Map();

    const wordInput = document.getElementById('radicalWordInput');
    const colsInput = document.getElementById('radicalCols');
    const hideModeSelect = document.getElementById('radicalHideMode');
    const shuffleCheck = document.getElementById('radicalShuffle');
    const answerKeyCheck = document.getElementById('radicalAnswerKey');
    const buildBtn = document.getElementById('radicalBuild');
    const statsEl = document.getElementById('radicalStats');
    const warningEl = document.getElementById('radicalWarning');
    const loadingEl = document.getElementById('radicalLoading');
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

    function shuffleInPlace(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function pickHiddenStrokeIndices(mode, charData, rng) {
        const n = (charData.strokes || []).length;
        if (n <= 1) {
            return { hidden: new Set(), radicalFallback: false };
        }

        if (mode === 'radical') {
            const rad = (charData.radStrokes || [])
                .map(Number)
                .filter((i) => Number.isInteger(i) && i >= 0 && i < n);
            if (rad.length === 0) {
                return {
                    hidden: new Set([Math.floor(rng() * n)]),
                    radicalFallback: true
                };
            }
            const hidden = new Set(rad);
            if (hidden.size >= n) {
                hidden.delete(Math.floor(rng() * n));
            }
            return { hidden, radicalFallback: false };
        }

        if (mode === 'single') {
            return { hidden: new Set([Math.floor(rng() * n)]), radicalFallback: false };
        }

        const maxHide = Math.min(n - 1, 5);
        const minHide = Math.min(2, maxHide);
        if (maxHide < 1) {
            return { hidden: new Set(), radicalFallback: false };
        }
        const span = maxHide - minHide + 1;
        const k = minHide + Math.floor(rng() * span);
        const pickCount = Math.max(1, Math.min(k, n - 1));
        const indices = [];
        for (let i = 0; i < n; i++) indices.push(i);
        shuffleInPlace(indices, rng);
        return { hidden: new Set(indices.slice(0, pickCount)), radicalFallback: false };
    }

    function renderPartialCharacterSvg(charData, hiddenStrokeIndices, width, height, padding) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('overflow', 'visible');

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (typeof HanziWriter !== 'undefined' && HanziWriter.getScalingTransform) {
            const transformData = HanziWriter.getScalingTransform(width, height, padding);
            g.setAttributeNS(null, 'transform', transformData.transform);
        }
        svg.appendChild(g);

        charData.strokes.forEach(function (strokePath, i) {
            if (hiddenStrokeIndices.has(i)) return;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttributeNS(null, 'd', strokePath);
            path.setAttribute('fill', '#222');
            g.appendChild(path);
        });

        return svg;
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

    function drawFullCharacterCanvas(char) {
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
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
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

    function setLoading(on) {
        loadingEl.classList.toggle('hidden', !on);
    }

    async function fetchCharData(ch) {
        if (charDataCache.has(ch)) {
            return charDataCache.get(ch);
        }
        try {
            const url = `${HANZI_WRITER_DATA_BASE}/${ch}.json`;
            const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!res.ok) {
                charDataCache.set(ch, null);
                return null;
            }
            const d = await res.json();
            if (d && Array.isArray(d.strokes) && d.strokes.length > 0) {
                charDataCache.set(ch, d);
                return d;
            }
            charDataCache.set(ch, null);
            return null;
        } catch (_) {
            charDataCache.set(ch, null);
            return null;
        }
    }

    async function loadCharDataMap(chars) {
        const unique = [...new Set(chars)];
        const map = new Map();
        await Promise.all(
            unique.map(async (ch) => {
                const d = await fetchCharData(ch);
                map.set(ch, d);
            })
        );
        return map;
    }

    function buildCells(chars, pinyinList, rng, hideMode, dataMap, canScale) {
        let strokeDataFallback = 0;
        let radicalListFallback = 0;

        const cells = chars.map((ch, i) => {
            const data = dataMap.get(ch);
            if (!data || !canScale) {
                strokeDataFallback += 1;
                return {
                    char: ch,
                    pinyin: pinyinList[i],
                    exerciseKind: 'canvas',
                    canvasSrc: drawMaskedCharacter(ch, rng),
                    answerCanvasSrc: drawFullCharacterCanvas(ch)
                };
            }

            const { hidden, radicalFallback } = pickHiddenStrokeIndices(hideMode, data, rng);
            if (radicalFallback) radicalListFallback += 1;

            const emptyHidden = new Set();
            const svg = renderPartialCharacterSvg(data, hidden, SVG_SIZE, SVG_SIZE, SVG_PADDING);
            const answerSvg = renderPartialCharacterSvg(data, emptyHidden, SVG_SIZE, SVG_SIZE, SVG_PADDING);
            return {
                char: ch,
                pinyin: pinyinList[i],
                exerciseKind: 'svg',
                exerciseSvg: svg,
                answerSvg: answerSvg
            };
        });

        return { cells, strokeDataFallback, radicalListFallback };
    }

    function renderGrid(container, cells, cols, mode) {
        container.innerHTML = '';
        container.style.setProperty('--radical-cols', String(cols));

        for (const cell of cells) {
            const wrap = document.createElement('div');
            wrap.className = 'radical-cell';

            if (mode === 'exercise') {
                if (cell.exerciseKind === 'svg' && cell.exerciseSvg) {
                    const holder = document.createElement('div');
                    holder.className = 'radical-char-svg-wrap';
                    holder.appendChild(cell.exerciseSvg);
                    wrap.appendChild(holder);
                } else if (cell.exerciseKind === 'canvas' && cell.canvasSrc) {
                    const img = document.createElement('img');
                    img.className = 'radical-char-img';
                    img.src = cell.canvasSrc;
                    img.alt = t('radicals.imgAlt');
                    wrap.appendChild(img);
                }
            } else {
                if (cell.exerciseKind === 'svg' && cell.answerSvg) {
                    const holder = document.createElement('div');
                    holder.className = 'radical-char-svg-wrap';
                    holder.appendChild(cell.answerSvg);
                    wrap.appendChild(holder);
                } else if (cell.answerCanvasSrc) {
                    const img = document.createElement('img');
                    img.className = 'radical-char-img';
                    img.src = cell.answerCanvasSrc;
                    img.alt = cell.char;
                    wrap.appendChild(img);
                } else {
                    const glyph = document.createElement('div');
                    glyph.className = 'radical-char-full';
                    glyph.textContent = cell.char;
                    wrap.appendChild(glyph);
                }
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

    function hideModeLabel(mode) {
        if (mode === 'radical') return t('radicals.hide.radical');
        if (mode === 'single') return t('radicals.hide.single');
        return t('radicals.hide.multiple');
    }

    async function runBuild() {
        hideWarning();
        const cards = parseCards(wordInput.value);
        if (cards.length === 0) {
            showWarning(t('radicals.warnEmpty'));
            statsEl.textContent = t('radicals.statsNone');
            gridExercise.innerHTML = '';
            gridAnswers.innerHTML = '';
            return;
        }

        let chars = extractHanziSequence(cards);
        if (chars.length === 0) {
            showWarning(t('radicals.warnNoHanzi'));
            statsEl.textContent = t('radicals.statsNoHanzi');
            gridExercise.innerHTML = '';
            gridAnswers.innerHTML = '';
            return;
        }

        const pinyinList = buildPinyinList(cards, chars);
        const hasQuestion = pinyinList.some((p) => p === '?');
        const noLib = !getPinyinFn();
        const warnParts = [];
        if (hasQuestion && noLib) {
            warnParts.push(t('radicals.warnPinyin'));
        }

        const rng = mulberry32(Date.now());

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

        let mode = hideModeSelect ? hideModeSelect.value : 'radical';
        if (mode !== 'radical' && mode !== 'single' && mode !== 'multiple') {
            mode = 'radical';
            if (hideModeSelect) hideModeSelect.value = 'radical';
        }

        setLoading(true);
        buildBtn.disabled = true;

        const canScale =
            typeof HanziWriter !== 'undefined' && typeof HanziWriter.getScalingTransform === 'function';

        try {
            const dataMap = canScale ? await loadCharDataMap(chars) : new Map();

            if (!canScale) {
                warnParts.push(t('radicals.warnNoHw'));
            }

            const { cells, strokeDataFallback, radicalListFallback } = buildCells(
                chars,
                pinyinList,
                rng,
                mode,
                dataMap,
                canScale
            );

            if (strokeDataFallback > 0) {
                warnParts.push(t('radicals.warnStrokeFallback', { n: strokeDataFallback }));
            }
            if (mode === 'radical' && radicalListFallback > 0) {
                warnParts.push(t('radicals.warnRadicalFallback', { n: radicalListFallback }));
            }

            if (warnParts.length) {
                showWarning(warnParts.join(' '));
            }

            renderGrid(gridExercise, cells, cols, 'exercise');
            renderGrid(gridAnswers, cells, cols, 'answers');

            statsEl.textContent = t('radicals.statsLine', {
                count: cells.length,
                hide: hideModeLabel(mode)
            });
        } finally {
            setLoading(false);
            buildBtn.disabled = false;
        }

        updateAnswerSheetVisibility();
    }

    function exportRadicalsCsv() {
        const raw = wordInput.value;
        if (!raw.trim()) {
            alert(t('radicals.exportEmpty'));
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

    buildBtn.addEventListener('click', async function () {
        try {
            localStorage.setItem(STORAGE_KEY, wordInput.value);
        } catch (_) {}
        await runBuild();
    });

    exportBtn.addEventListener('click', exportRadicalsCsv);

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function () {
            wordInput.value = String(reader.result || '');
            try {
                localStorage.setItem(STORAGE_KEY, wordInput.value);
            } catch (_) {}
            await runBuild();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    answerKeyCheck.addEventListener('change', updateAnswerSheetVisibility);

    if (hideModeSelect) {
        hideModeSelect.addEventListener('change', async function () {
            if (wordInput.value.trim()) {
                await runBuild();
            }
        });
    }

    document.addEventListener('wordcards:locale-changed', async function () {
        if (window.I18N) {
            I18N.applyStaticTranslations();
        }
        if (wordInput.value.trim()) {
            await runBuild();
        } else {
            statsEl.textContent = t('radicals.statsNone');
        }
    });

    updateAnswerSheetVisibility();
    restoreInput();
    if (wordInput.value.trim()) {
        runBuild();
    }
})();
