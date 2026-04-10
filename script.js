function t(key, vars) {
    return window.I18N && I18N.t ? I18N.t(key, vars) : key;
}

function splitCsvRow(line) {
    if (window.WordcardsCsvWordlists && WordcardsCsvWordlists.parseCsvLine) {
        return WordcardsCsvWordlists.parseCsvLine(line);
    }
    return line.split(',');
}

function parseAllValidCardsFromText(text) {
    const out = [];
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = splitCsvRow(trimmed);
        if (parts.length >= 3) {
            out.push({
                word: parts[0].trim(),
                pronunciation: parts[1].trim(),
                meaning: parts.slice(2).join(',').trim()
            });
        }
    }
    return out;
}

function cardArraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (
            a[i].word !== b[i].word ||
            a[i].pronunciation !== b[i].pronunciation ||
            a[i].meaning !== b[i].meaning
        ) {
            return false;
        }
    }
    return true;
}

// Global variables
let cards = [];
let currentCardIndex = 0;
let currentMode = 'editor';
let isRandomized = true;
let usedRandomIndices = new Set();
const STORAGE_KEY = 'wordCardsData';

// DOM elements
const wordInput = document.getElementById('wordInput');
const indexToggleWordList = document.getElementById('indexToggleWordList');
const indexWordListWrap = document.getElementById('indexWordListWrap');
const exportCardsBtn = document.getElementById('exportCards');
const importCardsBtn = document.getElementById('importCards');
const fileInput = document.getElementById('fileInput');
const cardCount = document.getElementById('cardCount');
const editorWarning = document.getElementById('editorWarning');
const modeBtns = document.querySelectorAll('.mode-btn');
const modeContents = document.querySelectorAll('.mode-content');

// Flashcard elements
const flashcard = document.getElementById('flashcard');
const cardWord = document.getElementById('cardWord');
const cardPronunciation = document.getElementById('cardPronunciation');
const cardMeaning = document.getElementById('cardMeaning');
const firstCardBtn = document.getElementById('firstCard');
const prevCardBtn = document.getElementById('prevCard');
const nextCardBtn = document.getElementById('nextCard');
const lastCardBtn = document.getElementById('lastCard');
const randomizeCheckbox = document.getElementById('randomizeCards');
const cardPosition = document.getElementById('cardPosition');

// Multiple choice elements
const mcQuestion = document.getElementById('mcQuestion');
const mcOptions = document.getElementById('mcOptions');
const mcFeedback = document.getElementById('mcFeedback');
const mcNextBtn = document.getElementById('mcNext');
const mcHardMode = document.getElementById('mcHardMode');

// Word pronunciation elements
const wpQuestion = document.getElementById('wpQuestion');
const wpAnswer = document.getElementById('wpAnswer');
const wpSubmitBtn = document.getElementById('wpSubmit');
const wpFeedback = document.getElementById('wpFeedback');
const wpNextBtn = document.getElementById('wpNext');

// Writing/spelling elements
const wsQuestion = document.getElementById('wsQuestion');
const wsAnswer = document.getElementById('wsAnswer');
const wsSubmitBtn = document.getElementById('wsSubmit');
const wsFeedback = document.getElementById('wsFeedback');
const wsNextBtn = document.getElementById('wsNext');
const wsUseHanziQuiz = document.getElementById('wsUseHanziQuiz');
const wsHanziQuizPanel = document.getElementById('wsHanziQuizPanel');
const wsHanziTarget = document.getElementById('wsHanziTarget');
const wsHanziDone = document.getElementById('wsHanziDone');
const wsHanziHint = document.getElementById('wsHanziHint');

// Handwriting input elements
const hwToggleBtn = document.getElementById('wsHandwriteToggle');
const hwPanel = document.getElementById('wsHandwritePanel');
const hwCanvasEl = document.getElementById('hwCanvas');
const hwUndoBtn = document.getElementById('hwUndo');
const hwClearBtn = document.getElementById('hwClear');
const hwCandidatesEl = document.getElementById('hwCandidates');

