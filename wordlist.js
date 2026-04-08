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

    /** Toneless Hanyu Pinyin syllables (pinyin-data Unihan), for “pinyin vs translation” filter classification */
    var THEMATIC_PINYIN_SYLLABLES_CSV = "a,ai,an,ang,ao,ba,bai,ban,bang,bao,bei,ben,beng,bi,bian,biang,biao,bie,bin,bing,bo,bu,ca,cai,can,cang,cao,ce,cei,cen,ceng,cha,chai,chan,chang,chao,che,chen,cheng,chi,chong,chou,chu,chua,chuai,chuan,chuang,chui,chun,chuo,ci,cong,cou,cu,cuan,cui,cun,cuo,da,dai,dan,dang,dao,de,dei,den,deng,di,dia,dian,diao,die,din,ding,diu,dong,dou,du,duan,dui,dun,duo,e,ei,en,eng,er,fa,fan,fang,fei,fen,feng,fiao,fo,fou,fu,g,ga,gai,gan,gang,gao,ge,gei,gen,geng,gong,gou,gu,gua,guai,guan,guang,gui,gun,guo,ha,hai,han,hang,hao,he,hei,hen,heng,hm,hng,hong,hou,hu,hua,huai,huan,huang,hui,hun,huo,ji,jia,jian,jiang,jiao,jie,jin,jing,jiong,jiu,ju,juan,jue,jun,ka,kai,kan,kang,kao,ke,kei,ken,keng,kong,kou,ku,kua,kuai,kuan,kuang,kui,kun,kuo,la,lai,lan,lang,lao,le,lei,len,leng,li,lia,lian,liang,liao,lie,lin,ling,lio,liu,lo,long,lou,lu,luan,lun,luo,lü,lüe,m,ma,mai,man,mang,mao,me,mei,men,meng,mi,mian,miao,mie,min,ming,miu,mo,mou,mu,n,na,nai,nan,nang,nao,ne,nei,nen,neng,ng,ni,nia,nian,niang,niao,nie,nin,ning,niu,nong,nou,nu,nuan,nun,nuo,nü,nüe,o,ou,pa,pai,pan,pang,pao,pei,pen,peng,pi,pian,piao,pie,pin,ping,po,pou,pu,qi,qia,qian,qiang,qiao,qie,qin,qing,qiong,qiu,qu,quan,que,qun,ran,rang,rao,re,ren,reng,ri,rong,rou,ru,rua,ruan,rui,run,ruo,sa,sai,san,sang,sao,se,sen,seng,sha,shai,shan,shang,shao,she,shei,shen,sheng,shi,shou,shu,shua,shuai,shuan,shuang,shui,shun,shuo,si,song,sou,su,suan,sui,sun,suo,ta,tai,tan,tang,tao,te,tei,teng,ti,tian,tiao,tie,ting,tong,tou,tu,tuan,tui,tun,tuo,wa,wai,wan,wang,wei,wen,weng,wo,wong,wu,xi,xia,xian,xiang,xiao,xie,xin,xing,xiong,xiu,xu,xuan,xue,xun,ya,yan,yang,yao,ye,yi,yin,ying,yo,yong,you,yu,yuan,yue,yun,za,zai,zan,zang,zao,ze,zei,zen,zeng,zha,zhai,zhan,zhang,zhao,zhe,zhei,zhen,zheng,zhi,zhong,zhou,zhu,zhua,zhuai,zhuan,zhuang,zhui,zhun,zhuo,zi,zong,zou,zu,zuan,zui,zun,zuo";

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
    var thematicFilterInput = document.getElementById('wlThematicFilter');
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

    /** Incremental pinyin suggestions: avoid clearing rows when comma-separated token unchanged */
    var _wlSuggestReqCounter = 0;
    var WL_PINYIN_SLOT_COUNT = 10;
    /** Max suggestions shown: fixed slots + extras appended after them */
    var WL_PINYIN_MAX_SUGGEST = 20;

    function wlPinyinRowClickHandler(e) {
        var row = e.currentTarget;
        var btn = e.target.closest('button.wl-thematic-word[data-wl-word]');
        if (!btn || btn.disabled || !row.contains(btn)) return;
        var word = btn.getAttribute('data-wl-word');
        if (!word) return;
        saveSnapshot();
        addWordRow(word, getPinyin(word), '');
        renderTable();
        dimPinyinSuggestionWords();
    }

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
        if (!text) {
            pinyinSuggestionsEl.innerHTML = '';
            return;
        }

        var tokens = text.split(/[,，]/).map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });

        if (tokens.length === 0) {
            pinyinSuggestionsEl.innerHTML = '';
            return;
        }

        var container = pinyinSuggestionsEl;
        while (container.children.length > tokens.length) {
            container.removeChild(container.lastElementChild);
        }

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            var type = classifyToken(token);
            var row = container.children[i];

            if (
                row &&
                row.classList.contains('wl-pinyin-row') &&
                row.getAttribute('data-wl-token') === token &&
                row.getAttribute('data-wl-type') === type
            ) {
                continue;
            }

            if (!row) {
                row = document.createElement('div');
                row.className = 'wl-pinyin-row';
                container.appendChild(row);
            }

            row.setAttribute('data-wl-token', token);
            row.setAttribute('data-wl-type', type);
            _wlSuggestReqCounter += 1;
            row.setAttribute('data-wl-req', String(_wlSuggestReqCounter));

            ensureWlPinyinRowShell(row, token);

            if (type === 'hanzi') {
                renderChineseRow(token, row);
            } else if (type === 'pinyin') {
                fetchPinyinCandidates(token, row);
            } else if (type === 'mixed') {
                fetchMixedCandidates(token, row);
            } else {
                applyWlPinyinCandidates(row, token, []);
            }
        }

        dimPinyinSuggestionWords();
    }

    function renderChineseRow(token, row) {
        // One comma-segment of pure Hanzi is one phrase (spaces/punctuation stay inside one button).
        applyWlPinyinCandidates(row, token, token.length ? [token] : []);
    }

    function preparePinyinQuery(token) {
        var normalized = normalizePinyinInput(token);
        var base = stripToneMarks(normalized).toLowerCase();
        return { base: base, normalized: normalized, hasTones: normalized !== base };
    }

    function fetchPinyinCandidates(token, row) {
        var q = preparePinyinQuery(token);
        if (!q.base) {
            applyWlPinyinCandidates(row, token, []);
            dimPinyinSuggestionWords();
            return;
        }

        var reqAttr = row ? row.getAttribute('data-wl-req') : null;

        var url = GOOGLE_PINYIN_API +
            '?text=' + encodeURIComponent(q.base) +
            '&itc=zh-t-i0-pinyin&num=13&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test';

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!row || row.getAttribute('data-wl-token') !== token) return;
                if (reqAttr !== null && row.getAttribute('data-wl-req') !== reqAttr) return;
                if (!data || data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) {
                    applyWlPinyinCandidates(row, token, []);
                    dimPinyinSuggestionWords();
                    return;
                }
                var candidates = data[1][0][1] || [];

                if (q.hasTones && candidates.length > 0) {
                    candidates = filterByTones(candidates, q.normalized);
                }

                applyWlPinyinCandidates(row, token, candidates);
                dimPinyinSuggestionWords();
            })
            .catch(function () {
                if (!row || row.getAttribute('data-wl-token') !== token) return;
                if (reqAttr !== null && row.getAttribute('data-wl-req') !== reqAttr) return;
                applyWlPinyinCandidates(row, token, []);
                dimPinyinSuggestionWords();
            });
    }

    function fetchMixedCandidates(token, row) {
        var segments = parseSegments(token);
        if (segments.length === 0) {
            applyWlPinyinCandidates(row, token, []);
            dimPinyinSuggestionWords();
            return;
        }

        var reqAttr = row ? row.getAttribute('data-wl-req') : null;

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
        if (!baseQuery) {
            applyWlPinyinCandidates(row, token, []);
            dimPinyinSuggestionWords();
            return;
        }

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
                if (!row || row.getAttribute('data-wl-token') !== token) return;
                if (reqAttr !== null && row.getAttribute('data-wl-req') !== reqAttr) return;
                if (!data || data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) {
                    applyWlPinyinCandidates(row, token, []);
                    dimPinyinSuggestionWords();
                    return;
                }
                var candidates = data[1][0][1] || [];

                var filtered = [];
                for (var i = 0; i < candidates.length; i++) {
                    if (!matchesMixedTemplate(candidates[i], segments)) continue;
                    if (hasPinyinTones && getPinyin(candidates[i]) !== expectedToned) continue;
                    filtered.push(candidates[i]);
                }

                applyWlPinyinCandidates(row, token, filtered);
                dimPinyinSuggestionWords();
            })
            .catch(function () {
                if (!row || row.getAttribute('data-wl-token') !== token) return;
                if (reqAttr !== null && row.getAttribute('data-wl-req') !== reqAttr) return;
                applyWlPinyinCandidates(row, token, []);
                dimPinyinSuggestionWords();
            });
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

    function buildWlPinyinRowShell(row, labelText) {
        if (!row) return;
        row.innerHTML = '';

        var lbl = document.createElement('span');
        lbl.className = 'wl-pinyin-row-label';
        lbl.textContent = labelText + ':';
        row.appendChild(lbl);

        for (var s = 0; s < WL_PINYIN_SLOT_COUNT; s++) {
            var slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'wl-thematic-word wl-pinyin-slot';
            slot.disabled = true;
            row.appendChild(slot);
        }

        var extras = document.createElement('span');
        extras.className = 'wl-pinyin-extras';
        row.appendChild(extras);

        if (!row._wlPinyinClickBound) {
            row._wlPinyinClickBound = true;
            row.addEventListener('click', wlPinyinRowClickHandler);
        }
    }

    /** Reuse DOM when structure already exists so stale suggestion buttons stay until fetch applies. */
    function ensureWlPinyinRowShell(row, labelText) {
        if (!row) return;
        var lbl = row.querySelector('.wl-pinyin-row-label');
        var slots = row.querySelectorAll('.wl-pinyin-slot');
        var extras = row.querySelector('.wl-pinyin-extras');
        if (lbl && slots.length === WL_PINYIN_SLOT_COUNT && extras) {
            var next = labelText + ':';
            if (lbl.textContent !== next) lbl.textContent = next;
            if (!row._wlPinyinClickBound) {
                row._wlPinyinClickBound = true;
                row.addEventListener('click', wlPinyinRowClickHandler);
            }
            return;
        }
        buildWlPinyinRowShell(row, labelText);
    }

    function syncWlPinyinExtras(extras, list, wordsInTable) {
        var need = Math.max(0, list.length - WL_PINYIN_SLOT_COUNT);
        var i = 0;
        for (; i < need; i++) {
            var wx = list[WL_PINYIN_SLOT_COUNT + i];
            var xb = extras.children[i];
            if (!xb) {
                xb = document.createElement('button');
                xb.type = 'button';
                xb.className = 'wl-thematic-word';
                extras.appendChild(xb);
            }
            if (xb.textContent !== wx) xb.textContent = wx;
            if (xb.getAttribute('data-wl-word') !== wx) xb.setAttribute('data-wl-word', wx);
            if (xb.hidden) xb.hidden = false;
            var xIn = !!wordsInTable[wx];
            if (xb.classList.contains('wl-in-table') !== xIn) xb.classList.toggle('wl-in-table', xIn);
        }
        var ch = extras.children;
        for (; i < ch.length; i++) {
            var hid = ch[i];
            if (!hid.hidden) hid.hidden = true;
            if (hid.hasAttribute('data-wl-word')) hid.removeAttribute('data-wl-word');
            if (hid.textContent !== '') hid.textContent = '';
            if (hid.classList.contains('wl-in-table')) hid.classList.remove('wl-in-table');
        }
    }

    function applyWlPinyinCandidates(row, token, candidates) {
        if (!row) return;
        var list = candidates && candidates.length
            ? candidates.slice(0, WL_PINYIN_MAX_SUGGEST)
            : [];

        var lbl = row.querySelector('.wl-pinyin-row-label');
        var nextLbl = token + ':';
        if (lbl && lbl.textContent !== nextLbl) lbl.textContent = nextLbl;

        var slots = row.querySelectorAll('.wl-pinyin-slot');
        var extras = row.querySelector('.wl-pinyin-extras');
        if (!extras || slots.length !== WL_PINYIN_SLOT_COUNT) return;

        var wordsInTable = buildWordSet();

        for (var i = 0; i < WL_PINYIN_SLOT_COUNT; i++) {
            var btn = slots[i];
            if (i < list.length) {
                var w = list[i];
                if (btn.textContent !== w) btn.textContent = w;
                if (btn.getAttribute('data-wl-word') !== w) btn.setAttribute('data-wl-word', w);
                if (btn.disabled) btn.disabled = false;
                var inTable = !!wordsInTable[w];
                if (btn.classList.contains('wl-in-table') !== inTable) btn.classList.toggle('wl-in-table', inTable);
            } else {
                if (btn.textContent !== '') btn.textContent = '';
                if (btn.hasAttribute('data-wl-word')) btn.removeAttribute('data-wl-word');
                if (!btn.disabled) btn.disabled = true;
                if (btn.classList.contains('wl-in-table')) btn.classList.remove('wl-in-table');
            }
        }

        syncWlPinyinExtras(extras, list, wordsInTable);
    }

    function dimPinyinSuggestionWords() {
        if (!pinyinSuggestionsEl) return;
        var wordsInTable = buildWordSet();
        var btns = pinyinSuggestionsEl.querySelectorAll('.wl-thematic-word[data-wl-word]');
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            var w = b.getAttribute('data-wl-word');
            var should = !!(w && wordsInTable[w]);
            if (b.classList.contains('wl-in-table') !== should) b.classList.toggle('wl-in-table', should);
        }
    }

    var _thematicSylSet = null;
    var _thematicSylList = null;
    var _thematicFilterDebounce = null;

    function ensureThematicPinyinSyllables() {
        if (_thematicSylSet) return;
        _thematicSylList = THEMATIC_PINYIN_SYLLABLES_CSV.split(',');
        _thematicSylSet = {};
        for (var si = 0; si < _thematicSylList.length; si++) {
            _thematicSylSet[_thematicSylList[si]] = true;
        }
    }

    function couldBePinyinLatin(norm) {
        ensureThematicPinyinSyllables();
        var SYL = _thematicSylSet;
        function from(pos) {
            if (pos === norm.length) return true;
            var max = Math.min(6, norm.length - pos);
            for (var len = max; len >= 1; len--) {
                var piece = norm.substring(pos, pos + len);
                if (SYL[piece] && from(pos + len)) return true;
            }
            var rest = norm.substring(pos);
            for (var j = 0; j < _thematicSylList.length; j++) {
                var syl = _thematicSylList[j];
                if (syl.length > rest.length && syl.indexOf(rest) === 0) return true;
            }
            return false;
        }
        return from(0);
    }

    function normalizeThematicPinyinSearch(s) {
        var n = normalizePinyinInput(String(s || '').trim());
        return stripToneMarks(n).toLowerCase().replace(/[\s·']/g, '');
    }

    /** Lowercase pinyin with tone marks/digits normalized, spaces removed (for tone-sensitive substring match). */
    function thematicPinyinWithTonesCompact(s) {
        var n = normalizePinyinInput(String(s || '').trim()).toLowerCase();
        return n.replace(/[\s·']/g, '');
    }

    function thematicQuerySpecifiesTones(trimmed) {
        var n = normalizePinyinInput(String(trimmed || '').trim()).toLowerCase();
        return stripToneMarks(n) !== n;
    }

    function thematicRowSourcePinyin(r) {
        var py = (r.pinyin || '').trim();
        if (!py && r.word) py = getPinyin(r.word) || '';
        return py;
    }

    /** Split compact tone-marked pinyin into syllables using the thematic syllable set (parallel detoned/tone strings). */
    function segmentTonedPinyinCompact(compact) {
        ensureThematicPinyinSyllables();
        var SYL = _thematicSylSet;
        var d = stripToneMarks(compact);
        var out = [];
        var pos = 0;
        while (pos < compact.length) {
            var max = Math.min(6, compact.length - pos);
            var found = false;
            for (var len = max; len >= 1; len--) {
                var subD = d.substring(pos, pos + len);
                var subT = compact.substring(pos, pos + len);
                if (SYL[subD] && stripToneMarks(subT) === subD) {
                    out.push(subT);
                    pos += len;
                    found = true;
                    break;
                }
            }
            if (!found) {
                out.push(compact.substring(pos, pos + 1));
                pos += 1;
            }
        }
        return out;
    }

    function thematicSyllableMatchesFilterQuery(rowSyl, querySyl) {
        var q = String(querySyl || '').toLowerCase();
        var r = String(rowSyl || '').toLowerCase();
        if (!q) return true;
        if (stripToneMarks(q) === q) return stripToneMarks(r) === q;
        return r === q;
    }

    function rowMatchesConsecutivePinyinSyllables(rowSyls, querySyls) {
        if (querySyls.length === 0) return true;
        if (rowSyls.length < querySyls.length) return false;
        for (var start = 0; start <= rowSyls.length - querySyls.length; start++) {
            var ok = true;
            for (var k = 0; k < querySyls.length; k++) {
                if (!thematicSyllableMatchesFilterQuery(rowSyls[start + k], querySyls[k])) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }

    function thematicRowMatchesToneAwarePinyin(r, spec) {
        var rowC = thematicPinyinWithTonesCompact(thematicRowSourcePinyin(r));
        var qCompact = spec.tonedCompact;
        if (!rowC || !qCompact) return false;
        var qSyls = segmentTonedPinyinCompact(qCompact);
        if (qSyls.length === 0) return rowC.indexOf(qCompact) !== -1;
        var rowSyls = segmentTonedPinyinCompact(rowC);
        if (rowSyls.length === 0) return rowC.indexOf(qCompact) !== -1;
        if (rowMatchesConsecutivePinyinSyllables(rowSyls, qSyls)) return true;
        return rowC.indexOf(qCompact) !== -1;
    }

    var THEMATIC_HAN_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

    function thematicHasTranslationLetters(s) {
        return /[a-zA-Z\u00c0-\u024f\u0400-\u04FF]/.test(s);
    }

    function classifyThematicFilterQuery(raw) {
        var trimmed = String(raw || '').trim();
        if (!trimmed) return { mode: 'all' };

        if (THEMATIC_HAN_REGEX.test(trimmed)) {
            var cjk = trimmed.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '');
            return { mode: 'hanzi', needle: cjk };
        }

        var latinCore = trimmed.replace(/[^a-zA-Zü]/g, '');
        if (!latinCore) {
            if (!thematicHasTranslationLetters(trimmed)) return { mode: 'none' };
            if (/^\s*\d+\s*$/.test(trimmed)) return { mode: 'none' };
            return { mode: 'translation', needle: trimmed.toLowerCase() };
        }

        var norm = normalizeThematicPinyinSearch(trimmed);
        if (!norm) return { mode: 'none' };

        if (!/^[a-zü]+$/.test(norm)) {
            return { mode: 'none' };
        }

        var toneAware = thematicQuerySpecifiesTones(trimmed);
        var tonedCompact = thematicPinyinWithTonesCompact(trimmed);

        if (norm.length < 5) {
            return { mode: 'pinyin', needle: norm, toneAware: toneAware, tonedCompact: tonedCompact };
        }

        if (couldBePinyinLatin(norm)) {
            return { mode: 'pinyin', needle: norm, toneAware: toneAware, tonedCompact: tonedCompact };
        }

        return { mode: 'translation', needle: trimmed.toLowerCase() };
    }

    function thematicRowPinyinHaystack(r) {
        return normalizeThematicPinyinSearch(thematicRowSourcePinyin(r)).replace(/\s/g, '');
    }

    function thematicRowMatchesFilter(r, spec) {
        if (!r.word) return false;
        if (spec.mode === 'all') return true;
        if (spec.mode === 'none') return false;
        if (spec.mode === 'hanzi') {
            if (!spec.needle) return false;
            var w = (r.word || '').replace(/\s/g, '');
            return w.indexOf(spec.needle) !== -1;
        }
        if (spec.mode === 'pinyin') {
            if (spec.toneAware && spec.tonedCompact) {
                return thematicRowMatchesToneAwarePinyin(r, spec);
            }
            return thematicRowPinyinHaystack(r).indexOf(spec.needle) !== -1;
        }
        if (spec.mode === 'translation') {
            return (r.translation || '').toLowerCase().indexOf(spec.needle) !== -1;
        }
        return false;
    }

    function setThematicFilterVisible(visible) {
        if (!thematicFilterInput) return;
        thematicFilterInput.classList.toggle('hidden', !visible);
    }

    function applyThematicFilter() {
        if (!thematicGrid) return;
        var q = thematicFilterInput ? thematicFilterInput.value : '';
        var spec = classifyThematicFilterQuery(q);
        var btns = thematicGrid.querySelectorAll('.wl-thematic-word');
        for (var fi = 0; fi < btns.length; fi++) {
            var btn = btns[fi];
            var idx = parseInt(btn.getAttribute('data-wl-thematic-idx'), 10);
            if (isNaN(idx) || !currentThematicRows[idx]) continue;
            var show = thematicRowMatchesFilter(currentThematicRows[idx], spec);
            btn.classList.toggle('wl-filter-hidden', !show);
        }
        dimThematicWords();
    }

    function onThematicFilterInput() {
        clearTimeout(_thematicFilterDebounce);
        _thematicFilterDebounce = setTimeout(applyThematicFilter, 120);
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
            setThematicFilterVisible(false);
            if (thematicFilterInput) thematicFilterInput.value = '';
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
                if (thematicFilterInput) thematicFilterInput.value = '';
                renderThematicGrid();
                thematicWordsHidden = false;
                thematicGrid.classList.remove('hidden');
                setThematicFilterVisible(true);
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
                setThematicFilterVisible(false);
                if (thematicFilterInput) thematicFilterInput.value = '';
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
            btn.setAttribute('data-wl-thematic-idx', String(i));
            btn.addEventListener('click', (function (row) {
                return function () {
                    saveSnapshot();
                    addWordRow(row.word, row.pinyin, row.translation);
                    renderTable();
                };
            })(r));
            thematicGrid.appendChild(btn);
        }
        applyThematicFilter();
    }

    function dimThematicWords() {
        if (!thematicGrid) return;
        var wordsInTable = buildWordSet();
        var btns = thematicGrid.querySelectorAll('.wl-thematic-word');
        for (var i = 0; i < btns.length; i++) {
            var tb = btns[i];
            var w = tb.textContent;
            var dim = !!wordsInTable[w];
            if (tb.classList.contains('wl-in-table') !== dim) tb.classList.toggle('wl-in-table', dim);
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
        if (!thematicGrid || currentThematicRows.length === 0) return;
        var btns = thematicGrid.querySelectorAll('.wl-thematic-word:not(.wl-filter-hidden)');
        if (btns.length === 0) return;
        saveSnapshot();
        for (var ai = 0; ai < btns.length; ai++) {
            var idx = parseInt(btns[ai].getAttribute('data-wl-thematic-idx'), 10);
            if (isNaN(idx)) continue;
            var r = currentThematicRows[idx];
            if (r && r.word) addWordRow(r.word, r.pinyin, r.translation);
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
        if (thematicFilterInput) thematicFilterInput.addEventListener('input', onThematicFilterInput);

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
            applyThematicFilter();
        });

        loadManifest();
        syncUndoRedoButtons();
        renderTable();

        if (addInput && addInput.value.trim()) {
            updatePinyinSuggestions();
        }
        window.addEventListener('load', function () {
            if (addInput && addInput.value.trim()) {
                updatePinyinSuggestions();
            }
        });
        window.addEventListener('pageshow', function (e) {
            if (!e.persisted || !addInput || !addInput.value.trim()) return;
            updatePinyinSuggestions();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
