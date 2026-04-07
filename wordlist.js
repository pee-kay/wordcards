(function () {
    'use strict';

    var MANIFEST_PATH = 'csv/csv-manifest.json';
    var CSV_DIR = 'csv/';
    var MAX_UNDO = 50;
    var STORAGE_KEY = 'wordcards_wl_rows';
    var GOOGLE_PINYIN_API = 'https://inputtools.google.com/request';

    var TONE_MARKS = {
        'a': ['\u0101', '\u00e1', '\u01ce', '\u00e0'],
        'e': ['\u0113', '\u00e9', '\u011b', '\u00e8'],
        'i': ['\u012b', '\u00ed', '\u01d0', '\u00ec'],
        'o': ['\u014d', '\u00f3', '\u01d2', '\u00f2'],
        'u': ['\u016b', '\u00fa', '\u01d4', '\u00f9'],
        '\u00fc': ['\u01d6', '\u01d8', '\u01da', '\u01dc']
    };

    // ── DOM refs ──
    var addInput = document.getElementById('wlAddInput');
    var undoBtn = document.getElementById('wlUndo');
    var redoBtn = document.getElementById('wlRedo');
    var sortBtn = document.getElementById('wlSort');
    var sortMenu = document.getElementById('wlSortMenu');
    var exportBtn = document.getElementById('wlExport');
    var importBtn = document.getElementById('wlImport');
    var copyBtn = document.getElementById('wlCopy');
    var pasteBtn = document.getElementById('wlPaste');
    var clearBtn = document.getElementById('wlClear');
    var fileInput = document.getElementById('wlFileInput');
    var statsEl = document.getElementById('wlStats');
    var tableBody = document.getElementById('wlTableBody');
    var wlTable = document.getElementById('wlTable');
    var thematicSelect = document.getElementById('wlThematicSelect');
    var thematicToggle = document.getElementById('wlThematicToggle');
    var thematicAddAll = document.getElementById('wlThematicAddAll');
    var thematicGrid = document.getElementById('wlThematicGrid');
    var suggestEl = document.getElementById('wlSuggest');
    var suggestTextEl = document.getElementById('wlSuggestText');
    var suggestAcceptBtn = document.getElementById('wlSuggestAccept');
    var suggestDismissBtn = document.getElementById('wlSuggestDismiss');
    var importDialog = document.getElementById('wlImportDialog');
    var importReplaceBtn = document.getElementById('wlImportReplace');
    var importAppendBtn = document.getElementById('wlImportAppend');
    var importCancelBtn = document.getElementById('wlImportCancel');
    var pinyinSuggestionsEl = document.getElementById('wlPinyinSuggestions');
    var autoTranslateCheckbox = document.getElementById('wlAutoTranslate');

    // ── State ──
    var rows = [];
    var undoStack = [];
    var redoStack = [];
    var thematicWordsHidden = false;
    var currentThematicRows = [];
    var _suggestAcceptFn = null;
    var _suggestTimer = null;
    var _suppressBlur = false;
    var _pinyinDebounce = null;
    var _cedictDict = null;
    var _cedictLoading = false;

    // ── Helpers ──
    function t(key, vars) {
        if (window.I18N && I18N.t) return I18N.t(key, vars);
        return key;
    }

    function getPinyin(text) {
        if (typeof pinyinPro === 'undefined' || !pinyinPro.pinyin) return '';
        return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g, function (m) {
            var arr = pinyinPro.pinyin(m, { toneType: 'symbol', type: 'array' });
            return arr.join('');
        });
    }

    function applyToneMark(syllable, tone) {
        if (tone < 1 || tone > 4) return syllable;
        var s = syllable.toLowerCase().replace(/v/g, '\u00fc');
        for (var i = 0; i < s.length; i++) {
            if (s[i] === 'a' || s[i] === 'e') {
                return s.substring(0, i) + TONE_MARKS[s[i]][tone - 1] + s.substring(i + 1);
            }
        }
        if (s.indexOf('ou') !== -1) {
            var idx = s.indexOf('ou');
            return s.substring(0, idx) + TONE_MARKS['o'][tone - 1] + s.substring(idx + 1);
        }
        for (var i = s.length - 1; i >= 0; i--) {
            if (TONE_MARKS[s[i]]) {
                return s.substring(0, i) + TONE_MARKS[s[i]][tone - 1] + s.substring(i + 1);
            }
        }
        return s;
    }

    function normalizePinyinInput(str) {
        var s = str.replace(/([1-4])([aeiou\u00fcv]*(ng|n(?![aeiou\u00fcv])|r(?![aeiou\u00fcv]))?)/gi, '$2$1');
        s = s.replace(/([a-zA-Z\u00fc])[05]/g, '$1');
        s = s.replace(/([a-zA-Z\u00fcv]+)([1-4])/g, function (m, syl, tone) {
            return applyToneMark(syl, parseInt(tone));
        });
        return s;
    }

    function stripToneMarks(str) {
        return str
            .replace(/[\u0101\u00e1\u01ce\u00e0]/g, 'a')
            .replace(/[\u0113\u00e9\u011b\u00e8]/g, 'e')
            .replace(/[\u012b\u00ed\u01d0\u00ec]/g, 'i')
            .replace(/[\u014d\u00f3\u01d2\u00f2]/g, 'o')
            .replace(/[\u016b\u00fa\u01d4\u00f9]/g, 'u')
            .replace(/[\u01d6\u01d8\u01da\u01dc]/g, '\u00fc');
    }

    function parseCsvLine(line) {
        if (window.WordcardsCsvWordlists && WordcardsCsvWordlists.parseCsvLine) {
            return WordcardsCsvWordlists.parseCsvLine(line);
        }
        return line.split(',').map(function (s) { return s.trim(); });
    }

    function escapeCsvField(val) {
        if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    }

    // ── Persistence ──
    function persistRows() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch (e) { /* quota */ }
    }

    function loadPersistedRows() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                var parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { /* corrupt */ }
        return [];
    }

    // ── Suggestion UI ──
    function showSuggestion(targetEl, text, onAccept) {
        if (!suggestEl || !suggestTextEl) return;
        clearTimeout(_suggestTimer);
        suggestTextEl.textContent = text;
        _suggestAcceptFn = onAccept;
        suggestEl.classList.remove('hidden');
        var rect = targetEl.getBoundingClientRect();
        suggestEl.style.top = (rect.bottom + 4) + 'px';
        suggestEl.style.left = rect.left + 'px';
    }

    function showSuggestionDelayed(targetEl, text, onAccept) {
        clearTimeout(_suggestTimer);
        _suggestTimer = setTimeout(function () {
            showSuggestion(targetEl, text, onAccept);
        }, 100);
    }

    function hideSuggestion() {
        clearTimeout(_suggestTimer);
        if (suggestEl) suggestEl.classList.add('hidden');
        _suggestAcceptFn = null;
    }

    // ── Import mode dialog ──
    var _importDialogCb = null;

    function askImportMode(callback) {
        if (rows.length === 0) { callback('replace'); return; }
        _importDialogCb = callback;
        if (importDialog) importDialog.classList.remove('hidden');
    }

    function closeImportDialog(mode) {
        if (importDialog) importDialog.classList.add('hidden');
        var cb = _importDialogCb;
        _importDialogCb = null;
        if (cb && mode) cb(mode);
    }

    // ── Undo / Redo ──
    function saveSnapshot() {
        undoStack.push(JSON.stringify(rows));
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
        syncUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length === 0) return;
        _suppressBlur = true;
        redoStack.push(JSON.stringify(rows));
        rows = JSON.parse(undoStack.pop());
        renderTable();
        syncUndoRedoButtons();
        _suppressBlur = false;
    }

    function redo() {
        if (redoStack.length === 0) return;
        _suppressBlur = true;
        undoStack.push(JSON.stringify(rows));
        rows = JSON.parse(redoStack.pop());
        renderTable();
        syncUndoRedoButtons();
        _suppressBlur = false;
    }

    function syncUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }

    // ── Render ──
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        var wordCounts = {};
        for (var i = 0; i < rows.length; i++) {
            var w = rows[i].word;
            if (w) wordCounts[w] = (wordCounts[w] || 0) + 1;
        }

        for (var i = 0; i < rows.length; i++) {
            var tr = document.createElement('tr');
            if (rows[i].word && wordCounts[rows[i].word] > 1) {
                tr.classList.add('wl-duplicate');
            }

            var tdNum = document.createElement('td');
            tdNum.textContent = i + 1;
            tr.appendChild(tdNum);

            tr.appendChild(makeInputCell(i, 'word'));
            tr.appendChild(makeInputCell(i, 'pinyin'));
            tr.appendChild(makeInputCell(i, 'translation'));

            var tdAct = document.createElement('td');
            tdAct.className = 'wl-actions';
            tdAct.appendChild(makeActionBtn('\u2191', moveRowUp, i));
            tdAct.appendChild(makeActionBtn('\u2193', moveRowDown, i));
            tdAct.appendChild(makeActionBtn('\u29C9', duplicateRow, i));
            tdAct.appendChild(makeActionBtn('\u2715', deleteRow, i));
            tr.appendChild(tdAct);

            tableBody.appendChild(tr);
        }

        updateStats();
        dimThematicWords();
        dimPinyinSuggestionWords();
        persistRows();
    }

    function makeInputCell(rowIdx, field) {
        var td = document.createElement('td');
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.value = rows[rowIdx][field];

        inp.addEventListener('focus', function () {
            this._prev = this.value;
        });

        inp.addEventListener('blur', (function (ri, f, inputEl) {
            return function () {
                if (_suppressBlur || ri >= rows.length) return;
                var val = this.value;
                if (val !== this._prev) {
                    saveSnapshot();
                    rows[ri][f] = val;
                    persistRows();
                    if (f === 'word') refreshDuplicateHighlighting();
                }
                if (f === 'word' && val && /[\u4e00-\u9fff]/.test(val)) {
                    var newPinyin = getPinyin(val);
                    if (newPinyin && newPinyin !== rows[ri].pinyin) {
                        var tr = inputEl.parentElement.parentElement;
                        var pinyinInput = tr.children[2] && tr.children[2].querySelector('input');
                        showSuggestionDelayed(pinyinInput || inputEl,
                            t('wl.suggestPinyin', { pinyin: newPinyin }),
                            function () {
                                saveSnapshot();
                                rows[ri].pinyin = newPinyin;
                                if (pinyinInput) pinyinInput.value = newPinyin;
                                persistRows();
                            });
                    }
                } else if (f === 'pinyin' && val) {
                    var normalized = normalizePinyinInput(val);
                    if (normalized !== val) {
                        showSuggestionDelayed(inputEl,
                            t('wl.suggestNormalize', { pinyin: normalized }),
                            function () {
                                saveSnapshot();
                                rows[ri].pinyin = normalized;
                                inputEl.value = normalized;
                                persistRows();
                            });
                    }
                }
            };
        })(rowIdx, field, inp));

        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
                var thisTd = this.parentElement;
                var tr = thisTd.parentElement;
                var colIdx = Array.prototype.indexOf.call(tr.children, thisTd);
                var nextTr = tr.nextElementSibling;
                if (nextTr) {
                    var nextInput = nextTr.children[colIdx] &&
                        nextTr.children[colIdx].querySelector('input');
                    if (nextInput) nextInput.focus();
                }
            }
        });

        td.appendChild(inp);
        return td;
    }

    function makeActionBtn(label, fn, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', function () { fn(idx); });
        return btn;
    }

    function updateStats() {
        if (!statsEl) return;
        if (rows.length === 0) {
            statsEl.textContent = t('wl.empty');
        } else {
            statsEl.textContent = t('wl.statsLine', { n: rows.length });
        }
    }

    function refreshDuplicateHighlighting() {
        if (!tableBody) return;
        var wordCounts = {};
        for (var i = 0; i < rows.length; i++) {
            var w = rows[i].word;
            if (w) wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
        var trs = tableBody.querySelectorAll('tr');
        for (var i = 0; i < trs.length; i++) {
            var isDup = rows[i] && rows[i].word && wordCounts[rows[i].word] > 1;
            trs[i].classList.toggle('wl-duplicate', !!isDup);
        }
    }

    // ── CC-CEDICT dictionary ──
    function isCedictEnabled() {
        return autoTranslateCheckbox && autoTranslateCheckbox.checked && _cedictDict;
    }

    function loadCedict() {
        if (_cedictDict || _cedictLoading) return;
        _cedictLoading = true;
        if (autoTranslateCheckbox) {
            autoTranslateCheckbox.nextElementSibling.textContent = t('wl.autoTranslateLoading');
        }
        fetch('dict/cedict-en.json')
            .then(function (r) {
                if (!r.ok) throw new Error('dict');
                return r.json();
            })
            .then(function (data) {
                _cedictDict = data;
                _cedictLoading = false;
                if (autoTranslateCheckbox) {
                    autoTranslateCheckbox.nextElementSibling.textContent = t('wl.autoTranslate');
                }
            })
            .catch(function () {
                _cedictLoading = false;
                if (autoTranslateCheckbox) {
                    autoTranslateCheckbox.checked = false;
                    autoTranslateCheckbox.nextElementSibling.textContent = t('wl.autoTranslate');
                }
            });
    }

    function cedictLookup(word) {
        if (!_cedictDict || !word) return '';
        return _cedictDict[word] || '';
    }

    // ── Row operations ──
    function addWordRow(word, pinyin, translation) {
        if (!translation && isCedictEnabled()) {
            translation = cedictLookup(word);
        }
        rows.push({ word: word || '', pinyin: pinyin || '', translation: translation || '' });
    }

    function deleteRow(idx) {
        saveSnapshot();
        rows.splice(idx, 1);
        renderTable();
    }

    function duplicateRow(idx) {
        saveSnapshot();
        var r = rows[idx];
        rows.splice(idx + 1, 0, { word: r.word, pinyin: r.pinyin, translation: r.translation });
        renderTable();
    }

    function moveRowUp(idx) {
        if (idx <= 0) return;
        saveSnapshot();
        var tmp = rows[idx];
        rows[idx] = rows[idx - 1];
        rows[idx - 1] = tmp;
        renderTable();
    }

    function moveRowDown(idx) {
        if (idx >= rows.length - 1) return;
        saveSnapshot();
        var tmp = rows[idx];
        rows[idx] = rows[idx + 1];
        rows[idx + 1] = tmp;
        renderTable();
    }

    function toggleSortMenu() {
        if (!sortMenu) return;
        sortMenu.classList.toggle('hidden');
    }

    function closeSortMenu() {
        if (sortMenu) sortMenu.classList.add('hidden');
    }

    function sortRows(mode) {
        if (rows.length === 0) return;
        saveSnapshot();
        switch (mode) {
        case 'pinyin':
            rows.sort(function (a, b) {
                return (a.pinyin || '').localeCompare(b.pinyin || '');
            });
            break;
        case 'translation':
            rows.sort(function (a, b) {
                return (a.translation || '').localeCompare(b.translation || '');
            });
            break;
        case 'radical':
            rows.sort(function (a, b) {
                var ca = (a.word || '').charCodeAt(0) || 0;
                var cb = (b.word || '').charCodeAt(0) || 0;
                if (ca !== cb) return ca - cb;
                return (a.word || '').localeCompare(b.word || '', 'zh');
            });
            break;
        default:
            rows.sort(function (a, b) {
                var la = a.word.length, lb = b.word.length;
                if (la !== lb) return la - lb;
                return a.word.localeCompare(b.word, 'zh');
            });
            break;
        }
        renderTable();
    }

    function clearAll() {
        if (rows.length === 0) return;
        if (!confirm(t('wl.confirmClear', { n: rows.length }))) return;
        saveSnapshot();
        rows = [];
        renderTable();
    }

    // ── Add words from input ──
    function addWordsFromInput() {
        if (!addInput) return;
        var text = addInput.value.trim();
        if (!text) return;

        var tokens = text.split(/[,，\s]+/).filter(function (s) { return s.length > 0; });
        var added = [];
        var kept = [];
        for (var i = 0; i < tokens.length; i++) {
            if (/[\u4e00-\u9fff]/.test(tokens[i]) && !/[a-zA-Z]/.test(tokens[i])) {
                added.push(tokens[i]);
            } else {
                kept.push(tokens[i]);
            }
        }
        if (added.length === 0) return;
        saveSnapshot();
        for (var i = 0; i < added.length; i++) {
            addWordRow(added[i], getPinyin(added[i]), '');
        }
        addInput.value = kept.join(', ');
        renderTable();
        updatePinyinSuggestions();
    }

    // ── CSV export / import ──
    function exportCsv() {
        if (rows.length === 0) return;
        var text = buildCsvText();
        var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wordlist.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function parseCsvText(text) {
        var lines = text.split(/\r?\n/);
        var result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var fields = parseCsvLine(line);
            result.push({ word: fields[0] || '', pinyin: fields[1] || '', translation: fields[2] || '' });
        }
        return result;
    }

    function applyImportedRows(newRows, mode) {
        if (newRows.length === 0) return;
        saveSnapshot();
        if (mode === 'replace') {
            rows = newRows;
        } else {
            rows = rows.concat(newRows);
        }
        renderTable();
    }

    function importCsv(file) {
        var reader = new FileReader();
        reader.onload = function () {
            var text = reader.result;
            var parsed = parseCsvText(text);
            if (parsed.length > 0) {
                askImportMode(function (mode) {
                    applyImportedRows(parsed, mode);
                });
            }
        };
        reader.readAsText(file);
    }

    function buildCsvText() {
        var lines = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            lines.push(
                escapeCsvField(r.word) + ',' +
                escapeCsvField(r.pinyin) + ',' +
                escapeCsvField(r.translation)
            );
        }
        return lines.join('\n');
    }

    function copyToClipboard() {
        if (rows.length === 0) return;
        var text = buildCsvText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        }
    }

    function loadFromClipboard() {
        if (!navigator.clipboard || !navigator.clipboard.readText) return;
        navigator.clipboard.readText().then(function (text) {
            if (!text || !text.trim()) return;
            var parsed = parseCsvText(text);
            if (parsed.length > 0) {
                askImportMode(function (mode) {
                    applyImportedRows(parsed, mode);
                });
            }
        });
    }

    // ── Pinyin input suggestions ──
    function onAddInputChanged() {
        clearTimeout(_pinyinDebounce);
        _pinyinDebounce = setTimeout(updatePinyinSuggestions, 300);
    }

    function classifyToken(token) {
        var hasHanzi = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(token);
        var hasLatin = /[a-zA-Z]/.test(token);
        if (hasHanzi && !hasLatin) return 'hanzi';
        if (hasLatin && !hasHanzi) return 'pinyin';
        if (hasHanzi && hasLatin) return 'mixed';
        return 'other';
    }

    function parseSegments(token) {
        var segments = [];
        var re = /([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)|([^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)/g;
        var m;
        while ((m = re.exec(token)) !== null) {
            if (m[1]) segments.push({ type: 'hanzi', text: m[1] });
            else if (m[2] && /[a-zA-Z]/.test(m[2])) segments.push({ type: 'pinyin', text: m[2] });
        }
        return segments;
    }

    function updatePinyinSuggestions() {
        if (!pinyinSuggestionsEl || !addInput) return;
        var text = addInput.value.trim();
        if (!text) { pinyinSuggestionsEl.innerHTML = ''; return; }

        var tokens = text.split(/[,，]/).map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });

        if (tokens.length === 0) { pinyinSuggestionsEl.innerHTML = ''; return; }

        pinyinSuggestionsEl.innerHTML = '';
        for (var i = 0; i < tokens.length; i++) {
            var placeholder = document.createElement('div');
            placeholder.className = 'wl-pinyin-row';
            placeholder.dataset.token = tokens[i];
            pinyinSuggestionsEl.appendChild(placeholder);

            var type = classifyToken(tokens[i]);
            if (type === 'hanzi') {
                renderChineseRow(tokens[i], placeholder);
            } else if (type === 'pinyin') {
                fetchPinyinCandidates(tokens[i], placeholder);
            } else if (type === 'mixed') {
                fetchMixedCandidates(tokens[i], placeholder);
            }
        }
    }

    function renderChineseRow(token, placeholder) {
        var words = token.split(/\s+/).filter(function (s) { return s.length > 0; });
        if (words.length === 0) return;
        fillPinyinRow(placeholder, token, words);
    }

    function preparePinyinQuery(token) {
        var normalized = normalizePinyinInput(token);
        var base = stripToneMarks(normalized).toLowerCase();
        return { base: base, normalized: normalized, hasTones: normalized !== base };
    }

    function fetchPinyinCandidates(token, placeholder) {
        var q = preparePinyinQuery(token);
        if (!q.base) return;

        var url = GOOGLE_PINYIN_API +
            '?text=' + encodeURIComponent(q.base) +
            '&itc=zh-t-i0-pinyin&num=13&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test';

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) return;
                var candidates = data[1][0][1] || [];

                if (q.hasTones && candidates.length > 0) {
                    candidates = filterByTones(candidates, q.normalized);
                }

                fillPinyinRow(placeholder, token, candidates.slice(0, 10));
            })
            .catch(function () { /* network */ });
    }

    function fetchMixedCandidates(token, placeholder) {
        var segments = parseSegments(token);
        if (segments.length === 0) return;

        var pinyinParts = [];
        var hasPinyinTones = false;
        for (var i = 0; i < segments.length; i++) {
            if (segments[i].type === 'hanzi') {
                var hp = getPinyin(segments[i].text);
                pinyinParts.push(stripToneMarks(hp).toLowerCase());
            } else {
                var norm = normalizePinyinInput(segments[i].text);
                if (norm !== stripToneMarks(norm)) hasPinyinTones = true;
                pinyinParts.push(stripToneMarks(norm).toLowerCase());
            }
        }
        var baseQuery = pinyinParts.join('');
        if (!baseQuery) return;

        var expectedToned = '';
        if (hasPinyinTones) {
            var tonedParts = [];
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].type === 'hanzi') {
                    tonedParts.push(getPinyin(segments[i].text));
                } else {
                    tonedParts.push(normalizePinyinInput(segments[i].text));
                }
            }
            expectedToned = tonedParts.join('');
        }

        var url = GOOGLE_PINYIN_API +
            '?text=' + encodeURIComponent(baseQuery) +
            '&itc=zh-t-i0-pinyin&num=20&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test';

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) return;
                var candidates = data[1][0][1] || [];

                var filtered = [];
                for (var i = 0; i < candidates.length; i++) {
                    if (!matchesMixedTemplate(candidates[i], segments)) continue;
                    if (hasPinyinTones && getPinyin(candidates[i]) !== expectedToned) continue;
                    filtered.push(candidates[i]);
                }

                fillPinyinRow(placeholder, token, filtered.slice(0, 10));
            })
            .catch(function () { /* network */ });
    }

    function matchesMixedTemplate(candidate, segments) {
        return _tryMatch(candidate, 0, segments, 0);
    }

    function _tryMatch(candidate, ci, segments, si) {
        if (si >= segments.length) return ci === candidate.length;
        var seg = segments[si];
        if (seg.type === 'hanzi') {
            for (var j = 0; j < seg.text.length; j++) {
                if (ci + j >= candidate.length || candidate[ci + j] !== seg.text[j]) return false;
            }
            return _tryMatch(candidate, ci + seg.text.length, segments, si + 1);
        }
        for (var len = 1; ci + len <= candidate.length; len++) {
            if (_tryMatch(candidate, ci + len, segments, si + 1)) return true;
        }
        return false;
    }

    function filterByTones(candidates, normalizedInput) {
        var result = [];
        for (var i = 0; i < candidates.length; i++) {
            var candidatePinyin = getPinyin(candidates[i]);
            if (candidatePinyin === normalizedInput) {
                result.push(candidates[i]);
            }
        }
        return result;
    }

    function fillPinyinRow(row, label, candidates) {
        if (!row || candidates.length === 0) {
            if (row && row.parentNode) row.parentNode.removeChild(row);
            return;
        }

        row.innerHTML = '';

        var lbl = document.createElement('span');
        lbl.className = 'wl-pinyin-row-label';
        lbl.textContent = label + ':';
        row.appendChild(lbl);

        var wordsInTable = buildWordSet();

        for (var i = 0; i < candidates.length; i++) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wl-thematic-word';
            btn.textContent = candidates[i];
            if (wordsInTable[candidates[i]]) btn.classList.add('wl-in-table');
            btn.addEventListener('click', (function (word) {
                return function () {
                    saveSnapshot();
                    addWordRow(word, getPinyin(word), '');
                    renderTable();
                    dimPinyinSuggestionWords();
                };
            })(candidates[i]));
            row.appendChild(btn);
        }
    }

    function dimPinyinSuggestionWords() {
        if (!pinyinSuggestionsEl) return;
        var wordsInTable = buildWordSet();
        var btns = pinyinSuggestionsEl.querySelectorAll('.wl-thematic-word');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('wl-in-table', !!wordsInTable[btns[i].textContent]);
        }
    }

    // ── Thematic list picker ──
    function loadManifest() {
        if (!thematicSelect) return;
        fetch(MANIFEST_PATH)
            .then(function (r) {
                if (!r.ok) throw new Error('manifest');
                return r.json();
            })
            .then(function (list) {
                if (!Array.isArray(list)) throw new Error('bad');
                fillThematicSelect(list);
            })
            .catch(function () {
                fillThematicSelect(['0.ключи.csv']);
            });
    }

    function fillThematicSelect(list) {
        if (!thematicSelect) return;
        thematicSelect.innerHTML = '';
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = t('wl.thematicSelect');
        thematicSelect.appendChild(opt0);

        for (var i = 0; i < list.length; i++) {
            var o = document.createElement('option');
            o.value = list[i];
            o.textContent = String(list[i]).replace(/\.csv$/i, '');
            thematicSelect.appendChild(o);
        }
    }

    function loadThematicList(filename) {
        currentThematicRows = [];
        if (!thematicGrid) return;
        thematicGrid.innerHTML = '';

        if (!filename) {
            thematicGrid.classList.add('hidden');
            if (thematicToggle) thematicToggle.classList.add('hidden');
            if (thematicAddAll) thematicAddAll.classList.add('hidden');
            return;
        }

        fetch(CSV_DIR + encodeURIComponent(filename))
            .then(function (r) {
                if (!r.ok) throw new Error('fetch');
                return r.text();
            })
            .then(function (text) {
                var lines = text.split(/\r?\n/);
                var parsed = [];
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (!line) continue;
                    var f = parseCsvLine(line);
                    parsed.push({ word: f[0] || '', pinyin: f[1] || '', translation: f[2] || '' });
                }
                currentThematicRows = parsed;
                renderThematicGrid();
                thematicWordsHidden = false;
                thematicGrid.classList.remove('hidden');
                if (thematicToggle) {
                    thematicToggle.classList.remove('hidden');
                    thematicToggle.textContent = t('wl.thematicHide');
                }
                if (thematicAddAll) thematicAddAll.classList.remove('hidden');
            })
            .catch(function () {
                currentThematicRows = [];
                thematicGrid.classList.add('hidden');
                if (thematicToggle) thematicToggle.classList.add('hidden');
                if (thematicAddAll) thematicAddAll.classList.add('hidden');
            });
    }

    function renderThematicGrid() {
        if (!thematicGrid) return;
        thematicGrid.innerHTML = '';
        var wordsInTable = buildWordSet();

        for (var i = 0; i < currentThematicRows.length; i++) {
            var r = currentThematicRows[i];
            if (!r.word) continue;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wl-thematic-word';
            btn.textContent = r.word;
            if (wordsInTable[r.word]) btn.classList.add('wl-in-table');
            btn.addEventListener('click', (function (row) {
                return function () {
                    saveSnapshot();
                    addWordRow(row.word, row.pinyin, row.translation);
                    renderTable();
                };
            })(r));
            thematicGrid.appendChild(btn);
        }
    }

    function dimThematicWords() {
        if (!thematicGrid) return;
        var wordsInTable = buildWordSet();
        var btns = thematicGrid.querySelectorAll('.wl-thematic-word');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('wl-in-table', !!wordsInTable[btns[i].textContent]);
        }
    }

    function buildWordSet() {
        var s = {};
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].word) s[rows[i].word] = true;
        }
        return s;
    }

    function toggleThematicGrid() {
        if (!thematicGrid || !thematicToggle) return;
        thematicWordsHidden = !thematicWordsHidden;
        thematicGrid.classList.toggle('hidden', thematicWordsHidden);
        thematicToggle.textContent = t(thematicWordsHidden ? 'wl.thematicShow' : 'wl.thematicHide');
    }

    function addAllThematic() {
        if (currentThematicRows.length === 0) return;
        saveSnapshot();
        for (var i = 0; i < currentThematicRows.length; i++) {
            var r = currentThematicRows[i];
            if (r.word) addWordRow(r.word, r.pinyin, r.translation);
        }
        renderTable();
    }

    // ── Init ──
    function init() {
        rows = loadPersistedRows();

        if (addInput) {
            addInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); addWordsFromInput(); }
            });
            addInput.addEventListener('input', onAddInputChanged);
        }

        if (autoTranslateCheckbox) {
            autoTranslateCheckbox.addEventListener('change', function () {
                if (autoTranslateCheckbox.checked) loadCedict();
            });
        }

        if (undoBtn) undoBtn.addEventListener('click', undo);
        if (redoBtn) redoBtn.addEventListener('click', redo);
        if (sortBtn) sortBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleSortMenu();
        });
        if (sortMenu) sortMenu.addEventListener('click', function (e) {
            var target = e.target;
            if (target.tagName === 'BUTTON' && target.dataset.sort) {
                closeSortMenu();
                sortRows(target.dataset.sort);
            }
        });
        if (exportBtn) exportBtn.addEventListener('click', exportCsv);
        if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
        if (pasteBtn) pasteBtn.addEventListener('click', loadFromClipboard);
        if (clearBtn) clearBtn.addEventListener('click', clearAll);

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () {
                if (fileInput.files && fileInput.files[0]) {
                    importCsv(fileInput.files[0]);
                    fileInput.value = '';
                }
            });
        }

        if (thematicSelect) {
            thematicSelect.addEventListener('change', function () {
                loadThematicList(thematicSelect.value);
            });
        }
        if (thematicToggle) thematicToggle.addEventListener('click', toggleThematicGrid);
        if (thematicAddAll) thematicAddAll.addEventListener('click', addAllThematic);

        if (suggestAcceptBtn) suggestAcceptBtn.addEventListener('click', function () {
            if (_suggestAcceptFn) _suggestAcceptFn();
            hideSuggestion();
        });
        if (suggestDismissBtn) suggestDismissBtn.addEventListener('click', hideSuggestion);

        if (importReplaceBtn) importReplaceBtn.addEventListener('click', function () { closeImportDialog('replace'); });
        if (importAppendBtn) importAppendBtn.addEventListener('click', function () { closeImportDialog('append'); });
        if (importCancelBtn) importCancelBtn.addEventListener('click', function () { closeImportDialog(null); });

        if (wlTable) {
            wlTable.addEventListener('input', hideSuggestion);
        }

        document.addEventListener('mousedown', function (e) {
            if (suggestEl && !suggestEl.classList.contains('hidden') && !suggestEl.contains(e.target)) {
                hideSuggestion();
            }
            var sortWrap = sortBtn && sortBtn.parentElement;
            if (sortMenu && !sortMenu.classList.contains('hidden') &&
                sortWrap && !sortWrap.contains(e.target)) {
                closeSortMenu();
            }
        });

        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        });

        document.addEventListener('wordcards:locale-changed', function () {
            updateStats();
            if (thematicToggle && !thematicToggle.classList.contains('hidden')) {
                thematicToggle.textContent = t(thematicWordsHidden ? 'wl.thematicShow' : 'wl.thematicHide');
            }
            var opt0 = thematicSelect && thematicSelect.options[0];
            if (opt0 && opt0.value === '') opt0.textContent = t('wl.thematicSelect');
        });

        loadManifest();
        syncUndoRedoButtons();
        renderTable();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