// Initialize the application
function init() {
    // Event listeners for mode selection
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            setMode(mode);
        });
    });
    
    if (exportCardsBtn) exportCardsBtn.addEventListener('click', exportCards);
    if (importCardsBtn) importCardsBtn.addEventListener('click', importCards);
    if (fileInput) fileInput.addEventListener('change', handleFileImport);

    if (wordInput) {
        wordInput.addEventListener('wordcards:preset-loaded', function () {
            applyEditorToCards();
        });
    }
    if (window.WordcardsCsvWordlists && indexToggleWordList && indexWordListWrap) {
        WordcardsCsvWordlists.initWordListToggle(indexToggleWordList, indexWordListWrap);
    }
    
    if (firstCardBtn) firstCardBtn.addEventListener('click', showFirstCard);
    if (prevCardBtn) prevCardBtn.addEventListener('click', showPrevCard);
    if (nextCardBtn) nextCardBtn.addEventListener('click', showNextCard);
    if (lastCardBtn) lastCardBtn.addEventListener('click', showLastCard);
    if (flashcard) flashcard.addEventListener('click', flipCard);
    if (randomizeCheckbox) randomizeCheckbox.addEventListener('change', toggleRandomize);
    
    if (mcNextBtn) mcNextBtn.addEventListener('click', nextMultipleChoiceQuestion);
    if (mcHardMode) mcHardMode.addEventListener('change', function () {
        if (currentMode === 'multipleChoice') nextMultipleChoiceQuestion();
    });
    if (wpSubmitBtn) wpSubmitBtn.addEventListener('click', checkPronunciationAnswer);
    if (wpNextBtn) wpNextBtn.addEventListener('click', nextPronunciationQuestion);
    if (wsSubmitBtn) wsSubmitBtn.addEventListener('click', checkSpellingAnswer);
    if (wsNextBtn) wsNextBtn.addEventListener('click', nextSpellingQuestion);
    if (wsUseHanziQuiz) {
        wsUseHanziQuiz.addEventListener('change', function () {
            updateWritingModeUI();
            if (currentMode !== 'writing' || !currentWSQuestion) return;
            currentWSQuestion.hanziQuizMode = !!wsUseHanziQuiz.checked;
            cancelAutoAdvance();
            wsFeedback.textContent = '';
            wsFeedback.className = 'feedback';
            if (wsUseHanziQuiz.checked) {
                _wsHanziChars = getHanziCharsFromWord(currentWSQuestion.correctSpelling);
                _wsHanziCharIndex = 0;
                if (wsHanziDone) wsHanziDone.innerHTML = '';
                if (_wsHanziChars.length === 0) {
                    wsFeedback.textContent = t('ws.noHanziInWord');
                    wsFeedback.className = 'feedback incorrect';
                    return;
                }
                runCurrentHanziStep(function () {
                    wsFeedback.textContent = t('ws.correct');
                    wsFeedback.className = 'feedback correct';
                    startAutoAdvance(wsNextBtn, nextSpellingQuestion, 2);
                    if (wsNextBtn) wsNextBtn.focus();
                });
            } else {
                clearHanziWriterQuiz();
                if (wsAnswer) wsAnswer.focus();
            }
        });
    }

    if (hwToggleBtn) hwToggleBtn.addEventListener('click', toggleHandwritePanel);
    if (hwUndoBtn) hwUndoBtn.addEventListener('click', function () { if (_hwBoard) _hwBoard.undo(); });
    if (hwClearBtn) hwClearBtn.addEventListener('click', function () { if (_hwBoard) _hwBoard.clear(); });

    if (wpAnswer) {
        wpAnswer.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (wpFeedback.classList.contains('correct') || wpFeedback.classList.contains('incorrect')) {
                nextPronunciationQuestion();
            } else {
                checkPronunciationAnswer();
            }
        });
    }
    if (wsAnswer) {
        wsAnswer.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (wsFeedback.classList.contains('correct') || wsFeedback.classList.contains('incorrect')) {
                nextSpellingQuestion();
            } else {
                checkSpellingAnswer();
            }
        });
    }
    
    if (wordInput) wordInput.addEventListener('input', checkForChanges);
    
    // Load cards from localStorage if available
    loadCardsFromStorage();
    if (cards.length === 0) {
        cardCount.textContent = t('index.noCards');
        cardPosition.textContent = t('flashcard.position', { cur: 0, total: 0 });
    }

    // Set initial mode
    setMode('editor');
    updateWritingModeUI();

    if (randomizeCheckbox) {
        isRandomized = randomizeCheckbox.checked;
        if (isRandomized && cards.length > 0) {
            usedRandomIndices.add(currentCardIndex);
        }
    }

    document.addEventListener('wordcards:locale-changed', refreshIndexLocale);
}

function refreshIndexLocale() {
    if (!window.I18N) return;
    I18N.applyStaticTranslations();
    if (cards.length === 0) {
        cardCount.textContent = t('index.noCards');
        cardWord.textContent = t('flashcard.word');
        cardPronunciation.textContent = t('flashcard.pronunciation');
        cardMeaning.textContent = t('flashcard.meaning');
        cardPosition.textContent = t('flashcard.position', { cur: 0, total: 0 });
    } else {
        cardCount.textContent = t('index.loadedCount', { count: cards.length });
        updateFlashcard();
        if (currentMode === 'multipleChoice') nextMultipleChoiceQuestion();
        else if (currentMode === 'pronunciation') nextPronunciationQuestion();
        else if (currentMode === 'writing') nextSpellingQuestion();
    }
    if (cards.length > 0) {
        checkForChanges();
    } else {
        hideEditorWarning();
    }
    if (currentMode !== 'editor' && cards.length === 0) {
        showEmptyState(currentMode);
    }
}

// Load cards from localStorage
function loadCardsFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            cards = parsedData.cards || [];
            wordInput.value = parsedData.textareaContent || '';
            
            if (cards.length > 0) {
                cardCount.textContent = t('index.loadedSession', { count: cards.length });
                updateFlashcard();
                initMultipleChoice();
                initPronunciation();
                initWriting();
            }
        } catch (e) {
            console.error('Error loading data from storage:', e);
        }
    }
}

