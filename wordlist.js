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
    var wlAddAllSuggestionsBtn = document.getElementById('wlAddAllSuggestions');
    var wlClearAddInputBtn = document.getElementById('wlClearAddInput');
    var autoTranslateCheckbox = document.getElementById('wlAutoTranslate');
    var wlToggleCsvView = document.getElementById('wlToggleCsvView');
    var wlCsvEditor = document.getElementById('wlCsvEditor');
    var wlTableWrap = document.getElementById('wlTableWrap');
    var wlMissingMorphemesBtn = document.getElementById('wlMissingMorphemes');

    // ── State ──
    var rows = [];
    var undoStack = [];
    var redoStack = [];
    var thematicWordsHidden = false;
    var currentThematicRows = [];
    var _wlCsvEditorMode = false;

    var WL_HAN_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

    function wlWordCharCount(w) {
        return Array.from(String(w || '')).length;
    }

    function wlRowIsExactSingleHanzi(word) {
        var t = String(word || '').trim();
        if (!t) return false;
        if (Array.from(t).length !== 1) return false;
        return WL_HAN_REGEX.test(t);
    }

    function buildMissingHanziMorphemesList() {
        var existing = {};
        for (var i = 0; i < rows.length; i++) {
            var w = (rows[i].word || '').trim();
            if (wlRowIsExactSingleHanzi(w)) {
                existing[Array.from(w)[0]] = true;
            }
        }
        var out = [];
        var seen = {};
        for (var j = 0; j < rows.length; j++) {
            var word = rows[j].word || '';
            var parts = Array.from(word);
            for (var k = 0; k < parts.length; k++) {
                var ch = parts[k];
                if (!WL_HAN_REGEX.test(ch)) continue;
                if (existing[ch]) continue;
                if (seen[ch]) continue;
                seen[ch] = true;
                out.push(ch);
            }
        }
        return out;
    }

    function syncWlCsvToggleLabel() {
        if (!wlToggleCsvView) return;
        wlToggleCsvView.textContent = t(_wlCsvEditorMode ? 'wl.viewAsTable' : 'wl.viewAsCsv');
    }

    function onWlToggleCsvView() {
        if (!wlCsvEditor || !wlTableWrap) return;
        if (_wlCsvEditorMode) {
            var parsed = parseCsvText(wlCsvEditor.value);
            saveSnapshot();
            rows = parsed;
            _wlCsvEditorMode = false;
            wlCsvEditor.classList.add('hidden');
            wlTableWrap.classList.remove('hidden');
            syncWlCsvToggleLabel();
            renderTable();
        } else {
            _wlCsvEditorMode = true;
            wlCsvEditor.value = buildCsvText();
            wlCsvEditor.classList.remove('hidden');
            wlTableWrap.classList.add('hidden');
            syncWlCsvToggleLabel();
        }
    }

    function fillMissingMorphemesToAddInput() {
        if (!addInput) return;
        var list = buildMissingHanziMorphemesList();
        addInput.value = list.join(', ');
        clearTimeout(_pinyinDebounce);
        updatePinyinSuggestions();
    }

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
        if (_wlCsvEditorMode && wlCsvEditor) {
            wlCsvEditor.value = buildCsvText();
            updateStats();
            dimThematicWords();
            dimPinyinSuggestionWords();
            persistRows();
            return;
        }
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
            tdNum.className = 'wl-row-handle';
            tdNum.textContent = i + 1;
            tdNum.title = t('wl.rowHandleTitle');
            tr.appendChild(tdNum);

            tr.appendChild(makeInputCell(i, 'word'));
            tr.appendChild(makeInputCell(i, 'pinyin'));
            tr.appendChild(makeInputCell(i, 'translation'));

            var tdAct = document.createElement('td');
            tdAct.className = 'wl-actions';
            var actInner = document.createElement('div');
            actInner.className = 'wl-actions-inner';
            actInner.appendChild(makeActionBtn('\u2191', moveRowUp, i));
            actInner.appendChild(makeActionBtn('\u2193', moveRowDown, i));
            actInner.appendChild(makeActionBtn('\u29C9', duplicateRow, i));
            actInner.appendChild(makeActionBtn('\u2715', deleteRow, i));
            tdAct.appendChild(actInner);
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

    /** gapIdx 0..rows.length: insert before row gapIdx (n = after last). */
    function applyRowDrop(fromIdx, gapIdx) {
        if (fromIdx < 0 || fromIdx >= rows.length) return;
        if (gapIdx < 0 || gapIdx > rows.length) return;
        if (gapIdx === fromIdx || gapIdx === fromIdx + 1) return;
        saveSnapshot();
        var item = rows.splice(fromIdx, 1)[0];
        var insertAt = gapIdx > fromIdx ? gapIdx - 1 : gapIdx;
        rows.splice(insertAt, 0, item);
        renderTable();
    }

    function wlDropGapFromClientY(clientY) {
        if (!tableBody) return 0;
        var trs = tableBody.querySelectorAll('tr');
        if (trs.length === 0) return 0;
        for (var i = 0; i < trs.length; i++) {
            var r = trs[i].getBoundingClientRect();
            var mid = r.top + r.height / 2;
            if (clientY < mid) return i;
        }
        return trs.length;
    }

    var _wlRowDrag = null;

    function wlDisposeRowDragUI() {
        if (!_wlRowDrag) return;
        document.removeEventListener('mousemove', _wlRowDrag.onMove, true);
        document.removeEventListener('mouseup', _wlRowDrag.onUp, true);
        document.removeEventListener('keydown', _wlRowDrag.onEsc, true);
        if (_wlRowDrag.ghost && _wlRowDrag.ghost.parentNode) {
            _wlRowDrag.ghost.parentNode.removeChild(_wlRowDrag.ghost);
        }
        if (_wlRowDrag.indicator && _wlRowDrag.indicator.parentNode) {
            _wlRowDrag.indicator.parentNode.removeChild(_wlRowDrag.indicator);
        }
        document.body.classList.remove('wl-row-dragging');
        _wlRowDrag = null;
    }

    function wlRowDragEscape(e) {
        if (e.key !== 'Escape' || !_wlRowDrag) return;
        e.preventDefault();
        wlDisposeRowDragUI();
    }

    function wlLayoutDropIndicator(gapIdx) {
        if (!_wlRowDrag || !wlTable || !tableBody) return;
        var trs = tableBody.querySelectorAll('tr');
        var ind = _wlRowDrag.indicator;
        if (!trs.length) {
            ind.style.display = 'none';
            return;
        }
        var tableRect = wlTable.getBoundingClientRect();
        var y;
        if (gapIdx <= 0) {
            y = trs[0].getBoundingClientRect().top;
        } else if (gapIdx >= trs.length) {
            y = trs[trs.length - 1].getBoundingClientRect().bottom;
        } else {
            y = trs[gapIdx].getBoundingClientRect().top;
        }
        ind.style.display = 'block';
        ind.style.left = tableRect.left + 'px';
        ind.style.width = tableRect.width + 'px';
        ind.style.height = '3px';
        ind.style.top = (y - 1.5) + 'px';
    }

    function wlRowDragMove(e) {
        if (!_wlRowDrag) return;
        e.preventDefault();
        _wlRowDrag.ghost.style.left = (e.clientX - _wlRowDrag.offX) + 'px';
        _wlRowDrag.ghost.style.top = (e.clientY - _wlRowDrag.offY) + 'px';
        var gap = wlDropGapFromClientY(e.clientY);
        _wlRowDrag.lastGap = gap;
        wlLayoutDropIndicator(gap);
    }

    function wlRowDragUp(e) {
        if (!_wlRowDrag) return;
        if (e.button !== 0) return;
        var fromIdx = _wlRowDrag.fromIdx;
        var gap = _wlRowDrag.lastGap;
        wlDisposeRowDragUI();
        applyRowDrop(fromIdx, gap);
    }

    function wlRowHandleMouseDown(e) {
        if (e.button !== 0) return;
        var td = e.target.closest('td.wl-row-handle');
        if (!td || !tableBody || !tableBody.contains(td)) return;
        e.preventDefault();
        var tr = td.parentElement;
        var fromIdx = Array.prototype.indexOf.call(tableBody.children, tr);
        if (fromIdx < 0) return;

        var rect = td.getBoundingClientRect();
        var ghost = td.cloneNode(true);
        ghost.classList.add('wl-row-handle-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.margin = '0';
        ghost.style.boxSizing = 'border-box';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10001';
        document.body.appendChild(ghost);

        var indicator = document.createElement('div');
        indicator.className = 'wl-drop-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        document.body.appendChild(indicator);

        var gap0 = wlDropGapFromClientY(e.clientY);
        _wlRowDrag = {
            fromIdx: fromIdx,
            ghost: ghost,
            indicator: indicator,
            offX: e.clientX - rect.left,
            offY: e.clientY - rect.top,
            lastGap: gap0,
            onMove: wlRowDragMove,
            onUp: wlRowDragUp,
            onEsc: wlRowDragEscape
        };
        document.body.classList.add('wl-row-dragging');
        wlLayoutDropIndicator(gap0);

        document.addEventListener('mousemove', wlRowDragMove, true);
        document.addEventListener('mouseup', wlRowDragUp, true);
        document.addEventListener('keydown', wlRowDragEscape, true);
    }

    var _wlRowDragListenersBound = false;

    function bindWlRowDragListeners() {
        if (!tableBody || _wlRowDragListenersBound) return;
        _wlRowDragListenersBound = true;
        tableBody.addEventListener('mousedown', wlRowHandleMouseDown);
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
        case 'pinyinSize':
            rows.sort(function (a, b) {
                var la = a.word.length, lb = b.word.length;
                if (la !== lb) return la - lb;
                return a.word.localeCompare(b.word, 'zh');
            });
            break;
        case 'wordSizeStable':
            rows.forEach(function (r, i) { r._wlOrd = i; });
            rows.sort(function (a, b) {
                var la = wlWordCharCount(a.word);
                var lb = wlWordCharCount(b.word);
                if (la !== lb) return la - lb;
                return a._wlOrd - b._wlOrd;
            });
            rows.forEach(function (r) { delete r._wlOrd; });
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
    var WL_EXPORT_CSV_DEFAULT = 'wordlist.csv';

    function sanitizeExportCsvFilename(raw) {
        var s = String(raw != null ? raw : '').trim();
        if (!s) return WL_EXPORT_CSV_DEFAULT;
        s = s.replace(/^.*[/\\]/, '');
        s = s.replace(/[<>:"|?*\x00-\x1f]/g, '_').trim();
        if (!s || s === '.' || s === '..') return WL_EXPORT_CSV_DEFAULT;
        if (s.length > 200) s = s.slice(0, 200);
        if (!/\.csv$/i.test(s)) s += '.csv';
        return s;
    }

    function exportCsv() {
        if (rows.length === 0) return;
        var entered = window.prompt(t('wl.exportCsvFilenamePrompt'), WL_EXPORT_CSV_DEFAULT);
        if (entered === null) return;
        var filename = sanitizeExportCsvFilename(entered);
        var text = buildCsvText();
        var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ── CSV import: strict word list vs Miro-style loose exports ──
    function normalizeMiroImportText(s) {
        return String(s || '')
            .replace(/\uFEFF/g, '')
            .replace(/\u200B|\u200C|\u200D/g, '');
    }

    function parseCsvToFieldRows(text) {
        var lines = String(text || '').split(/\r?\n/);
        var rows = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            rows.push(parseCsvLine(line));
        }
        return rows;
    }

    function rowLooksLikeStrictVocabRow(fields) {
        var w = (fields[0] || '').trim();
        if (!w || !WL_HAN_REGEX.test(w) || w.length > 96) return false;
        if (/Слова\s|^Диалог|^作业|^Прописи|^Frame\s/i.test(w)) return false;
        if (/Ключ|Графема/.test(w)) return false;
        if (fields.length < 2) return false;
        var p = (fields[1] || '').trim();
        if (!p) return false;
        if (!/^[a-zA-Z\u00fc\u00dc\u00c0-\u00ff\u0100-\u024f\u1e00-\u1eff0-9\s.,\-\/]+$/.test(p)) return false;
        return true;
    }

    function shouldUseMiroCsvExtractor(fieldRows, rawText) {
        if (!fieldRows.length || !WL_HAN_REGEX.test(rawText)) return false;
        var strict = 0;
        var hanLines = 0;
        var singleField = 0;
        var longSingle = 0;
        for (var i = 0; i < fieldRows.length; i++) {
            var r = fieldRows[i];
            var f0 = (r[0] || '').trim();
            if (!f0 || !WL_HAN_REGEX.test(f0)) continue;
            hanLines++;
            if (rowLooksLikeStrictVocabRow(r)) strict++;
            if (r.length === 1) {
                singleField++;
                if (f0.length > 80) longSingle++;
            }
        }
        if (hanLines === 0) return false;
        if (strict / hanLines >= 0.55) return false;
        if (longSingle >= 3) return true;
        if (singleField / fieldRows.length >= 0.38 && longSingle >= 1) return true;
        if (strict / hanLines < 0.22 && singleField / fieldRows.length >= 0.25) return true;
        return false;
    }

    function miroPinyinHasVowel(py) {
        return /[aeiouAEIOUāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(py);
    }

    function miroLooksLikePinyinRun(py) {
        if (!py || py.length > 48) return false;
        if (!/^[a-zA-Z\u00fc\u00dc\u00c0-\u00ff\u0100-\u024f\u1e00-\u1eff\s]+$/.test(py)) return false;
        return miroPinyinHasVowel(py);
    }

    function miroNormalizePinyin(py) {
        var s = String(py || '').replace(/\s+/g, ' ').trim();
        if (!s) return '';
        if (/[1-5]/.test(s)) return normalizePinyinInput(s);
        return s;
    }

    /** Pinyin run: ASCII + ü + Latin-1 (í ó ú in píng) + Latin Extended (ǎ ǒ …). */
    function miroPinyinChunkReSource() {
        return '[a-zA-Z\\u00fc\\u00dc\\u00c0-\\u00ff\\u0100-\\u024f\\u1e00-\\u1eff]+(?:\\s+[a-zA-Z\\u00fc\\u00dc\\u00c0-\\u00ff\\u0100-\\u024f\\u1e00-\\u1eff]+){0,7}';
    }

    function snapMiroGlossAfterDash(rest) {
        var s = String(rest || '');
        var i = 0;
        while (i < s.length && /\s/.test(s[i])) i++;
        var start = i;
        while (i < s.length) {
            if (s.slice(i, i + 4) === 'Ключ' || s.slice(i, i + 7) === 'Графема') break;
            if (s[i] === '\n') {
                var j = i + 1;
                while (j < s.length && /\s/.test(s[j])) j++;
                if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[j] || '')) break;
            }
            if (s[i] === ' ' && s[i + 1] === ' ' && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[i + 2] || '')) break;
            if (/\s/.test(s[i])) {
                var k = i;
                while (k < s.length && /\s/.test(s[k])) k++;
                if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[k] || '')) {
                    var endHan = k;
                    while (endHan < s.length && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[endHan])) endHan++;
                    if (endHan - k <= 22) break;
                }
            }
            if (/^\d+\.\s*/.test(s.slice(i)) && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s.slice(i).replace(/^\d+\.\s*/, '')[0] || '')) break;
            i++;
        }
        return s.slice(start, i).replace(/\s+$/g, '').trim();
    }

    function snapMiroRussianGloss(rest) {
        var s = String(rest || '');
        var i = 0;
        while (i < s.length && /\s/.test(s[i])) i++;
        if (!/[А-Яа-яЁё]/.test(s[i] || '')) return '';
        var start = i;
        i++;
        while (i < s.length) {
            if (s.slice(i, i + 4) === 'Ключ' || s.slice(i, i + 7) === 'Графема') break;
            if (s[i] === '\n') break;
            if (s[i] === ' ' && s[i + 1] === ' ' && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[i + 2] || '')) break;
            if (/\s/.test(s[i])) {
                var k = i;
                while (k < s.length && /\s/.test(s[k])) k++;
                if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[k] || '')) {
                    var eh = k;
                    while (eh < s.length && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s[eh])) eh++;
                    if (eh - k <= 22) break;
                }
            }
            if (/^\d+\.\s*/.test(s.slice(i)) && /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(s.slice(i).replace(/^\d+\.\s*/, '')[0] || '')) break;
            i++;
        }
        return s.slice(start, i).replace(/\s+$/g, '').trim();
    }

    function extractMiroHanPinyinDash(s) {
        var out = [];
        var py = miroPinyinChunkReSource();
        var re = new RegExp(
            '([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,24})\\s+(' + py + ')\\s*[-–—]',
            'g'
        );
        var m;
        while ((m = re.exec(s)) !== null) {
            var pyRaw = m[2].replace(/\s+/g, ' ').trim();
            if (!miroLooksLikePinyinRun(pyRaw)) continue;
            var after = s.slice(m.index + m[0].length);
            var gloss = snapMiroGlossAfterDash(after);
            out.push({ word: m[1], pinyin: miroNormalizePinyin(pyRaw), translation: gloss });
        }
        return out;
    }

    function extractMiroHanPinyinNoGloss(s) {
        var out = [];
        var py = miroPinyinChunkReSource();
        var re = new RegExp(
            '([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,24})\\s+(' + py + ')(?=\\s{2,}|\\s+Ключ|\\s+Графема|\\s+\\d+\\.\\s|\\n|$)',
            'g'
        );
        var m;
        while ((m = re.exec(s)) !== null) {
            var tail = s.slice(m.index + m[0].length);
            if (/^\s*[-–—]/.test(tail)) continue;
            var pyRaw = m[2].replace(/\s+/g, ' ').trim();
            if (!miroLooksLikePinyinRun(pyRaw)) continue;
            out.push({ word: m[1], pinyin: miroNormalizePinyin(pyRaw), translation: '' });
        }
        return out;
    }

    /** 香 xiāng- ароматный (hyphen glued to pinyin). */
    function extractMiroHanPinyinHyphenGloss(s) {
        var out = [];
        var py = miroPinyinChunkReSource();
        var re = new RegExp(
            '([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,12})\\s+(' + py + ')-\\s+([А-Яа-яЁё][^\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff\\n]{0,200})',
            'g'
        );
        var m;
        while ((m = re.exec(s)) !== null) {
            var g = m[3];
            var cutKw = g.search(/\s+Ключ|\s+Графема|\s+\d+\.\s*[\u4e00-\u9fff]/);
            if (cutKw !== -1) g = g.slice(0, cutKw);
            var cutDig = g.search(/\s+\d+\./);
            if (cutDig !== -1) g = g.slice(0, cutDig);
            var cutHan = g.search(/\s{2,}[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/);
            if (cutHan !== -1) g = g.slice(0, cutHan);
            g = g.replace(/\s+$/g, '').trim();
            if (!g) continue;
            out.push({ word: m[1], pinyin: miroNormalizePinyin(m[2]), translation: g });
        }
        return out;
    }

    /** Ключ Трава 艹 cǎo; Плод/Злак/Дерево/Запад + Han + pinyin; Ключ Нож 刂 (no pinyin in export). */
    function extractMiroSchemaLabels(s) {
        var out = [];
        var py = miroPinyinChunkReSource();
        var labelTr = { Плод: 'плод', Злак: 'злак', Дерево: 'дерево', Запад: 'запад' };
        var reTra = new RegExp('Ключ\\s+Трава\\s+([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,8})\\s+(' + py + ')', 'g');
        var m;
        while ((m = reTra.exec(s)) !== null) {
            out.push({ word: m[1], pinyin: miroNormalizePinyin(m[2]), translation: 'трава' });
        }
        var reLbl = new RegExp('(Плод|Злак|Дерево|Запад)\\s+([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,8})\\s+(' + py + ')', 'g');
        while ((m = reLbl.exec(s)) !== null) {
            var tr = labelTr[m[1]] || m[1].toLowerCase();
            out.push({ word: m[2], pinyin: miroNormalizePinyin(m[3]), translation: tr });
        }
        var reKnife = /Ключ\s+Нож\s+([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]{1,4})\s*(?=\s*\d)/g;
        while ((m = reKnife.exec(s)) !== null) {
            out.push({ word: m[1], pinyin: '', translation: 'нож' });
        }
        return out;
    }

    /** «Графема Ровный, гладкий  平 píng» / «Графема Спеть, созревать 登 dēng» — RU gloss after label, before Han+pinyin.
     *  «Графема» is required so we never capture from its leading «Г» into a group that contains the word «Графема» (that used to drop 平/登).
     *  The captured Russian must contain a comma so «продавать 苹果 píngguǒ» is never read as RU+Hàn+pinyin. */
    function extractMiroRussianBeforeHanPinyin(s) {
        var out = [];
        var py = miroPinyinChunkReSource();
        var re = new RegExp(
            'Графема\\s+([А-Яа-яЁё][А-Яа-яЁё\\-–—,\\s]{2,100}?)\\s+([\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]{1,12})\\s+(' + py + ')(?=\\s{2,}|\\s+Ключ|\\s+Графема|\\s+\\d+\\.\\s|\\s*$)',
            'g'
        );
        var m;
        while ((m = re.exec(s)) !== null) {
            var ru = m[1].replace(/\s+$/g, '').trim();
            if (ru.length < 4) continue;
            if (ru.indexOf(',') === -1) continue;
            if (/^(Ключ|Графема|Слова|Диалог)/i.test(ru)) continue;
            if (/Графема|Ключ/.test(ru)) continue;
            out.push({ word: m[2], pinyin: miroNormalizePinyin(m[3]), translation: ru });
        }
        return out;
    }

    function extractMiroHanDashRussian(s) {
        var out = [];
        var re = /([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]{1,24})\s*[-–—]\s*/g;
        var m;
        while ((m = re.exec(s)) !== null) {
            var pos = m.index + m[0].length;
            if (/[a-zA-Z]/.test(s[pos] || '')) continue;
            var gloss = snapMiroRussianGloss(s.slice(pos));
            if (!gloss) continue;
            out.push({ word: m[1], pinyin: '', translation: gloss });
        }
        return out;
    }

    function extractMiroStandaloneChineseLines(blob) {
        var out = [];
        var lines = String(blob || '').split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = normalizeMiroImportText(lines[i]).replace(/^["\s]+|["\s]+$/g, '').trim();
            if (!line || line.length > 100) continue;
            if (/[-–—]/.test(line) && /[a-zA-Z]/.test(line)) continue;
            if (/[a-zA-Z]{3,}/.test(line)) continue;
            if (!/^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff0c\uff1f\uff01\s，。、！？]+$/.test(line)) continue;
            var compact = line.replace(/\s+/g, '');
            if (compact.length < 1 || compact.length > 48) continue;
            out.push({ word: compact, pinyin: '', translation: '' });
        }
        return out;
    }

    function miroMergeRows(lists) {
        var map = {};
        var order = [];
        function consider(r) {
            var w = (r.word || '').trim();
            if (!w || !WL_HAN_REGEX.test(w)) return;
            if (w.length > 48) return;
            if (!map[w]) {
                map[w] = { word: w, pinyin: (r.pinyin || '').trim(), translation: (r.translation || '').trim() };
                order.push(w);
                return;
            }
            var ex = map[w];
            if (!ex.translation && r.translation) ex.translation = (r.translation || '').trim();
            if (!ex.pinyin && r.pinyin) ex.pinyin = (r.pinyin || '').trim();
        }
        for (var li = 0; li < lists.length; li++) {
            var L = lists[li];
            for (var j = 0; j < L.length; j++) consider(L[j]);
        }
        var merged = [];
        for (var k = 0; k < order.length; k++) merged.push(map[order[k]]);
        return merged;
    }

    function miroPartitionTranslatedLast(list) {
        var withT = [];
        var withoutT = [];
        for (var i = 0; i < list.length; i++) {
            if ((list[i].translation || '').trim()) withT.push(list[i]);
            else withoutT.push(list[i]);
        }
        return withT.concat(withoutT);
    }

    function miroFillMissingPinyin(list) {
        for (var i = 0; i < list.length; i++) {
            if (!(list[i].pinyin || '').trim()) {
                var py = getPinyin(list[i].word);
                if (py) list[i].pinyin = py;
            }
        }
        return list;
    }

    function parseMiroLooseCsv(rawText, fieldRows) {
        var parts = [];
        for (var i = 0; i < fieldRows.length; i++) {
            parts.push(fieldRows[i].join(' '));
        }
        var blob = normalizeMiroImportText(parts.join('\n'));
        var lists = [
            extractMiroHanPinyinDash(blob),
            extractMiroHanPinyinHyphenGloss(blob),
            extractMiroSchemaLabels(blob),
            extractMiroRussianBeforeHanPinyin(blob),
            extractMiroHanPinyinNoGloss(blob),
            extractMiroHanDashRussian(blob),
            extractMiroStandaloneChineseLines(rawText)
        ];
        var merged = miroMergeRows(lists);
        miroFillMissingPinyin(merged);
        return miroPartitionTranslatedLast(merged);
    }

    function parseCsvTextStrictFromRows(fieldRows) {
        var result = [];
        for (var i = 0; i < fieldRows.length; i++) {
            var fields = fieldRows[i];
            result.push({ word: fields[0] || '', pinyin: fields[1] || '', translation: fields[2] || '' });
        }
        return result;
    }

    function parseCsvText(text) {
        var raw = String(text || '');
        var fieldRows = parseCsvToFieldRows(raw);
        if (shouldUseMiroCsvExtractor(fieldRows, raw)) {
            return parseMiroLooseCsv(raw, fieldRows);
        }
        return parseCsvTextStrictFromRows(fieldRows);
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
            updateAddAllSuggestionsVisibility();
            return;
        }

        var tokens = text.split(/[,，]/).map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });

        if (tokens.length === 0) {
            pinyinSuggestionsEl.innerHTML = '';
            updateAddAllSuggestionsVisibility();
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

    var WL_ADD_ALL_MIN_ROWS = 6;

    function updateAddAllSuggestionsVisibility() {
        if (!pinyinSuggestionsEl) return;
        var rowCount = pinyinSuggestionsEl.querySelectorAll('.wl-pinyin-row').length;
        var show = rowCount >= WL_ADD_ALL_MIN_ROWS;
        if (wlAddAllSuggestionsBtn) wlAddAllSuggestionsBtn.classList.toggle('hidden', !show);
        if (wlClearAddInputBtn) wlClearAddInputBtn.classList.toggle('hidden', !show);
    }

    function clearWlAddInput() {
        if (!addInput) return;
        addInput.value = '';
        updatePinyinSuggestions();
        addInput.focus();
    }

    function addAllFirstSuggestionsFromRows() {
        if (!pinyinSuggestionsEl) return;
        var prows = pinyinSuggestionsEl.querySelectorAll('.wl-pinyin-row');
        var words = [];
        for (var i = 0; i < prows.length; i++) {
            var btn = prows[i].querySelector('.wl-thematic-word[data-wl-word]');
            if (!btn) continue;
            var w = btn.getAttribute('data-wl-word');
            if (w) words.push(w);
        }
        if (words.length === 0) return;
        saveSnapshot();
        for (var j = 0; j < words.length; j++) {
            addWordRow(words[j], getPinyin(words[j]), '');
        }
        renderTable();
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
        updateAddAllSuggestionsVisibility();
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
        if (wlToggleCsvView) wlToggleCsvView.addEventListener('click', onWlToggleCsvView);
        if (wlMissingMorphemesBtn) wlMissingMorphemesBtn.addEventListener('click', fillMissingMorphemesToAddInput);
        if (wlAddAllSuggestionsBtn) wlAddAllSuggestionsBtn.addEventListener('click', addAllFirstSuggestionsFromRows);
        if (wlClearAddInputBtn) wlClearAddInputBtn.addEventListener('click', clearWlAddInput);

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
            if (tableBody) {
                var rh = tableBody.querySelectorAll('td.wl-row-handle');
                for (var ri = 0; ri < rh.length; ri++) {
                    rh[ri].title = t('wl.rowHandleTitle');
                }
            }
            syncWlCsvToggleLabel();
            if (wlCsvEditor && wlCsvEditor.getAttribute('data-i18n-placeholder')) {
                wlCsvEditor.placeholder = t('wl.csvEditorPlaceholder');
            }
        });

        bindWlRowDragListeners();
        syncWlCsvToggleLabel();
        if (wlCsvEditor && wlCsvEditor.getAttribute('data-i18n-placeholder')) {
            wlCsvEditor.placeholder = t('wl.csvEditorPlaceholder');
        }

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
