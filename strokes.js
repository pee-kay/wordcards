(function () {
    'use strict';

    const STORAGE_KEY = 'wordCardsStrokesInput';
    const HANZI_WRITER_DATA_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

    const wordInput = document.getElementById('strokeWordInput');
    const stepsPerRowInput = document.getElementById('strokeStepsPerRow');
    const stepSizeInput = document.getElementById('strokeStepSize');
    const showPinyinCheck = document.getElementById('strokeShowPinyin');
    const buildBtn = document.getElementById('strokeBuild');
    const statsEl = document.getElementById('strokeStats');
    const warningEl = document.getElementById('strokeWarning');
    const loadingEl = document.getElementById('strokeLoading');
    const printRoot = document.getElementById('strokePrintRoot');
    const exportBtn = document.getElementById('strokeExport');
    const importBtn = document.getElementById('strokeImport');
    const fileInput = document.getElementById('strokeFileInput');

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

    function renderStrokeSvg(strokes, width, height, padding) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('overflow', 'visible');
        svg.classList.add('stroke-step-svg-el');

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (typeof HanziWriter !== 'undefined' && HanziWriter.getScalingTransform) {
            const transformData = HanziWriter.getScalingTransform(width, height, padding);
            g.setAttributeNS(null, 'transform', transformData.transform);
        }
        svg.appendChild(g);

        strokes.forEach(function (strokePath) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttributeNS(null, 'd', strokePath);
            path.setAttribute('fill', '#222');
            g.appendChild(path);
        });

        return svg;
    }

    async function loadCharData(ch) {
        try {
            const url = `${HANZI_WRITER_DATA_BASE}/${ch}.json`;
            const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!res.ok) return null;
            const d = await res.json();
            if (d && Array.isArray(d.strokes) && d.strokes.length > 0) return d;
            return null;
        } catch (_) {
            return null;
        }
    }

    async function runBuild() {
        hideWarning();
        printRoot.innerHTML = '';

        if (typeof HanziWriter === 'undefined' || typeof HanziWriter.getScalingTransform !== 'function') {
            showWarning('Hanzi Writer failed to load. Check your network and refresh.');
            statsEl.textContent = 'Hanzi Writer unavailable';
            return;
        }

        const cards = parseCards(wordInput.value);
        if (cards.length === 0) {
            showWarning('Add at least one non-empty line (single column, or word,pronunciation[,meaning]).');
            statsEl.textContent = 'No characters yet';
            return;
        }

        const chars = extractHanziSequence(cards);
        if (chars.length === 0) {
            showWarning('No Chinese characters found in the word column.');
            statsEl.textContent = 'No Chinese characters';
            return;
        }

        const pinyinList = buildPinyinList(cards, chars);
        const hasQuestion = pinyinList.some((p) => p === '?');
        const noLib = !getPinyinFn();
        const warnParts = [];
        if (hasQuestion && noLib) {
            warnParts.push(
                'Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.'
            );
        }

        const stepsPerRow = Math.min(24, Math.max(4, parseInt(stepsPerRowInput.value, 10) || 8));
        stepsPerRowInput.value = String(stepsPerRow);

        const stepSize = Math.min(120, Math.max(40, parseInt(stepSizeInput.value, 10) || 64));
        stepSizeInput.value = String(stepSize);

        const padding = Math.max(2, Math.round(stepSize * 0.08));
        const showPinyin = showPinyinCheck.checked;

        const unique = [...new Set(chars)];
        setLoading(true);
        buildBtn.disabled = true;

        const dataMap = new Map();
        const failed = [];

        try {
            await Promise.all(
                unique.map(async (ch) => {
                    const data = await loadCharData(ch);
                    if (data) {
                        dataMap.set(ch, data);
                    } else {
                        dataMap.set(ch, null);
                        failed.push(ch);
                    }
                })
            );
        } finally {
            setLoading(false);
            buildBtn.disabled = false;
        }

        if (failed.length > 0) {
            const sample = [...new Set(failed)].slice(0, 8).join(' ');
            warnParts.push(
                `No stroke data for ${failed.length} unique character(s): ${sample}${failed.length > 8 ? ' …' : ''}. They are skipped below.`
            );
        }
        if (warnParts.length) {
            showWarning(warnParts.join(' '));
        }

        let totalSteps = 0;
        const frag = document.createDocumentFragment();

        chars.forEach((ch, idx) => {
            const charData = dataMap.get(ch);
            const block = document.createElement('div');
            block.className = 'stroke-char-block';

            const head = document.createElement('div');
            head.className = 'stroke-char-head';
            const title = document.createElement('span');
            title.className = 'stroke-char-title-glyph';
            title.textContent = ch;
            head.appendChild(title);
            if (showPinyin) {
                const py = document.createElement('span');
                py.className = 'stroke-char-title-pinyin';
                py.textContent = pinyinList[idx] || '';
                head.appendChild(py);
            }
            block.appendChild(head);

            if (!charData || !charData.strokes.length) {
                const miss = document.createElement('div');
                miss.className = 'stroke-char-missing';
                miss.textContent = 'Stroke data not available for this character.';
                block.appendChild(miss);
                frag.appendChild(block);
                return;
            }

            const stepsWrap = document.createElement('div');
            stepsWrap.className = 'stroke-steps';
            stepsWrap.style.setProperty('--stroke-steps-cols', String(stepsPerRow));
            const cellMinPx = Math.ceil(stepSize + 20);
            stepsWrap.style.setProperty('--stroke-step-min', `${cellMinPx}px`);

            const n = charData.strokes.length;
            for (let i = 0; i < n; i++) {
                const portion = charData.strokes.slice(0, i + 1);
                const step = document.createElement('div');
                step.className = 'stroke-step';

                const svgBox = document.createElement('div');
                svgBox.className = 'stroke-step-svg-wrap';
                svgBox.appendChild(renderStrokeSvg(portion, stepSize, stepSize, padding));
                step.appendChild(svgBox);

                const num = document.createElement('span');
                num.className = 'stroke-step-num';
                num.textContent = String(i + 1);
                step.appendChild(num);

                stepsWrap.appendChild(step);
                totalSteps += 1;
            }

            block.appendChild(stepsWrap);
            frag.appendChild(block);
        });

        printRoot.appendChild(frag);

        const okChars = chars.filter((ch) => {
            const d = dataMap.get(ch);
            return d && d.strokes && d.strokes.length > 0;
        }).length;

        statsEl.textContent = `${okChars} of ${chars.length} characters rendered · ${totalSteps} stroke steps total`;
    }

    function exportCsv() {
        const raw = wordInput.value;
        if (!raw.trim()) {
            alert('Nothing to export.');
            return;
        }
        const blob = new Blob(['\ufeff' + raw], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'strokes-list.csv';
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

    exportBtn.addEventListener('click', exportCsv);

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function (e) {
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

    restoreInput();
    if (wordInput.value.trim()) {
        runBuild();
    }
})();