// Save cards to localStorage
function saveCardsToStorage() {
    const dataToStore = {
        cards: cards,
        textareaContent: wordInput.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
}

function checkForChanges() {
    if (cards.length === 0) {
        hideEditorWarning();
        return;
    }

    const parsed = parseAllValidCardsFromText(wordInput.value);
    if (!cardArraysEqual(parsed, cards)) {
        showEditorWarning(t('index.editorWarning'));
    } else {
        hideEditorWarning();
    }
}

function showEditorWarning(message) {
    editorWarning.textContent = message;
    editorWarning.classList.remove('hidden');
}

function hideEditorWarning() {
    editorWarning.classList.add('hidden');
}

function removeEmptyStatesFromLearningModes() {
    ['flashcard', 'multipleChoice', 'pronunciation', 'writing'].forEach(function (prefix) {
        const el = document.getElementById(prefix + 'Mode');
        if (!el) return;
        const es = el.querySelector('.empty-state');
        if (es) es.remove();
    });
}

/** Parse textarea into cards; empty input clears cards. Returns false if input is non-empty but has no valid rows. */
function applyEditorToCards() {
    const input = wordInput.value.trim();
    if (!input) {
        cards = [];
        currentCardIndex = 0;
        usedRandomIndices.clear();
        cardCount.textContent = t('index.noCards');
        mcFeedback.textContent = '';
        wpFeedback.textContent = '';
        wsFeedback.textContent = '';
        saveCardsToStorage();
        updateFlashcard();
        initMultipleChoice();
        initPronunciation();
        initWriting();
        hideEditorWarning();
        return true;
    }

    const newCards = [];
    const lines = input.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = splitCsvRow(trimmed);
        if (parts.length >= 3) {
            newCards.push({
                word: parts[0].trim(),
                pronunciation: parts[1].trim(),
                meaning: parts.slice(2).join(',').trim()
            });
        }
    }

    if (newCards.length === 0) {
        alert(t('alert.noValidCards'));
        return false;
    }

    cards = newCards;
    cardCount.textContent = t('index.loadedCount', { count: cards.length });
    currentCardIndex = 0;
    usedRandomIndices.clear();
    removeEmptyStatesFromLearningModes();
    updateFlashcard();
    initMultipleChoice();
    initPronunciation();
    initWriting();
    saveCardsToStorage();
    hideEditorWarning();
    return true;
}

