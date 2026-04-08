(function () {
    'use strict';

    function t(key, vars) {
        return window.I18N && I18N.t ? I18N.t(key, vars) : key;
    }

    const STORAGE_KEY = 'wordCardsStrokesInput';
    const HANZI_WRITER_DATA_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

    const wordInput = document.getElementById('strokeWordInput');
    const gridColsInput = document.getElementById('strokeGridCols');
    const showMetaCheck = document.getElementById('strokeShowMeta');
    const showStepNumbersCheck = document.getElementById('strokeShowStepNumbers');
    const practiceRowsCheck = document.getElementById('strokePracticeRows');
    const practiceRowsCountInput = document.getElementById('strokePracticeRowsCount');
    const practiceCountField = document.querySelector('.stroke-practice-count-field');
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
        const parseRow =
            window.WordcardsCsvWordlists && WordcardsCsvWordlists.parseCsvLine
                ? function (s) {
                      return WordcardsCsvWordlists.parseCsvLine(s);
                  }
                : function (s) {
                      return s.split(',');
                  };
        const lines = text.split('\n');
        const cards = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const parts = parseRow(trimmed);
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

    function formatWordMeta(card) {
        const hanzi = [];
        for (const ch of card.word) {
            if (isCjkChar(ch)) hanzi.push(ch);
        }
        if (hanzi.length === 0) {
            return { pinyin: '', meaning: '' };
        }
        const aligned = alignPinyinFromCard(card.word, card.pronunciation);
        let pinyin = '';
        if (aligned && aligned.length === hanzi.length) {
            pinyin = aligned.join(' ');
        } else {
            const fn = getPinyinFn();
            if (fn) {
                pinyin = hanzi.map(function (c) {
                    return fn(c);
                }).join('');
            }
        }
        const meaning = (card.meaning || '').trim();
        return { pinyin: pinyin.trim(), meaning: meaning };
    }

    function getStrokesPreviewContentWidth() {
        const sec = document.getElementById('strokePreviewSection');
        if (!sec) return 640;
        const pr = sec.querySelector('.print-root');
        const w = pr ? pr.clientWidth : sec.clientWidth;
        return Math.max(200, w - 8);
    }

    function appendTianZiGeOverlay(host) {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'tian-zi-ge-overlay');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        const strokeColor = 'rgba(45, 55, 72, 0.13)';
        const sw = 0.55;
        function addLine(x1, y1, x2, y2) {
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', String(sw));
            svg.appendChild(line);
        }
        addLine(0, 50, 100, 50);
        addLine(50, 0, 50, 100);
        addLine(0, 0, 100, 100);
        addLine(100, 0, 0, 100);
        host.insertBefore(svg, host.firstChild);
    }

    function debounce(fn, ms) {
        let tid;
        return function () {
            const ctx = this;
            const args = arguments;
            clearTimeout(tid);
            tid = setTimeout(function () {
                fn.apply(ctx, args);
            }, ms);
        };
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

    function renderStrokeSvg(strokes, size, padding) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.setAttribute('overflow', 'visible');
        svg.classList.add('stroke-step-svg-el');

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (typeof HanziWriter !== 'undefined' && HanziWriter.getScalingTransform) {
            const transformData = HanziWriter.getScalingTransform(size, size, padding);
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

    function appendStrokeStepCell(
        parent,
        charData,
        strokeEndIndex,
        stepSize,
        padding,
        showStepNumbers,
        stepNumberLabel
    ) {
        const wrap = document.createElement('div');
        wrap.className =
            'stroke-step-wrap' + (showStepNumbers ? '' : ' stroke-step-wrap--no-num');

        const step = document.createElement('div');
        step.className = 'stroke-step';
        appendTianZiGeOverlay(step);

        const inner = document.createElement('div');
        inner.className = 'stroke-step-inner';
        const svgBox = document.createElement('div');
        svgBox.className = 'stroke-step-svg-wrap';
        const portion = charData.strokes.slice(0, strokeEndIndex + 1);
        svgBox.appendChild(renderStrokeSvg(portion, stepSize, padding));
        inner.appendChild(svgBox);
        step.appendChild(inner);
        wrap.appendChild(step);

        const num = document.createElement('span');
        num.className = 'stroke-step-num';
        num.textContent = showStepNumbers ? String(stepNumberLabel) : '\u00a0';
        wrap.appendChild(num);

        parent.appendChild(wrap);
    }

    function appendEmptyStrokeCell(parent) {
        const wrap = document.createElement('div');
        wrap.className = 'stroke-step-wrap stroke-step-wrap--no-num';
        const step = document.createElement('div');
        step.className = 'stroke-step stroke-step--empty';
        appendTianZiGeOverlay(step);
        const inner = document.createElement('div');
        inner.className = 'stroke-step-inner';
        step.appendChild(inner);
        wrap.appendChild(step);
        const num = document.createElement('span');
        num.className = 'stroke-step-num';
        num.textContent = '\u00a0';
        wrap.appendChild(num);
        parent.appendChild(wrap);
    }

    function appendStepsGridForCharacter(
        parent,
        charData,
        cols,
        stepSize,
        padding,
        showStepNumbers,
        practiceEnabled,
        practiceRowCount,
        totalStepsRef
    ) {
        const section = document.createElement('div');
        section.className = 'stroke-character-section';

        const stepsWrap = document.createElement('div');
        stepsWrap.className = 'stroke-steps';
        stepsWrap.style.setProperty('--stroke-grid-cols', String(cols));

        const n = charData.strokes.length;
        const stepRows = Math.ceil(n / cols);

        const items = [];
        for (let i = 0; i < n; i++) {
            items.push({ type: 'step', strokeIndex: i });
        }
        const rem = n % cols;
        if (rem !== 0) {
            for (let k = 0; k < cols - rem; k++) {
                items.push({ type: 'empty' });
            }
        }
        if (practiceEnabled) {
            const practiceFullRowCount = practiceRowCount * stepRows;
            for (let r = 0; r < practiceFullRowCount; r++) {
                for (let c = 0; c < cols; c++) {
                    items.push({ type: 'empty' });
                }
            }
        }

        items.forEach(function (item) {
            if (item.type === 'step') {
                appendStrokeStepCell(
                    stepsWrap,
                    charData,
                    item.strokeIndex,
                    stepSize,
                    padding,
                    showStepNumbers,
                    item.strokeIndex + 1
                );
                totalStepsRef.n += 1;
            } else {
                appendEmptyStrokeCell(stepsWrap);
            }
        });

        section.appendChild(stepsWrap);
        parent.appendChild(section);
    }

    async function runBuild() {
        hideWarning();
        printRoot.innerHTML = '';

        if (typeof HanziWriter === 'undefined' || typeof HanziWriter.getScalingTransform !== 'function') {
            showWarning(t('strokes.warnNoHw'));
            statsEl.textContent = t('strokes.statsUnavailable');
            return;
        }

        const cards = parseCards(wordInput.value);
        if (cards.length === 0) {
            showWarning(t('strokes.warnEmpty'));
            statsEl.textContent = t('strokes.statsNone');
            return;
        }

        const chars = extractHanziSequence(cards);
        if (chars.length === 0) {
            showWarning(t('strokes.warnNoHanzi'));
            statsEl.textContent = t('strokes.statsNoHanzi');
            return;
        }

        const hasQuestion = buildPinyinList(cards, chars).some((p) => p === '?');
        const noLib = !getPinyinFn();
        const warnParts = [];
        if (hasQuestion && noLib) {
            warnParts.push(t('strokes.warnPinyin'));
        }

        const cols = Math.min(24, Math.max(2, parseInt(gridColsInput.value, 10) || 10));
        if (gridColsInput) gridColsInput.value = String(cols);

        const gap = 10;
        const usable = getStrokesPreviewContentWidth() - gap * (cols - 1);
        let stepSize = Math.floor(usable / cols) - 3;
        stepSize = Math.min(200, Math.max(32, stepSize));
        const padding = Math.max(1, Math.round(stepSize * 0.04));

        const showMeta = showMetaCheck && showMetaCheck.checked;
        const showStepNumbers = showStepNumbersCheck && showStepNumbersCheck.checked;
        const practiceEnabled = practiceRowsCheck && practiceRowsCheck.checked;
        const practiceRowCount = Math.min(
            12,
            Math.max(1, parseInt(practiceRowsCountInput && practiceRowsCountInput.value, 10) || 2)
        );
        if (practiceRowsCountInput && practiceEnabled) {
            practiceRowsCountInput.value = String(practiceRowCount);
        }

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
            const failedUnique = [...new Set(failed)];
            const sample = failedUnique.slice(0, 8).join(' ');
            warnParts.push(
                t('strokes.warnFailed', {
                    n: failedUnique.length,
                    sample: sample,
                    more: failedUnique.length > 8 ? t('strokes.warnMore') : ''
                })
            );
        }
        if (warnParts.length) {
            showWarning(warnParts.join(' '));
        }

        const totalStepsRef = { n: 0 };
        const frag = document.createDocumentFragment();

        cards.forEach(function (card) {
            const wordChars = [];
            for (const ch of card.word) {
                if (isCjkChar(ch)) wordChars.push(ch);
            }
            if (wordChars.length === 0) return;

            const block = document.createElement('div');
            block.className = 'stroke-char-block';

            const head = document.createElement('div');
            head.className = 'stroke-char-head';

            const title = document.createElement('span');
            title.className = 'stroke-char-title-glyph';
            title.textContent = wordChars.join('');
            head.appendChild(title);

            if (showMeta) {
                const meta = formatWordMeta(card);
                if (meta.pinyin || meta.meaning) {
                    const metaEl = document.createElement('span');
                    metaEl.className = 'stroke-char-title-meta';
                    if (meta.pinyin) {
                        const pEl = document.createElement('span');
                        pEl.className = 'stroke-char-title-pinyin';
                        pEl.textContent = meta.pinyin;
                        metaEl.appendChild(pEl);
                    }
                    if (meta.meaning) {
                        if (meta.pinyin) {
                            const sep = document.createElement('span');
                            sep.className = 'stroke-char-title-sep';
                            sep.textContent = ' · ';
                            metaEl.appendChild(sep);
                        }
                        const mEl = document.createElement('span');
                        mEl.className = 'stroke-char-title-meaning';
                        mEl.textContent = meta.meaning;
                        metaEl.appendChild(mEl);
                    }
                    head.appendChild(metaEl);
                }
            }

            const missing = wordChars.filter(function (ch) {
                const d = dataMap.get(ch);
                return !d || !d.strokes || !d.strokes.length;
            });
            if (missing.length > 0) {
                const miss = document.createElement('div');
                miss.className = 'stroke-char-missing';
                miss.textContent = t('strokes.missingData') + ': ' + missing.join(' ');
                block.appendChild(head);
                block.appendChild(miss);
                frag.appendChild(block);
                return;
            }

            const body = document.createElement('div');
            body.className = 'stroke-word-body';

            for (let ci = 0; ci < wordChars.length; ci++) {
                const ch = wordChars[ci];
                const charData = dataMap.get(ch);
                appendStepsGridForCharacter(
                    body,
                    charData,
                    cols,
                    stepSize,
                    padding,
                    showStepNumbers,
                    practiceEnabled,
                    practiceRowCount,
                    totalStepsRef
                );
            }

            block.appendChild(head);
            block.appendChild(body);
            frag.appendChild(block);
        });

        printRoot.appendChild(frag);

        const okChars = chars.filter(function (ch) {
            const d = dataMap.get(ch);
            return d && d.strokes && d.strokes.length > 0;
        }).length;

        statsEl.textContent = t('strokes.statsLine', {
            ok: okChars,
            total: chars.length,
            steps: totalStepsRef.n
        });
    }

    function exportCsv() {
        const raw = wordInput.value;
        if (!raw.trim()) {
            alert(t('strokes.exportEmpty'));
            return;
        }
        var filename = 'words.csv';
        if (window.WordcardsCsvWordlists && WordcardsCsvWordlists.getExportFilename) {
            filename = WordcardsCsvWordlists.getExportFilename();
        }
        const blob = new Blob(['\ufeff' + raw], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
            wordInput.dispatchEvent(new Event('input', { bubbles: true }));
            try {
                localStorage.setItem(STORAGE_KEY, wordInput.value);
            } catch (_) {}
            await runBuild();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.addEventListener('wordcards:locale-changed', async function () {
        if (window.I18N) {
            I18N.applyStaticTranslations();
        }
        if (wordInput.value.trim()) {
            await runBuild();
        } else {
            statsEl.textContent = t('strokes.statsNone');
        }
    });

    const strokeWordListWrap = document.getElementById('strokeWordListWrap');
    const strokeToggleWordList = document.getElementById('strokeToggleWordList');
    if (wordInput) {
        wordInput.addEventListener('wordcards:preset-loaded', async function () {
            try {
                localStorage.setItem(STORAGE_KEY, wordInput.value);
            } catch (_) {}
            await runBuild();
        });
    }
    if (window.WordcardsCsvWordlists) {
        WordcardsCsvWordlists.initWordListToggle(strokeToggleWordList, strokeWordListWrap);
    }

    function syncPracticeFieldVisibility() {
        if (!practiceCountField) return;
        practiceCountField.classList.toggle(
            'hidden',
            !(practiceRowsCheck && practiceRowsCheck.checked)
        );
    }
    syncPracticeFieldVisibility();
    if (practiceRowsCheck) {
        practiceRowsCheck.addEventListener('change', syncPracticeFieldVisibility);
    }

    const debouncedStrokeBuild = debounce(function () {
        if (wordInput.value.trim()) {
            runBuild();
        }
    }, 400);

    if (wordInput) {
        wordInput.addEventListener('input', debouncedStrokeBuild);
    }

    [gridColsInput, showMetaCheck, showStepNumbersCheck, practiceRowsCheck, practiceRowsCountInput].forEach(
        function (el) {
            if (!el) return;
            el.addEventListener('change', function () {
                if (wordInput.value.trim()) {
                    runBuild();
                }
            });
        }
    );

    restoreInput();
    if (wordInput.value.trim()) {
        runBuild();
    }
})();
