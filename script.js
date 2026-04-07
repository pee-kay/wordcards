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
let isRandomized = false;
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
const flipCardBtn = document.getElementById('flipCard');
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
    if (flipCardBtn) flipCardBtn.addEventListener('click', flipCard);
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

function initWriting() {
    if (cards.length === 0) return;
    nextSpellingQuestion();
}

function nextSpellingQuestion() {
    cancelAutoAdvance();
    if (cards.length === 0) {
        showEmptyState('writing');
        return;
    }
    
    // Clear previous feedback and input
    wsFeedback.textContent = '';
    wsFeedback.className = 'feedback';
    wsAnswer.value = '';
    
    // Randomly select a question type
    const questionTypes = ['meaning', 'pronunciation'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    // Select a random card
    const randomIndex = Math.floor(Math.random() * cards.length);
    const card = cards[randomIndex];
    
    // Create question
    if (questionType === 'meaning') {
        wsQuestion.textContent = t('ws.qMeaning', { meaning: card.meaning });
    } else {
        wsQuestion.textContent = t('ws.qPron', { pron: card.pronunciation });
    }
    
    currentWSQuestion = { 
        correctSpelling: card.word,
        questionType: questionType
    };
    if (wsAnswer) wsAnswer.focus();
}

function checkSpellingAnswer() {
    if (!currentWSQuestion) return;
    
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);