function exportCards() {
    const raw = wordInput.value.trim();
    if (!raw) {
        alert(t('alert.nothingExport'));
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

// Import cards from file
function importCards() {
    fileInput.click();
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        wordInput.value = content;
        wordInput.dispatchEvent(new Event('input', { bubbles: true }));
        applyEditorToCards();
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Set the current learning mode
function setMode(mode) {
    cancelAutoAdvance();
    if (mode !== 'writing') {
        clearHanziWriterQuiz();
    }
    if (currentMode === 'editor' && mode !== 'editor') {
        if (!applyEditorToCards()) {
            return;
        }
    }

    currentMode = mode;
    
    // Update active button
    modeBtns.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide mode content
    modeContents.forEach(content => {
        if (content.id === `${mode}Mode`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
    
    // Handle empty states for learning modes
    if (mode !== 'editor' && cards.length === 0) {
        showEmptyState(mode);
    }
}

// Show empty state for learning modes
function showEmptyState(mode) {
    const modeContent = document.getElementById(`${mode}Mode`);
    const existingEmptyState = modeContent.querySelector('.empty-state');
    
    if (existingEmptyState) {
        existingEmptyState.remove();
    }
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const h3 = document.createElement('h3');
    h3.textContent = t('empty.title');
    const p = document.createElement('p');
    p.textContent = t('empty.text');
    const btn = document.createElement('button');
    btn.id = 'goToEditor';
    btn.style.marginTop = '15px';
    btn.textContent = t('empty.goEditor');
    btn.addEventListener('click', () => {
        setMode('editor');
    });
    emptyState.appendChild(h3);
    emptyState.appendChild(p);
    emptyState.appendChild(btn);
    modeContent.appendChild(emptyState);
}

// Flashcard functions
function updateFlashcard() {
    if (cards.length === 0) {
        showEmptyState('flashcard');
        return;
    }
    
    const card = cards[currentCardIndex];
    cardWord.textContent = card.word;
    cardPronunciation.textContent = card.pronunciation;
    cardMeaning.textContent = card.meaning;
    
    // Reset card to front
    flashcard.classList.remove('flipped');
    
    // Update position indicator
    cardPosition.textContent = t('flashcard.position', {
        cur: currentCardIndex + 1,
        total: cards.length
    });
}

function showFirstCard() {
    if (cards.length === 0) return;
    
    currentCardIndex = 0;
    usedRandomIndices.clear();
    updateFlashcard();
}

function showLastCard() {
    if (cards.length === 0) return;
    
    currentCardIndex = cards.length - 1;
    usedRandomIndices.clear();
    updateFlashcard();
}

function showPrevCard() {
    if (cards.length === 0) return;
    
    if (isRandomized) {
        getRandomCard();
    } else {
        currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
    }
    updateFlashcard();
}

function showNextCard() {
    if (cards.length === 0) return;
    
    if (isRandomized) {
        getRandomCard();
    } else {
        currentCardIndex = (currentCardIndex + 1) % cards.length;
    }
    updateFlashcard();
}

function getRandomCard() {
    if (usedRandomIndices.size >= cards.length) {
        usedRandomIndices.clear();
    }
    
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * cards.length);
    } while (usedRandomIndices.has(randomIndex) && usedRandomIndices.size < cards.length);
    
    usedRandomIndices.add(randomIndex);
    currentCardIndex = randomIndex;
}

function flipCard() {
    flashcard.classList.toggle('flipped');
}

function toggleRandomize() {
    isRandomized = randomizeCheckbox.checked;
    usedRandomIndices.clear();
    
    if (isRandomized && cards.length > 0) {
        usedRandomIndices.add(currentCardIndex);
    }
}

// Multiple choice functions
let currentMCQuestion = null;
let mcAnswered = false;

function initMultipleChoice() {
    if (cards.length === 0) return;
    nextMultipleChoiceQuestion();
}

function pickDistractors(cards, correctCard, field, count, matchLen, excludeNormPron) {
    var correctVal = correctCard[field];
    var targetLen = (field === 'word') ? correctVal.length
                  : (field === 'pronunciation') ? correctVal.replace(/ /g, '').length
                  : 0;

    var sameLen = [];
    var diffLen = [];
    for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (c[field] === correctVal) continue;
        if (excludeNormPron && normalizePinyin(c.pronunciation) === excludeNormPron) continue;
        if (matchLen && targetLen > 0) {
            var cLen = (field === 'word') ? c[field].length
                     : (field === 'pronunciation') ? c[field].replace(/ /g, '').length
                     : 0;
            if (cLen === targetLen) { sameLen.push(c); } else { diffLen.push(c); }
        } else {
            diffLen.push(c);
        }
    }
    shuffleArray(sameLen);
    shuffleArray(diffLen);

    var pool = sameLen.concat(diffLen);
    var result = [];
    var seen = new Set();
    seen.add(correctVal);
    for (var j = 0; j < pool.length && result.length < count; j++) {
        var v = pool[j][field];
        if (!seen.has(v)) {
            seen.add(v);
            result.push(v);
        }
    }
    return result;
}

function pickPronDistractors(cards, correctCard, count) {
    var correctNorm = normalizePinyin(correctCard.pronunciation);
    var correctSyl = splitPinyinSyllables(correctNorm);
    var correctBase = correctSyl.map(function (s) { return s.base; }).join('');
    var targetLen = correctCard.pronunciation.replace(/ /g, '').length;

    var toneTraps = [];
    var sameLenRegular = [];
    var diffLenRegular = [];
    var seenNorm = new Set();
    seenNorm.add(correctNorm);

    for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var cNorm = normalizePinyin(c.pronunciation);
        if (seenNorm.has(cNorm)) continue;
        seenNorm.add(cNorm);

        var cSyl = splitPinyinSyllables(cNorm);
        var cBase = cSyl.map(function (s) { return s.base; }).join('');
        var cLen = c.pronunciation.replace(/ /g, '').length;

        if (cBase === correctBase) {
            toneTraps.push(c.pronunciation);
        } else if (cLen === targetLen) {
            sameLenRegular.push(c.pronunciation);
        } else {
            diffLenRegular.push(c.pronunciation);
        }
    }
    shuffleArray(toneTraps);
    shuffleArray(sameLenRegular);
    shuffleArray(diffLenRegular);

    var trapCount = Math.min(toneTraps.length, 2);
    var result = toneTraps.slice(0, trapCount);
    var pool = sameLenRegular.concat(diffLenRegular);
    for (var j = 0; j < pool.length && result.length < count; j++) {
        result.push(pool[j]);
    }
    return result;
}

function nextMultipleChoiceQuestion() {
    cancelAutoAdvance();
    if (cards.length === 0) {
        showEmptyState('multipleChoice');
        return;
    }

    mcFeedback.textContent = '';
    mcFeedback.className = 'feedback';
    mcAnswered = false;

    var optionCount = (mcHardMode && mcHardMode.checked) ? 8 : 4;

    var questionTypes = ['meaning', 'pronunciation', 'wordMeaning', 'wordPron'];
    var questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    var correctIndex = Math.floor(Math.random() * cards.length);
    var correctCard = cards[correctIndex];

    var questionText, correctValue, optionField, matchLen, acceptableValues, distractors;

    if (questionType === 'meaning') {
        questionText = t('mc.qMeaning', { meaning: correctCard.meaning });
        correctValue = correctCard.word;
        optionField = 'word';
        matchLen = false;
    } else if (questionType === 'pronunciation') {
        questionText = t('mc.qPron', { pron: correctCard.pronunciation });
        correctValue = correctCard.word;
        optionField = 'word';
        matchLen = true;
        var correctNormPron = normalizePinyin(correctCard.pronunciation);
        acceptableValues = new Set();
        acceptableValues.add(correctValue);
        for (var k = 0; k < cards.length; k++) {
            if (normalizePinyin(cards[k].pronunciation) === correctNormPron) {
                acceptableValues.add(cards[k].word);
            }
        }
    } else if (questionType === 'wordMeaning') {
        questionText = t('mc.qWordMeaning', { word: correctCard.word });
        correctValue = correctCard.meaning;
        optionField = 'meaning';
        matchLen = false;
    } else {
        questionText = t('mc.qWordPron', { word: correctCard.word });
        correctValue = correctCard.pronunciation;
        optionField = 'pronunciation';
        matchLen = true;
    }

    mcQuestion.textContent = questionText;

    if (questionType === 'wordPron') {
        distractors = pickPronDistractors(cards, correctCard, optionCount - 1);
    } else if (questionType === 'pronunciation') {
        distractors = pickDistractors(cards, correctCard, optionField, optionCount - 1, matchLen, normalizePinyin(correctCard.pronunciation));
    } else {
        distractors = pickDistractors(cards, correctCard, optionField, optionCount - 1, matchLen);
    }
    var options = [correctValue].concat(distractors);
    shuffleArray(options);

    mcOptions.innerHTML = '';
    options.forEach(function (val) {
        var button = document.createElement('button');
        button.className = 'option';
        button.textContent = val;
        button.addEventListener('click', function () {
            checkMultipleChoiceAnswer(val, correctValue, button);
        });
        mcOptions.appendChild(button);
    });

    currentMCQuestion = { correctValue: correctValue, acceptableValues: acceptableValues || null };
}

function checkMultipleChoiceAnswer(selectedValue, correctValue, button) {
    if (mcAnswered || button.classList.contains('disabled')) return;

    var acceptable = currentMCQuestion.acceptableValues;
    var isCorrect = acceptable ? acceptable.has(selectedValue) : (selectedValue === correctValue);

    if (isCorrect) {
        mcAnswered = true;
        button.classList.add('correct');
        var allButtons = mcOptions.querySelectorAll('.option');
        allButtons.forEach(function (btn) {
            btn.classList.add('disabled');
            if (acceptable && acceptable.has(btn.textContent)) btn.classList.add('correct');
        });

        mcFeedback.textContent = t('mc.correct');
        mcFeedback.className = 'feedback correct';
        startAutoAdvance(mcNextBtn, nextMultipleChoiceQuestion, 3);
        if (mcNextBtn) mcNextBtn.focus();
    } else {
        button.classList.add('incorrect', 'disabled');

        var remainingBtns = mcOptions.querySelectorAll('.option:not(.disabled)');
        var allRemainingAcceptable = true;
        remainingBtns.forEach(function (btn) {
            if (!acceptable || !acceptable.has(btn.textContent)) {
                allRemainingAcceptable = false;
            }
        });

        if (remainingBtns.length === 0 || (remainingBtns.length <= 1 && !acceptable) || allRemainingAcceptable) {
            mcAnswered = true;
            var allButtons = mcOptions.querySelectorAll('.option');
            allButtons.forEach(function (btn) {
                btn.classList.add('disabled');
                if (btn.textContent === correctValue) btn.classList.add('correct');
                if (acceptable && acceptable.has(btn.textContent)) btn.classList.add('correct');
            });
            mcFeedback.textContent = t('mc.wrong', { word: correctValue });
            mcFeedback.className = 'feedback incorrect';
        } else {
            mcFeedback.textContent = t('mc.tryAgain');
            mcFeedback.className = 'feedback incorrect';
        }
    }
}

// Pronunciation functions
let currentWPQuestion = null;

function initPronunciation() {
    if (cards.length === 0) return;
    nextPronunciationQuestion();
}

function nextPronunciationQuestion() {
    cancelAutoAdvance();
    if (cards.length === 0) {
        showEmptyState('pronunciation');
        return;
    }
    
    // Clear previous feedback and input
    wpFeedback.textContent = '';
    wpFeedback.className = 'feedback';
    wpAnswer.value = '';
    
    // Select a random card
    const randomIndex = Math.floor(Math.random() * cards.length);
    const card = cards[randomIndex];
    
    // Create question
    wpQuestion.textContent = t('wp.question', { word: card.word });
    
    currentWPQuestion = { 
        correctPronunciation: card.pronunciation,
        word: card.word
    };
    if (wpAnswer) wpAnswer.focus();
}

function checkPronunciationAnswer() {
    if (!currentWPQuestion) return;
    
    const userAnswer = wpAnswer.value.trim().toLowerCase();
    const correctAnswer = currentWPQuestion.correctPronunciation.toLowerCase();
    
    const normalizedUser = normalizePinyin(userAnswer);
    const normalizedCorrect = normalizePinyin(correctAnswer);
    
    const isCorrect = normalizedUser === normalizedCorrect;
    
    if (isCorrect) {
        wpFeedback.textContent = t('wp.correct');
        wpFeedback.className = 'feedback correct';
        startAutoAdvance(wpNextBtn, nextPronunciationQuestion, 3);
        if (wpNextBtn) wpNextBtn.focus();
    } else {
        wpFeedback.textContent = t('wp.wrong', { pron: currentWPQuestion.correctPronunciation });
        var diffEl = document.createElement('div');
        diffEl.className = 'pinyin-diff';
        diffEl.innerHTML = buildPinyinDiff(normalizedUser, normalizedCorrect);
        wpFeedback.appendChild(diffEl);
        wpFeedback.className = 'feedback incorrect';
    }
}

// Writing/spelling functions
let currentWSQuestion = null;
let _wsHanziWriter = null;
let _wsHanziQuizToken = 0;
let _wsHanziChars = [];
let _wsHanziCharIndex = 0;
let _wsHanziMistakes = 0;
let _wsHanziOutlineShown = false;
let _wsHanziStrokeTotal = 0;
const WS_HAN_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const WS_HINT_STROKE_LABEL_THRESHOLD = 5;
const WS_HINT_OUTLINE_THRESHOLD = 10;

function getHanziCharsFromWord(word) {
    return Array.from(String(word || '').trim()).filter(function (ch) {
        return WS_HAN_RE.test(ch);
    });
}

function clearHanziWriterQuiz() {
    _wsHanziQuizToken++;
    _wsHanziWriter = null;
    _wsHanziChars = [];
    _wsHanziCharIndex = 0;
    _wsHanziMistakes = 0;
    _wsHanziOutlineShown = false;
    _wsHanziStrokeTotal = 0;
    if (wsHanziTarget) wsHanziTarget.innerHTML = '';
    if (wsHanziDone) wsHanziDone.innerHTML = '';
    if (wsHanziHint) {
        wsHanziHint.textContent = '';
        wsHanziHint.classList.add('hidden');
    }
}

function updateWritingModeUI() {
    const hanziQuizMode = !!(wsUseHanziQuiz && wsUseHanziQuiz.checked);
    if (wsAnswer) wsAnswer.classList.toggle('hidden', hanziQuizMode);
    if (wsSubmitBtn) wsSubmitBtn.classList.toggle('hidden', hanziQuizMode);
    if (hwToggleBtn) hwToggleBtn.classList.toggle('hidden', hanziQuizMode);
    if (hwPanel) hwPanel.classList.add('hidden');
    if (hwToggleBtn) hwToggleBtn.classList.remove('active');
    if (wsHanziQuizPanel) wsHanziQuizPanel.classList.toggle('hidden', !hanziQuizMode);
    if (!hanziQuizMode && wsHanziHint) {
        wsHanziHint.textContent = '';
        wsHanziHint.classList.add('hidden');
    }
}

function renderCompletedHanziChar(ch) {
    if (!wsHanziDone || !window.HanziWriter || typeof HanziWriter.create !== 'function') return;
    var prevItems = Array.prototype.slice.call(wsHanziDone.querySelectorAll('.ws-hanzi-done-item'));
    var firstRects = prevItems.map(function (el) {
        return el.getBoundingClientRect();
    });

    var slot = document.createElement('div');
    slot.className = 'ws-hanzi-done-item ws-hanzi-done-item--enter';
    wsHanziDone.appendChild(slot);
    try {
        var w = HanziWriter.create(slot, ch, {
            width: 220,
            height: 220,
            padding: 2,
            showOutline: false,
            showCharacter: true
        });
        if (w && typeof w.showCharacter === 'function') {
            w.showCharacter({ duration: 180 });
        }
    } catch (_) {
        slot.textContent = ch;
    }

    var reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !prevItems.length) return;

    var durationMs = 260;
    var ease = 'cubic-bezier(0.33, 0, 0.2, 1)';

    function clearSlideShift(el) {
        el.style.transition = '';
        el.style.transform = '';
    }

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            prevItems.forEach(function (el, i) {
                var a = firstRects[i];
                var b = el.getBoundingClientRect();
                var dx = a.left - b.left;
                if (Math.abs(dx) < 0.5) return;
                el.style.transition = 'none';
                el.style.transform = 'translateX(' + dx + 'px)';
            });
            void wsHanziDone.offsetHeight;
            requestAnimationFrame(function () {
                prevItems.forEach(function (el) {
                    if (!el.style.transform) return;
                    el.style.transition = 'transform ' + durationMs + 'ms ' + ease;
                    el.style.transform = 'translateX(0)';
                });
                window.setTimeout(function () {
                    prevItems.forEach(clearSlideShift);
                }, durationMs + 50);
            });
        });
    });
}

