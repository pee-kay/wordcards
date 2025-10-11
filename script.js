// Global variables
let cards = [];
let currentCardIndex = 0;
let currentMode = 'flashcard';
const STORAGE_KEY = 'wordCardsData';

// DOM elements
const wordInput = document.getElementById('wordInput');
const loadCardsBtn = document.getElementById('loadCards');
const exportCardsBtn = document.getElementById('exportCards');
const importCardsBtn = document.getElementById('importCards');
const clearCardsBtn = document.getElementById('clearCards');
const fileInput = document.getElementById('fileInput');
const cardCount = document.getElementById('cardCount');
const modeBtns = document.querySelectorAll('.mode-btn');
const modeContents = document.querySelectorAll('.mode-content');

// Flashcard elements
const flashcard = document.getElementById('flashcard');
const cardWord = document.getElementById('cardWord');
const cardPronunciation = document.getElementById('cardPronunciation');
const cardMeaning = document.getElementById('cardMeaning');
const prevCardBtn = document.getElementById('prevCard');
const flipCardBtn = document.getElementById('flipCard');
const nextCardBtn = document.getElementById('nextCard');
const cardPosition = document.getElementById('cardPosition');

// Multiple choice elements
const mcQuestion = document.getElementById('mcQuestion');
const mcOptions = document.getElementById('mcOptions');
const mcFeedback = document.getElementById('mcFeedback');
const mcNextBtn = document.getElementById('mcNext');

// Write pronunciation elements
const wpQuestion = document.getElementById('wpQuestion');
const wpAnswer = document.getElementById('wpAnswer');
const wpSubmitBtn = document.getElementById('wpSubmit');
const wpFeedback = document.getElementById('wpFeedback');
const wpNextBtn = document.getElementById('wpNext');

// Write spelling elements
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
    
    // Event listeners for card management
    loadCardsBtn.addEventListener('click', loadCardsFromTextarea);
    exportCardsBtn.addEventListener('click', exportCards);
    importCardsBtn.addEventListener('click', importCards);
    clearCardsBtn.addEventListener('click', clearCards);
    fileInput.addEventListener('change', handleFileImport);
    
    // Event listeners for flashcard navigation
    prevCardBtn.addEventListener('click', showPrevCard);
    nextCardBtn.addEventListener('click', showNextCard);
    flipCardBtn.addEventListener('click', flipCard);
    flashcard.addEventListener('click', flipCard);
    
    // Event listeners for multiple choice mode
    mcNextBtn.addEventListener('click', nextMultipleChoiceQuestion);
    
    // Event listeners for write pronunciation mode
    wpSubmitBtn.addEventListener('click', checkPronunciationAnswer);
    wpNextBtn.addEventListener('click', nextPronunciationQuestion);
    
    // Event listeners for write spelling mode
    wsSubmitBtn.addEventListener('click', checkSpellingAnswer);
    wsNextBtn.addEventListener('click', nextSpellingQuestion);
    
    // Load cards from localStorage if available
    loadCardsFromStorage();
    
    // Set initial mode
    setMode('flashcard');
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
                cardCount.textContent = `Loaded ${cards.length} cards from previous session`;
                updateFlashcard();
                initMultipleChoice();
                initWritePronunciation();
                initWriteSpelling();
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

// Load cards from textarea
function loadCardsFromTextarea() {
    const input = wordInput.value.trim();
    if (!input) {
        alert('Please enter some word cards');
        return;
    }
    
    cards = [];
    const lines = input.split('\n');
    
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
            cards.push({
                word: parts[0].trim(),
                pronunciation: parts[1].trim(),
                meaning: parts[2].trim()
            });
        }
    }
    
    if (cards.length === 0) {
        alert('No valid cards found. Please check your input format.');
        return;
    }
    
    cardCount.textContent = `Loaded ${cards.length} cards`;
    currentCardIndex = 0;
    updateFlashcard();
    
    // Initialize other modes
    initMultipleChoice();
    initWritePronunciation();
    initWriteSpelling();
    
    // Save to localStorage
    saveCardsToStorage();
}

