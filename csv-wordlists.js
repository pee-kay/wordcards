(function (global) {
    'use strict';

    const MANIFEST_PATH = 'csv/csv-manifest.json';
    const CSV_DIR = 'csv/';

    /** Fallback when fetch(manifest) fails. Keep in sync with csv/csv-manifest.json. */
    const DEFAULT_MANIFEST = [
        '0.ключи.csv'
    ];

    /** If I18N is missing or returns the key, still show sensible UI (English). */
    const REPO_FALLBACK_EN = {
        'wordList.presetNone': '— Choose file —',
        'wordList.hide': 'Hide word list',
        'wordList.show': 'Show word list',
        'wordList.exportCsv': 'Export CSV',
        'wordList.importCsv': 'Import CSV',
        'wordList.loadFailed': 'Could not load that file.',
        'wordList.needsServer':
            'Preset CSV files must be loaded over HTTP. From the project folder run: python3 -m http.server then open http://127.0.0.1:8000/strokes.html (not file://).',
        'wordList.presetUnavailable': '(list unavailable)'
    };

    /** Split one CSV row; supports quoted fields and doubled quotes (RFC 4180-style). */
    function parseCsvLine(line) {
        const fields = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inQuotes) {
                if (c === '"') {
                    if (line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur += c;
                }
            } else if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                fields.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        fields.push(cur.trim());
        return fields;
    }

    function stemFilename(name) {
        return String(name).replace(/\.csv$/i, '');
    }

    function t(key) {
        if (global.I18N && I18N.t) {
            const v = I18N.t(key);
            if (v !== key) {
                return v;
            }
        }
        return REPO_FALLBACK_EN[key] || key;
    }

    function presetNoneLabel() {
        return t('wordList.presetNone');
    }

    function fillPresetSelect(select, list) {
        select.innerHTML = '';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = presetNoneLabel();
        select.appendChild(opt0);
        list.forEach(function (filename) {
            const o = document.createElement('option');
            o.value = filename;
            o.textContent = stemFilename(filename);
            select.appendChild(o);
        });
        select.disabled = false;
    }

    /**
     * @param {HTMLSelectElement} select
     * @param {HTMLTextAreaElement} textarea
     */
    function initCsvPresetSelect(select, textarea) {
        if (!select || !textarea) {
            return;
        }
        if (select.dataset.wordcardsCsvBound === '1') {
            return;
        }
        select.dataset.wordcardsCsvBound = '1';

        var lastPresetFilename = null;
        var lastPresetText = null;

        function clearPresetTracking() {
            lastPresetFilename = null;
            lastPresetText = null;
            delete select.dataset.activePreset;
        }

        function resetSelectToChoose() {
            clearPresetTracking();
            select.value = '';
        }

        function restorePresetSelectionIfPossible() {
            if (!lastPresetFilename) {
                return;
            }
            var found = false;
            var i;
            for (i = 0; i < select.options.length; i++) {
                if (select.options[i].value === lastPresetFilename) {
                    found = true;
                    break;
                }
            }
            if (found) {
                select.value = lastPresetFilename;
            } else {
                resetSelectToChoose();
            }
        }

        textarea.addEventListener('input', function () {
            if (lastPresetFilename === null) {
                return;
            }
            if (textarea.value !== lastPresetText) {
                resetSelectToChoose();
            }
        });

        /* HTML ships with only “— Choose file —” + 0.ключи; we replace after manifest fetch so a full list means csv-manifest.json loaded. */
        fetch(MANIFEST_PATH)
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('manifest');
                }
                return res.json();
            })
            .then(function (list) {
                if (!Array.isArray(list) || list.length === 0) {
                    throw new Error('bad manifest');
                }
                fillPresetSelect(select, list);
                const opt0 = select.options[0];
                if (opt0 && opt0.value === '') {
                    opt0.textContent = presetNoneLabel();
                }
                restorePresetSelectionIfPossible();
            })
            .catch(function (err) {
                console.warn('Wordcards CSV manifest (using embedded list):', err);
                fillPresetSelect(select, DEFAULT_MANIFEST);
                const opt0 = select.options[0];
                if (opt0 && opt0.value === '') {
                    opt0.textContent = presetNoneLabel();
                }
                restorePresetSelectionIfPossible();
            });

        global.document.addEventListener('wordcards:locale-changed', function () {
            const opt0 = select.options[0];
            if (opt0 && opt0.value === '') {
                opt0.textContent = presetNoneLabel();
            }
        });

        select.addEventListener('change', function () {
            const fn = select.value;
            if (!fn) {
                clearPresetTracking();
                return;
            }

            if (global.location.protocol === 'file:') {
                alert(t('wordList.needsServer'));
                resetSelectToChoose();
                return;
            }

            const url = CSV_DIR + encodeURIComponent(fn);
            fetch(url)
                .then(function (res) {
                    if (!res.ok) {
                        throw new Error('fetch');
                    }
                    return res.text();
                })
                .then(function (text) {
                    textarea.value = text;
                    lastPresetText = text;
                    lastPresetFilename = fn;
                    select.dataset.activePreset = fn;
                    select.value = fn;
                    textarea.dispatchEvent(
                        new CustomEvent('wordcards:preset-loaded', { bubbles: true })
                    );
                })
                .catch(function () {
                    alert(t('wordList.loadFailed'));
                    resetSelectToChoose();
                });
        });
    }

    function bootBoundPresetSelects() {
        document.querySelectorAll('select.word-list-csv-select[data-csv-textarea-id]').forEach(function (sel) {
            var tid = (sel.getAttribute('data-csv-textarea-id') || '').trim();
            if (!tid) {
                return;
            }
            var ta = document.getElementById(tid);
            if (!ta) {
                return;
            }
            initCsvPresetSelect(sel, ta);
        });
    }

    /**
     * @param {HTMLButtonElement} btn
     * @param {HTMLElement} wrap
     */
    function initWordListToggle(btn, wrap) {
        if (!btn || !wrap) {
            return;
        }

        let listHidden = false;

        function syncLabel() {
            btn.textContent = t(listHidden ? 'wordList.show' : 'wordList.hide');
            btn.setAttribute('aria-expanded', listHidden ? 'false' : 'true');
            wrap.classList.toggle('hidden', listHidden);
        }

        btn.addEventListener('click', function () {
            listHidden = !listHidden;
            syncLabel();
        });

        global.document.addEventListener('wordcards:locale-changed', syncLabel);
        syncLabel();
    }

    function getExportFilename() {
        var sel = document.querySelector('select.word-list-csv-select[data-active-preset]');
        if (sel) {
            return sel.dataset.activePreset;
        }
        return 'words.csv';
    }

    global.WordcardsCsvWordlists = {
        parseCsvLine: parseCsvLine,
        initCsvPresetSelect: initCsvPresetSelect,
        initWordListToggle: initWordListToggle,
        getExportFilename: getExportFilename
    };

    if (global.document) {
        if (global.document.readyState === 'loading') {
            global.document.addEventListener('DOMContentLoaded', bootBoundPresetSelects);
        } else {
            bootBoundPresetSelects();
        }

    }
})(typeof window !== 'undefined' ? window : this);