function showHanziStrokeHint(strokeNum) {
    if (!wsHanziHint) return;
    var cur = strokeNum > 0 ? strokeNum : '?';
    var total = _wsHanziStrokeTotal > 0 ? _wsHanziStrokeTotal : '?';
    wsHanziHint.textContent = t('ws.hwStrokeHint', { cur: cur, total: total });
    wsHanziHint.classList.remove('hidden');
}

function hideHanziStrokeHint() {
    if (!wsHanziHint) return;
    wsHanziHint.textContent = '';
    wsHanziHint.classList.add('hidden');
}

function loadStrokeTotalForCurrentChar(ch) {
    _wsHanziStrokeTotal = 0;
    if (!window.HanziWriter || typeof HanziWriter.loadCharacterData !== 'function') return;
    HanziWriter.loadCharacterData(ch).then(function (data) {
        var strokes = data && data.strokes;
        if (Array.isArray(strokes)) _wsHanziStrokeTotal = strokes.length;
    }).catch(function () {});
}

function runCurrentHanziStep(onWordDone) {
    if (_wsHanziCharIndex >= _wsHanziChars.length) {
        onWordDone();
        return;
    }
    var ch = _wsHanziChars[_wsHanziCharIndex];
    loadStrokeTotalForCurrentChar(ch);
    startHanziWriterCharQuiz(function () {
        if (_wsHanziCharIndex < _wsHanziChars.length - 1) {
            renderCompletedHanziChar(ch);
        }
        _wsHanziCharIndex++;
        runCurrentHanziStep(onWordDone);
    });
}

