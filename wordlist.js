(function () {
    'use strict';

    var MANIFEST_PATH = 'csv/csv-manifest.json';
    var CSV_DIR = 'csv/';
    var MAX_UNDO = 50;

    // ── DOM refs ──
    var addInput = document.getElementById('wlAddInput');
    var addBtn = document.getElementById('wlAddBtn');
    var undoBtn = document.getElementById('wlUndo');
    var redoBtn = document.getElementById('wlRedo');
    var sortBtn = document.getElementById('wlSort');
    var dedupBtn = document.getElementById('wlDedup');
    var exportBtn = document.getElementById('wlExport');
    var importBtn = document.getElementById('wlImport');
    var clearBtn = document.getElementById('wlClear');
    var fileInput = document.getElementById('wlFileInput');
    var statsEl = document.getElementById('wlStats');
    var tableBody = document.getElementById('wlTableBody');
    var thematicSelect = document.getElementById('wlThematicSelect');
    var thematicToggle = document.getElementById('wlThematicToggle');
    var thematicAddAll = document.getElementById('wlThematicAddAll');
    var thematicGrid = document.getElementById('wlThematicGrid');

    // ── State ──
    var rows = [];
    var undoStack = [];
    var redoStack = [];
    var thematicWordsHidden = false;
    var currentThematicRows = [];

    // ── Helpers ──
    function t(key, vars) {
        if (window.I18N && I18N.t) return I18N.t(key, vars);
        return key;
    }

    function getPinyin(text) {
        if (typeof pinyinPro !== 'undefined' && pinyinPro.pinyin) {
            return pinyinPro.pinyin(text, { toneType: 'symbol', type: 'string' }).trim();
        }
        return '';
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

    // ── Undo / Redo ──
    function saveSnapshot() {
        undoStack.push(JSON.stringify(rows));
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
        syncUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.stringify(rows));
        rows = JSON.parse(undoStack.pop());
        renderTable();
        syncUndoRedoButtons();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.stringify(rows));
        rows = JSON.parse(redoStack.pop());
        renderTable();
        syncUndoRedoButtons();
    }

    function syncUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }

    // ── Render ──
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        for (var i = 0; i < rows.length; i++) {
            var tr = document.createElement('tr');

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
    }

    function makeInputCell(rowIdx, field) {
        var td = document.createElement('td');
        var input = document.createElement('input');
        input.type = 'text';
        input.value = rows[rowIdx][field];
        input.addEventListener('focus', function () {
            this._prev = this.value;
        });
        input.addEventListener('blur', (function (ri, f) {
            return function () {
                if (this.value !== this._prev) {
                    saveSnapshot();
                    rows[ri][f] = this.value;
                }
            };
        })(rowIdx, field));
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
        });
        td.appendChild(input);
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

    // ── Row operations ──
    function addWordRow(word, pinyin, translation) {
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

    function sortRows() {
        if (rows.length === 0) return;
        saveSnapshot();
        rows.sort(function (a, b) {
            var la = a.word.length, lb = b.word.length;
            if (la !== lb) return la - lb;
            return a.word.localeCompare(b.word, 'zh');
        });
        renderTable();
    }

    function deduplicateRows() {
        if (rows.length === 0) return;
        var seen = {};
        var filtered = [];
        for (var i = 0; i < rows.length; i++) {
            if (!seen[rows[i].word]) {
                seen[rows[i].word] = true;
                filtered.push(rows[i]);
            }
        }
        var removed = rows.length - filtered.length;
        if (removed === 0) {
            alert(t('wl.dedupNone'));
            return;
        }
        saveSnapshot();
        rows = filtered;
        renderTable();
        alert(t('wl.dedupResult', { n: removed }));
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
        if (tokens.length === 0) return;

        saveSnapshot();
        for (var i = 0; i < tokens.length; i++) {
            var w = tokens[i];
            addWordRow(w, getPinyin(w), '');
        }
        addInput.value = '';
        renderTable();
    }

    // ── CSV export / import ──
    function exportCsv() {
        if (rows.length === 0) return;
        var lines = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            lines.push(
                escapeCsvField(r.word) + ',' +
                escapeCsvField(r.pinyin) + ',' +
                escapeCsvField(r.translation)
            );
        }
        var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wordlist.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importCsv(file) {
        var reader = new FileReader();
        reader.onload = function () {
            var text = reader.result;
            var lines = text.split(/\r?\n/);
            var newRows = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var fields = parseCsvLine(line);
                newRows.push({
                    word: fields[0] || '',
                    pinyin: fields[1] || '',
                    translation: fields[2] || ''
                });
            }
            if (newRows.length > 0) {
                saveSnapshot();
                rows = rows.concat(newRows);
                renderTable();
            }
        };
        reader.readAsText(file);
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
        if (addBtn) addBtn.addEventListener('click', addWordsFromInput);
        if (addInput) addInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); addWordsFromInput(); }
        });

        if (undoBtn) undoBtn.addEventListener('click', undo);
        if (redoBtn) redoBtn.addEventListener('click', redo);
        if (sortBtn) sortBtn.addEventListener('click', sortRows);
        if (dedupBtn) dedupBtn.addEventListener('click', deduplicateRows);
        if (exportBtn) exportBtn.addEventListener('click', exportCsv);
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
        updateStats();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