// Export cards to CSV file
function exportCards() {
    if (cards.length === 0) {
        alert('No cards to export');
        return;
    }
    
    const csvContent = cards.map(card => 
        `${card.word},${card.pronunciation},${card.meaning}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word-cards.csv';
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
    reader.onload = function(e) {
        const content = e.target.result;
        wordInput.value = content;
        loadCardsFromTextarea();
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Clear all cards
function clearCards() {
    if (confirm('Are you sure you want to clear all cards?')) {
        cards = [];
        wordInput.value = '';
        cardCount.textContent = 'No cards loaded';
        currentCardIndex = 0;
        updateFlashcard();
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        
        // Reset quiz modes
        mcFeedback.textContent = '';
        wpFeedback.textContent = '';
        wsFeedback.textContent = '';
    }
}

// Set the current learning mode
function setMode(mode) {
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
}

// Flashcard functions
function updateFlashcard() {
    if (cards.length === 0) {
        cardWord.textContent = 'No cards loaded';
        cardPronunciation.textContent = 'Add cards to begin';
        cardMeaning.textContent = 'Use the input area above';
        cardPosition.textContent = 'Card 0 of 0';
        return;
    }
    
    const card = cards[currentCardIndex];
    cardWord.textContent = card.word;
    cardPronunciation.textContent = card.pronunciation;
    cardMeaning.textContent = card.meaning;
    
    // Reset card to front
    flashcard.classList.remove('flipped');
    
    // Update position indicator
    cardPosition.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;
}

function showPrevCard() {
    if (cards.length === 0) return;
    
    currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
    updateFlashcard();
}

function showNextCard() {
    if (cards.length === 0) return;
    
    currentCardIndex = (currentCardIndex + 1) % cards.length;
    updateFlashcard();
}

function flipCard() {
    flashcard.classList.toggle('flipped');
}

// Multiple choice functions
let currentMCQuestion = null;

function initMultipleChoice() {
    if (cards.length === 0) return;
    nextMultipleChoiceQuestion();
}

function nextMultipleChoiceQuestion() {
    if (cards.length === 0) {
        mcQuestion.textContent = 'No cards loaded. Add cards to begin.';
        mcOptions.innerHTML = '';
        return;
    }
    
    // Clear previous feedback
    mcFeedback.textContent = '';
    mcFeedback.className = 'feedback';
    
    // Randomly select a question type
    const questionTypes = ['meaning', 'pronunciation'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    // Select a random card as the correct answer
    const correctIndex = Math.floor(Math.random() * cards.length);
    const correctCard = cards[correctIndex];
    
    // Create question
    if (questionType === 'meaning') {
        mcQuestion.textContent = `Which word means "${correctCard.meaning}"?`;
    } else {
        mcQuestion.textContent = `Which word is pronounced "${correctCard.pronunciation}"?`;
    }
    
    // Create options (1 correct, 3 random incorrect)
    const options = [correctCard.word];
    while (options.length < 4) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        const randomWord = cards[randomIndex].word;
        if (!options.includes(randomWord)) {
            options.push(randomWord);
        }
    }
    
    // Shuffle options
    shuffleArray(options);
    
    // Display options
    mcOptions.innerHTML = '';
    options.forEach(word => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = word;
        button.addEventListener('click', () => checkMultipleChoiceAnswer(word, correctCard.word));
        mcOptions.appendChild(button);
    });
    
    currentMCQuestion = { correctWord: correctCard.word };
}

function checkMultipleChoiceAnswer(selectedWord, correctWord) {
    const isCorrect = selectedWord === correctWord;
    
    if (isCorrect) {
        mcFeedback.textContent = 'Correct!';
        mcFeedback.className = 'feedback correct';
    } else {
        mcFeedback.textContent = `Incorrect. The correct answer is: ${correctWord}`;
        mcFeedback.className = 'feedback incorrect';
    }
}

// Write pronunciation functions
let currentWPQuestion = null;

function initWritePronunciation() {
    if (cards.length === 0) return;
    nextPronunciationQuestion();
}

function nextPronunciationQuestion() {
    if (cards.length === 0) {
        wpQuestion.textContent = 'No cards loaded. Add cards to begin.';
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
    wpQuestion.textContent = `How is "${card.word}" pronounced?`;
    
    currentWPQuestion = { 
        correctPronunciation: card.pronunciation,
        word: card.word
    };
}

function checkPronunciationAnswer() {
    if (!currentWPQuestion) return;
    
    const userAnswer = wpAnswer.value.trim().toLowerCase();
    const correctAnswer = currentWPQuestion.correctPronunciation.toLowerCase();
    
    // Normalize tone numbers (e.g., xièxie becomes xie4xie0)
    const normalizedUser = normalizePinyin(userAnswer);
    const normalizedCorrect = normalizePinyin(correctAnswer);
    
    const isCorrect = normalizedUser === normalizedCorrect;
    
    if (isCorrect) {
        wpFeedback.textContent = 'Correct!';
        wpFeedback.className = 'feedback correct';
    } else {
        wpFeedback.textContent = `Incorrect. The correct pronunciation is: ${currentWPQuestion.correctPronunciation}`;
        wpFeedback.className = 'feedback incorrect';
    }
}

// Write spelling functions
let currentWSQuestion = null;

function initWriteSpelling() {
    if (cards.length === 0) return;
    nextSpellingQuestion();
}

function nextSpellingQuestion() {
    if (cards.length === 0) {
        wsQuestion.textContent = 'No cards loaded. Add cards to begin.';
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
        wsQuestion.textContent = `How do you write the word that means "${card.meaning}"?`;
    } else {
        wsQuestion.textContent = `How do you write the word pronounced "${card.pronunciation}"?`;
    }
    
    currentWSQuestion = { 
        correctSpelling: card.word,
        questionType: questionType
    };
}

function checkSpellingAnswer() {
    if (!currentWSQuestion) return;
    
    const userAnswer = wsAnswer.value.trim();
    const correctAnswer = currentWSQuestion.correctSpelling;
    
    const isCorrect = userAnswer === correctAnswer;
    
    if (isCorrect) {
        wsFeedback.textContent = 'Correct!';
        wsFeedback.className = 'feedback correct';
    } else {
        wsFeedback.textContent = `Incorrect. The correct spelling is: ${correctAnswer}`;
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

function normalizePinyin(pinyin) {
    // Convert tone marks to numbers and remove spaces
    return pinyin
        .replace(/ /g, '')
        .replace(/ā/g, 'a1').replace(/á/g, 'a2').replace(/ǎ/g, 'a3').replace(/à/g, 'a4')
        .replace(/ē/g, 'e1').replace(/é/g, 'e2').replace(/ě/g, 'e3').replace(/è/g, 'e4')
        .replace(/ī/g, 'i1').replace(/í/g, 'i2').replace(/ǐ/g, 'i3').replace(/ì/g, 'i4')
        .replace(/ō/g, 'o1').replace(/ó/g, 'o2').replace(/ǒ/g, 'o3').replace(/ò/g, 'o4')
        .replace(/ū/g, 'u1').replace(/ú/g, 'u2').replace(/ǔ/g, 'u3').replace(/ù/g, 'u4')
        .replace(/ǖ/g, 'v1').replace(/ǘ/g, 'v2').replace(/ǚ/g, 'v3').replace(/ǜ/g, 'v4')
        .toLowerCase();
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);