function startHanziWriterCharQuiz(onDone) {
    if (!wsHanziTarget) return false;
    if (!window.HanziWriter || typeof HanziWriter.create !== 'function') {
        wsFeedback.textContent = t('ws.hwUnavailable');
        wsFeedback.className = 'feedback incorrect';
        return false;
    }
    if (!_wsHanziChars.length || _wsHanziCharIndex < 0 || _wsHanziCharIndex >= _wsHanziChars.length) return false;
    _wsHanziQuizToken++;
    const token = _wsHanziQuizToken;
    _wsHanziMistakes = 0;
    _wsHanziOutlineShown = false;
    wsHanziTarget.innerHTML = '';
    hideHanziStrokeHint();
    var character = _wsHanziChars[_wsHanziCharIndex];
    try {
        _wsHanziWriter = HanziWriter.create(wsHanziTarget, character, {
            width: 220,
            height: 220,
            padding: 6,
            showOutline: false,
            showCharacter: false,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 80
        });
        _wsHanziWriter.quiz({
            showHintAfterMisses: 1,
            highlightOnComplete: true,
            onCorrectStroke: function (info) {
                if (token !== _wsHanziQuizToken) return;
                if (_wsHanziMistakes >= WS_HINT_STROKE_LABEL_THRESHOLD) {
                    var strokeNum = 0;
                    if (info && typeof info.strokeNum === 'number') strokeNum = info.strokeNum + 1;
                    showHanziStrokeHint(strokeNum);
                }
            },
            onMistake: function (info) {
                if (token !== _wsHanziQuizToken) return;
                _wsHanziMistakes++;
                if (_wsHanziMistakes === WS_HINT_STROKE_LABEL_THRESHOLD) {
                    var strokeNum = 0;
                    if (info && typeof info.strokeNum === 'number') strokeNum = info.strokeNum + 1;
                    showHanziStrokeHint(strokeNum);
                }
                if (!_wsHanziOutlineShown && _wsHanziMistakes >= WS_HINT_OUTLINE_THRESHOLD) {
                    _wsHanziOutlineShown = true;
                    if (_wsHanziWriter && typeof _wsHanziWriter.showOutline === 'function') {
                        _wsHanziWriter.showOutline();
                    }
                }
            },
            onComplete: function () {
                if (token !== _wsHanziQuizToken) return;
                hideHanziStrokeHint();
                if (onDone) onDone();
            }
        });
        return true;
    } catch (_) {
        wsFeedback.textContent = t('ws.hwUnavailable');
        wsFeedback.className = 'feedback incorrect';
        return false;
    }
}

function initWriting() {
    if (cards.length === 0) return;
    updateWritingModeUI();
    nextSpellingQuestion();
}

function nextSpellingQuestion() {
    cancelAutoAdvance();
    if (cards.length === 0) {
        showEmptyState('writing');
        return;
    }
    const hanziQuizMode = !!(wsUseHanziQuiz && wsUseHanziQuiz.checked);
    updateWritingModeUI();
    clearHanziWriterQuiz();

    // Clear previous feedback and input
    wsFeedback.textContent = '';
    wsFeedback.className = 'feedback';
    if (wsAnswer) wsAnswer.value = '';

    const pool = cards;
    if (pool.length === 0) {
        wsQuestion.textContent = t('empty.title');
        wsFeedback.textContent = t('empty.text');
        wsFeedback.className = 'feedback incorrect';
        return;
    }

    // Randomly select a question type
    const questionTypes = ['meaning', 'pronunciation'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    // Select a random card
    const randomIndex = Math.floor(Math.random() * pool.length);
    const card = pool[randomIndex];

    // Create question
    if (questionType === 'meaning') {
        wsQuestion.textContent = t('ws.qMeaning', { meaning: card.meaning });
    } else {
        wsQuestion.textContent = t('ws.qPron', { pron: card.pronunciation });
    }
    
    currentWSQuestion = { 
        correctSpelling: card.word,
        questionType: questionType,
        hanziQuizMode: hanziQuizMode
    };

    if (hanziQuizMode) {
        _wsHanziChars = getHanziCharsFromWord(card.word);
        _wsHanziCharIndex = 0;
        if (wsHanziDone) wsHanziDone.innerHTML = '';
        if (_wsHanziChars.length === 0) {
            wsFeedback.textContent = t('ws.noHanziInWord');
            wsFeedback.className = 'feedback incorrect';
        } else {
            runCurrentHanziStep(function () {
                wsFeedback.textContent = t('ws.correct');
                wsFeedback.className = 'feedback correct';
                startAutoAdvance(wsNextBtn, nextSpellingQuestion, 2);
                if (wsNextBtn) wsNextBtn.focus();
            });
        }
    } else if (wsAnswer) {
        wsAnswer.focus();
    }
}

function checkSpellingAnswer() {
    if (!currentWSQuestion) return;
    if (currentWSQuestion.hanziQuizMode) return;
    
    const userAnswer = wsAnswer.value.trim();
    const correctAnswer = currentWSQuestion.correctSpelling;
    
    const isCorrect = userAnswer === correctAnswer;
    
    if (isCorrect) {
        wsFeedback.textContent = t('ws.correct');
        wsFeedback.className = 'feedback correct';
        startAutoAdvance(wsNextBtn, nextSpellingQuestion, 3);
        if (wsNextBtn) wsNextBtn.focus();
    } else {
        wsFeedback.textContent = t('ws.wrong', { word: correctAnswer });
        wsFeedback.className = 'feedback incorrect';
    }
}

// Utility functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Auto-advance timer (starts countdown after a correct answer)
var _autoAdvanceInterval = null;
var _autoAdvanceBtn = null;
var _autoAdvanceBtnText = null;

function cancelAutoAdvance() {
    if (_autoAdvanceInterval) {
        clearInterval(_autoAdvanceInterval);
        _autoAdvanceInterval = null;
    }
    if (_autoAdvanceBtn) {
        _autoAdvanceBtn.textContent = _autoAdvanceBtnText;
        _autoAdvanceBtn = null;
        _autoAdvanceBtnText = null;
    }
}

function startAutoAdvance(nextBtn, nextFn, seconds) {
    cancelAutoAdvance();
    if (!nextBtn) return;

    _autoAdvanceBtn = nextBtn;
    _autoAdvanceBtnText = nextBtn.textContent;

    var remaining = seconds;
    nextBtn.textContent = _autoAdvanceBtnText + ' (' + remaining + ')';

    _autoAdvanceInterval = setInterval(function () {
        remaining--;
        if (remaining > 0) {
            nextBtn.textContent = _autoAdvanceBtnText + ' (' + remaining + ')';
        } else {
            cancelAutoAdvance();
            nextFn();
        }
    }, 1000);
}

function normalizePinyin(pinyin) {
    return pinyin
        .replace(/ /g, '')
        .replace(/ā/g, 'a1').replace(/á/g, 'a2').replace(/ǎ/g, 'a3').replace(/à/g, 'a4')
        .replace(/ē/g, 'e1').replace(/é/g, 'e2').replace(/ě/g, 'e3').replace(/è/g, 'e4')
        .replace(/ī/g, 'i1').replace(/í/g, 'i2').replace(/ǐ/g, 'i3').replace(/ì/g, 'i4')
        .replace(/ō/g, 'o1').replace(/ó/g, 'o2').replace(/ǒ/g, 'o3').replace(/ò/g, 'o4')
        .replace(/ū/g, 'u1').replace(/ú/g, 'u2').replace(/ǔ/g, 'u3').replace(/ù/g, 'u4')
        .replace(/ǖ/g, 'v1').replace(/ǘ/g, 'v2').replace(/ǚ/g, 'v3').replace(/ǜ/g, 'v4')
        .replace(/([1-4])([aeiou\u00fc]*(ng|n(?![aeiou\u00fc])|r(?![aeiou\u00fc]))?)/g, '$2$1')
        .replace(/([a-z\u00fc])[05]/g, '$1')
        .toLowerCase();
}

function splitPinyinSyllables(normalized) {
    var result = [];
    var re = /([a-z\u00fc]+)([1-4])?/g;
    var m;
    while ((m = re.exec(normalized)) !== null) {
        result.push({ base: m[1], tone: m[2] || '' });
    }
    return result;
}

function buildPinyinDiff(userNorm, correctNorm) {
    var userSyl = splitPinyinSyllables(userNorm);
    var correctSyl = splitPinyinSyllables(correctNorm);
    var html = '';

    for (var i = 0; i < correctSyl.length; i++) {
        var cb = correctSyl[i].base;
        var ct = correctSyl[i].tone;
        var ub = i < userSyl.length ? userSyl[i].base : '';
        var ut = i < userSyl.length ? userSyl[i].tone : '';

        if (cb === ub && ct === ut) {
            html += '<span class="diff-ok">' + cb + ct + '</span>';
        } else if (cb === ub) {
            html += '<span class="diff-ok">' + cb + '</span>';
            html += '<span class="diff-wrong">' + (ct || '∅') + '</span>';
        } else {
            html += '<span class="diff-wrong">' + cb + ct + '</span>';
        }
    }

    return html;
}

// ── Handwriting input (Google Input Tools API) ──
var _hwBoard = null;

var GOOGLE_HW_API = 'https://inputtools.google.com/request?ime=handwriting&app=wordcards';

function toggleHandwritePanel() {
    if (!hwPanel || !hwToggleBtn) return;
    hwPanel.classList.toggle('hidden');
    hwToggleBtn.classList.toggle('active');
    if (!_hwBoard && hwCanvasEl) {
        _hwBoard = createDrawingBoard(hwCanvasEl, onHwStrokeChange);
    }
}

function onHwStrokeChange(strokes) {
    if (!hwCandidatesEl) return;
    hwCandidatesEl.innerHTML = '';
    if (strokes.length === 0) return;

    var ink = strokes.map(function (s) {
        var xs = [], ys = [], ts = [];
        for (var i = 0; i < s.length; i++) {
            xs.push(s[i][0]);
            ys.push(s[i][1]);
            ts.push(s[i][2]);
        }
        return [xs, ys, ts];
    });

    var payload = JSON.stringify({
        options: 'enable_pre_space',
        requests: [{
            writing_guide: { writing_area_width: 200, writing_area_height: 200 },
            ink: ink,
            language: 'zh',
            max_num_results: 8,
            max_completions: 0
        }]
    });

    fetch(GOOGLE_HW_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        hwCandidatesEl.innerHTML = '';
        if (data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) return;
        var chars = data[1][0][1] || [];
        chars.forEach(function (ch) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hw-candidate';
            btn.textContent = ch;
            btn.addEventListener('click', function () {
                if (wsAnswer) {
                    wsAnswer.value += ch;
                    wsAnswer.focus();
                }
                if (_hwBoard) _hwBoard.clear();
            });
            hwCandidatesEl.appendChild(btn);
        });
    })
    .catch(function () {});
}

function createDrawingBoard(canvas, onStrokeChange) {
    var ctx = canvas.getContext('2d');
    var strokes = [];
    var currentStroke = null;
    var drawing = false;
    var strokeStart = 0;

    function getPos(e) {
        var rect = canvas.getBoundingClientRect();
        var cx, cy;
        if (e.touches && e.touches.length) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        return [
            (cx - rect.left) * (canvas.width / rect.width),
            (cy - rect.top) * (canvas.height / rect.height),
            Date.now() - strokeStart
        ];
    }

    function startStroke(e) {
        drawing = true;
        strokeStart = Date.now();
        var p = getPos(e);
        p[2] = 0;
        currentStroke = [p];
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
    }

    function continueStroke(e) {
        if (!drawing) return;
        var p = getPos(e);
        currentStroke.push(p);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
    }

    function endStroke() {
        if (!drawing) return;
        drawing = false;
        if (currentStroke && currentStroke.length > 1) {
            strokes.push(currentStroke);
        }
        currentStroke = null;
        if (onStrokeChange) onStrokeChange(cloneStrokes());
    }

    function cloneStrokes() {
        return strokes.map(function (s) {
            return s.map(function (p) { return [p[0], p[1], p[2]]; });
        });
    }

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGuides();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        for (var si = 0; si < strokes.length; si++) {
            var s = strokes[si];
            ctx.beginPath();
            ctx.moveTo(s[0][0], s[0][1]);
            for (var pi = 1; pi < s.length; pi++) {
                ctx.lineTo(s[pi][0], s[pi][1]);
            }
            ctx.stroke();
        }
    }

    function drawGuides() {
        var w = canvas.width, h = canvas.height;
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.moveTo(0, 0); ctx.lineTo(w, h);
        ctx.moveTo(w, 0); ctx.lineTo(0, h);
        ctx.stroke();
    }

    canvas.addEventListener('mousedown', startStroke);
    canvas.addEventListener('mousemove', continueStroke);
    canvas.addEventListener('mouseup', endStroke);
    canvas.addEventListener('mouseleave', function () { if (drawing) endStroke(); });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); startStroke(e); });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); continueStroke(e); });
    canvas.addEventListener('touchend', function (e) { e.preventDefault(); endStroke(); });

    drawGuides();

    return {
        cloneStrokes: cloneStrokes,
        undo: function () {
            strokes.pop();
            redraw();
            if (onStrokeChange) onStrokeChange(cloneStrokes());
        },
        clear: function () {
            strokes = [];
            redraw();
            if (onStrokeChange) onStrokeChange(cloneStrokes());
        }
    };
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);