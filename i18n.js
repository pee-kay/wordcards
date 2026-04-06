(function (global) {
    'use strict';

    const STORAGE_KEY = 'wordcards_locale';
    const FALLBACK = 'en';

    const STRINGS = {
        en: {
            'lang.label': 'Language',
            'lang.en': 'EN',
            'lang.ru': 'RU',

            'nav.aria': 'Site',
            'nav.wordCards': 'Word cards',
            'nav.radicals': 'Missing strokes / radicals',
            'nav.strokes': 'Stroke order',

            'index.documentTitle': 'Word Cards',
            'index.h1': 'Word Cards',
            'index.subtitle':
                'Study vocabulary with flashcards, quizzes, and a simple CSV editor. The same card format is used on the other practice pages.',
            'index.selectMode': 'Select mode',
            'mode.flashcard': 'Flashcards',
            'mode.multipleChoice': 'Multiple choice',
            'mode.pronunciation': 'Pronunciation',
            'mode.writing': 'Writing',
            'mode.editor': 'Editor',
            'index.editorTitle': 'Card editor',
            'index.editorHelp':
                'Enter cards in CSV format: word,pronunciation,meaning (one per line)',
            'index.wordInputPlaceholder':
                'Example:\n谢谢,xièxie,thank you\n再见,zàijiàn,goodbye\n你好,nǐhǎo,hello',
            'index.update': 'Update',
            'index.export': 'Export',
            'index.import': 'Import',
            'index.clear': 'Clear',
            'index.noCards': 'No cards loaded',
            'index.loadedSession': 'Loaded {count} cards from previous session',
            'index.loadedCount': 'Loaded {count} cards',
            'index.editorWarning':
                'Changes detected. Click «Update» to apply changes.',
            'flashcard.title': 'Flashcard mode',
            'flashcard.word': 'Word',
            'flashcard.pronunciation': 'Pronunciation',
            'flashcard.meaning': 'Meaning',
            'flashcard.randomize': 'Randomize order',
            'flashcard.first': 'First',
            'flashcard.prev': 'Previous',
            'flashcard.flip': 'Flip card',
            'flashcard.next': 'Next',
            'flashcard.last': 'Last',
            'flashcard.position': 'Card {cur} of {total}',
            'mc.title': 'Multiple choice',
            'mc.question': 'Question',
            'mc.next': 'Next question',
            'mc.qMeaning': 'Which word means «{meaning}»?',
            'mc.qPron': 'Which word is pronounced «{pron}»?',
            'mc.correct': 'Correct!',
            'mc.wrong': 'Incorrect. The correct answer is: {word}',
            'wp.title': 'Pronunciation',
            'wp.placeholder': 'Enter pronunciation',
            'wp.check': 'Check answer',
            'wp.next': 'Next word',
            'wp.question': 'How is «{word}» pronounced?',
            'wp.correct': 'Correct!',
            'wp.wrong': 'Incorrect. The correct pronunciation is: {pron}',
            'ws.title': 'Writing / spelling',
            'ws.placeholder': 'Write the word',
            'ws.check': 'Check answer',
            'ws.next': 'Next word',
            'ws.qMeaning': 'How do you write the word that means «{meaning}»?',
            'ws.qPron': 'How do you write the word pronounced «{pron}»?',
            'ws.correct': 'Correct!',
            'ws.wrong': 'Incorrect. The correct spelling is: {word}',
            'empty.title': 'No cards available',
            'empty.text': 'Please add some word cards in Editor mode first.',
            'empty.goEditor': 'Go to editor',
            'alert.enterCards': 'Please enter some word cards',
            'alert.noValidCards': 'No valid cards found. Please check your input format.',
            'alert.nothingExport': 'Nothing to export',
            'confirm.clear': 'Are you sure you want to clear all cards?',

            'radicals.documentTitle': 'Missing strokes / radicals practice',
            'radicals.h1': 'Missing strokes / radicals practice',
            'radicals.subtitle':
                'Build a printable grid from your word list. Each cell shows a character with chosen strokes hidden (from <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> stroke data) and its pinyin.',
            'radicals.wordList': 'Word list',
            'radicals.wordListHelp':
                'Word Cards style: <code>word,pronunciation,meaning</code> per line; or <code>word,pronunciation</code>; or a <strong>single column</strong> (one entry per line—character or word). Missing pinyin is filled with <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> when the script loads (needs network). You can also use <strong>space-separated</strong> syllables in the pronunciation field to match the Chinese characters in each word.',
            'radicals.wordInputPlaceholder': '谢\n谢\n好\nor: 谢谢,xiè xie,thank you',
            'radicals.export': 'Export CSV',
            'radicals.import': 'Import CSV',
            'radicals.gridSection': 'Grid & PDF',
            'radicals.whatToHide': 'What to hide',
            'radicals.optRadical': 'Radical (all strokes marked as radical in the dataset)',
            'radicals.optSingle': 'Single stroke (random)',
            'radicals.optMultiple': 'Multiple strokes (random, 2–5 or fewer if needed)',
            'radicals.columns': 'Columns',
            'radicals.shuffle': 'Shuffle character order',
            'radicals.answerKey': 'Second page: answer key (full characters)',
            'radicals.generate': 'Generate',
            'radicals.statsNone': 'No characters yet',
            'radicals.hideHelp':
                'Radical mode uses <code>radStrokes</code> from the character file. If a character has no radical list, a random single stroke is hidden instead. Changing <strong>What to hide</strong> refreshes the preview automatically.',
            'radicals.loading': 'Loading character stroke data…',
            'radicals.preview': 'Preview',
            'radicals.previewHelp':
                'Use your browser’s print dialog and choose «Save as PDF». Landscape often fits more columns. Characters without Hanzi Writer data use a simple font mask instead.',
            'radicals.sheetExercise': 'Fill in the missing parts — character practice',
            'radicals.sheetAnswers': 'Answer key',
            'radicals.warnEmpty': 'Add at least one non-empty line (single column, or word,pronunciation[,meaning]).',
            'radicals.warnNoHanzi': 'No Chinese characters found in the word column.',
            'radicals.statsNoHanzi': 'No Chinese characters',
            'radicals.warnPinyin':
                'Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.',
            'radicals.warnNoHw':
                'Hanzi Writer did not load; using the simple font mask for every character (stroke layout needs the library script).',
            'radicals.warnStrokeFallback':
                '{n} character instance(s) use the simple mask (missing stroke JSON, blocked network, or Hanzi Writer script needed for layout).',
            'radicals.warnRadicalFallback':
                '{n} character instance(s) have no radical stroke list; a random single stroke was hidden instead.',
            'radicals.statsLine': '{count} characters · hide: {hide}',
            'radicals.hide.radical': 'radical',
            'radicals.hide.single': 'single stroke',
            'radicals.hide.multiple': 'multiple strokes',
            'radicals.imgAlt': 'Character with a part hidden',
            'radicals.exportEmpty': 'Nothing to export.',

            'strokes.documentTitle': 'Stroke order practice',
            'strokes.h1': 'Stroke order practice',
            'strokes.subtitle':
                'Build a printable sheet: each character is shown step by step in correct stroke order (data from <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> / Make Me a Hanzi).',
            'strokes.wordList': 'Word list',
            'strokes.wordListHelp':
                'Same formats as the missing-strokes page: <code>word,pronunciation,meaning</code>, <code>word,pronunciation</code>, or one entry per line. Pinyin uses <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> when available. Characters must exist in Hanzi Writer’s dataset (most common simplified forms; rare characters may fail).',
            'strokes.wordInputPlaceholder': '永\n好\nor: 你好,nǐ hǎo,hello',
            'strokes.export': 'Export CSV',
            'strokes.import': 'Import CSV',
            'strokes.layoutSection': 'Layout & PDF',
            'strokes.stepsPerRow': 'Step boxes per row',
            'strokes.stepSize': 'Step size (px)',
            'strokes.showPinyin': 'Show pinyin under each character title',
            'strokes.generate': 'Generate',
            'strokes.statsNone': 'No characters yet',
            'strokes.loading': 'Loading stroke data…',
            'strokes.preview': 'Preview',
            'strokes.previewHelp':
                'Print hides the controls above. Each row under a character is stroke 1, then strokes 1–2, … until the full character.',
            'strokes.warnNoHw': 'Hanzi Writer failed to load. Check your network and refresh.',
            'strokes.statsUnavailable': 'Hanzi Writer unavailable',
            'strokes.warnEmpty': 'Add at least one non-empty line (single column, or word,pronunciation[,meaning]).',
            'strokes.warnNoHanzi': 'No Chinese characters found in the word column.',
            'strokes.statsNoHanzi': 'No Chinese characters',
            'strokes.warnPinyin':
                'Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.',
            'strokes.warnFailed':
                'No stroke data for {n} unique character(s): {sample}{more}. They are skipped below.',
            'strokes.warnMore': ' …',
            'strokes.missingData': 'Stroke data not available for this character.',
            'strokes.statsLine': '{ok} of {total} characters rendered · {steps} stroke steps total',
            'strokes.exportEmpty': 'Nothing to export.'
        },
        ru: {
            'lang.label': 'Язык',
            'lang.en': 'EN',
            'lang.ru': 'RU',

            'nav.aria': 'Сайт',
            'nav.wordCards': 'Карточки слов',
            'nav.radicals': 'Пропуски черт / ключи',
            'nav.strokes': 'Порядок черт',

            'index.documentTitle': 'Карточки слов',
            'index.h1': 'Карточки слов',
            'index.subtitle':
                'Изучайте словарь с помощью карточек, тестов и простого CSV-редактора. Тот же формат карточек используется на остальных страницах.',
            'index.selectMode': 'Режим',
            'mode.flashcard': 'Карточки',
            'mode.multipleChoice': 'Выбор ответа',
            'mode.pronunciation': 'Произношение',
            'mode.writing': 'Написание',
            'mode.editor': 'Редактор',
            'index.editorTitle': 'Редактор карточек',
            'index.editorHelp':
                'Введите карточки в формате CSV: слово,пиньинь,перевод (по одной строке)',
            'index.wordInputPlaceholder':
                'Пример:\n谢谢,xièxie,спасибо\n再见,zàijiàn,до свидания\n你好,nǐhǎo,здравствуйте',
            'index.update': 'Обновить',
            'index.export': 'Экспорт',
            'index.import': 'Импорт',
            'index.clear': 'Очистить',
            'index.noCards': 'Карточек нет',
            'index.loadedSession': 'Загружено {count} карточек из прошлой сессии',
            'index.loadedCount': 'Загружено {count} карточек',
            'index.editorWarning':
                'Есть несохранённые изменения. Нажмите «Обновить», чтобы применить.',
            'flashcard.title': 'Режим карточек',
            'flashcard.word': 'Слово',
            'flashcard.pronunciation': 'Произношение',
            'flashcard.meaning': 'Значение',
            'flashcard.randomize': 'Случайный порядок',
            'flashcard.first': 'Первая',
            'flashcard.prev': 'Назад',
            'flashcard.flip': 'Перевернуть',
            'flashcard.next': 'Вперёд',
            'flashcard.last': 'Последняя',
            'flashcard.position': 'Карточка {cur} из {total}',
            'mc.title': 'Выбор ответа',
            'mc.question': 'Вопрос',
            'mc.next': 'Следующий вопрос',
            'mc.qMeaning': 'Какое слово значит «{meaning}»?',
            'mc.qPron': 'Какое слово произносится как «{pron}»?',
            'mc.correct': 'Верно!',
            'mc.wrong': 'Неверно. Правильный ответ: {word}',
            'wp.title': 'Произношение',
            'wp.placeholder': 'Введите пиньинь',
            'wp.check': 'Проверить',
            'wp.next': 'Следующее слово',
            'wp.question': 'Как произносится «{word}»?',
            'wp.correct': 'Верно!',
            'wp.wrong': 'Неверно. Правильно: {pron}',
            'ws.title': 'Написание',
            'ws.placeholder': 'Напишите слово',
            'ws.check': 'Проверить',
            'ws.next': 'Следующее слово',
            'ws.qMeaning': 'Как написать слово со значением «{meaning}»?',
            'ws.qPron': 'Как написать слово с произношением «{pron}»?',
            'ws.correct': 'Верно!',
            'ws.wrong': 'Неверно. Правильно: {word}',
            'empty.title': 'Нет карточек',
            'empty.text': 'Сначала добавьте карточки в режиме «Редактор».',
            'empty.goEditor': 'К редактору',
            'alert.enterCards': 'Введите карточки',
            'alert.noValidCards': 'Нет подходящих строк. Проверьте формат.',
            'alert.nothingExport': 'Нечего экспортировать',
            'confirm.clear': 'Очистить все карточки?',

            'radicals.documentTitle': 'Пропуски черт и ключи',
            'radicals.h1': 'Пропуски черт и ключи',
            'radicals.subtitle':
                'Соберите сетку для печати из списка слов. В каждой ячейке — иероглиф с выбранными скрытыми чертами (данные <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a>) и пиньинь.',
            'radicals.wordList': 'Список слов',
            'radicals.wordListHelp':
                'Как в карточках: <code>слово,пиньинь,перевод</code> в строке; или <code>слово,пиньинь</code>; или <strong>один столбец</strong> (строка — иероглиф или слово). Недостающий пиньинь подставит <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> при загрузке (нужна сеть). Можно разделять слоги <strong>пробелами</strong> в поле произношения.',
            'radicals.wordInputPlaceholder': '谢\n谢\n好\nили: 谢谢,xiè xie,спасибо',
            'radicals.export': 'Экспорт CSV',
            'radicals.import': 'Импорт CSV',
            'radicals.gridSection': 'Сетка и PDF',
            'radicals.whatToHide': 'Что скрывать',
            'radicals.optRadical': 'Ключ (все черты ключа по данным)',
            'radicals.optSingle': 'Одна черта (случайно)',
            'radicals.optMultiple': 'Несколько черт (случайно, 2–5 или меньше)',
            'radicals.columns': 'Столбцов',
            'radicals.shuffle': 'Перемешать порядок иероглифов',
            'radicals.answerKey': 'Вторая страница: ответы (полные иероглифы)',
            'radicals.generate': 'Сгенерировать',
            'radicals.statsNone': 'Пока нет иероглифов',
            'radicals.hideHelp':
                'Режим ключа использует <code>radStrokes</code> из файла символа. Если списка нет, скрывается одна случайная черта. Смена <strong>Что скрывать</strong> обновляет предпросмотр.',
            'radicals.loading': 'Загрузка данных о чертах…',
            'radicals.preview': 'Предпросмотр',
            'radicals.previewHelp':
                'Печать через браузер («Сохранить как PDF»). Альбомная ориентация часто удобнее. Без данных Hanzi Writer — простая маска по шрифту.',
            'radicals.sheetExercise': 'Впишите недостающее — практика иероглифов',
            'radicals.sheetAnswers': 'Ответы',
            'radicals.warnEmpty': 'Добавьте хотя бы одну непустую строку (один столбец или слово,пиньинь[,перевод]).',
            'radicals.warnNoHanzi': 'В столбце слов нет китайских иероглифов.',
            'radicals.statsNoHanzi': 'Нет иероглифов',
            'radicals.warnPinyin':
                'Часть слогов неизвестна. Загрузите pinyin-pro (сеть) или введите слоги через пробел по числу иероглифов.',
            'radicals.warnNoHw':
                'Hanzi Writer не загрузился; для всех ячеек используется простая маска (нужен скрипт библиотеки).',
            'radicals.warnStrokeFallback':
                '{n} вхождений — простая маска (нет JSON черт, сеть или скрипт Hanzi Writer).',
            'radicals.warnRadicalFallback':
                '{n} вхождений без списка ключевых черт; скрыта одна случайная черта.',
            'radicals.statsLine': '{count} иероглифов · скрытие: {hide}',
            'radicals.hide.radical': 'ключ',
            'radicals.hide.single': 'одна черта',
            'radicals.hide.multiple': 'несколько черт',
            'radicals.imgAlt': 'Иероглиф с частично скрытыми чертами',
            'radicals.exportEmpty': 'Нечего экспортировать.',

            'strokes.documentTitle': 'Порядок черт',
            'strokes.h1': 'Порядок черт',
            'strokes.subtitle':
                'Лист для печати: каждый иероглиф по шагам в порядке черт (данные <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> / Make Me a Hanzi).',
            'strokes.wordList': 'Список слов',
            'strokes.wordListHelp':
                'Те же форматы, что на странице пропусков: <code>слово,пиньинь,перевод</code>, <code>слово,пиньинь</code> или строка на запись. Пиньинь — через <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a>. Символы должны быть в базе Hanzi Writer (чаще упрощённые).',
            'strokes.wordInputPlaceholder': '永\n好\nили: 你好,nǐ hǎo,здравствуйте',
            'strokes.export': 'Экспорт CSV',
            'strokes.import': 'Импорт CSV',
            'strokes.layoutSection': 'Макет и PDF',
            'strokes.stepsPerRow': 'Шагов в ряд',
            'strokes.stepSize': 'Размер шага (px)',
            'strokes.showPinyin': 'Пиньинь под заголовком иероглифа',
            'strokes.generate': 'Сгенерировать',
            'strokes.statsNone': 'Пока нет иероглифов',
            'strokes.loading': 'Загрузка данных о чертах…',
            'strokes.preview': 'Предпросмотр',
            'strokes.previewHelp':
                'При печати скрываются поля сверху. Под каждым иероглифом: черта 1, затем 1–2, … до целого знака.',
            'strokes.warnNoHw': 'Hanzi Writer не загрузился. Проверьте сеть и обновите страницу.',
            'strokes.statsUnavailable': 'Hanzi Writer недоступен',
            'strokes.warnEmpty': 'Добавьте хотя бы одну непустую строку (один столбец или слово,пиньинь[,перевод]).',
            'strokes.warnNoHanzi': 'В столбце слов нет китайских иероглифов.',
            'strokes.statsNoHanzi': 'Нет иероглифов',
            'strokes.warnPinyin':
                'Часть слогов неизвестна. Загрузите pinyin-pro или введите слоги через пробел.',
            'strokes.warnFailed':
                'Нет данных черт для {n} символов: {sample}{more}. Они пропущены ниже.',
            'strokes.warnMore': ' …',
            'strokes.missingData': 'Нет данных о чертах для этого символа.',
            'strokes.statsLine': '{ok} из {total} иероглифов · всего шагов: {steps}',
            'strokes.exportEmpty': 'Нечего экспортировать.'
        }
    };

    function getLocale() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            if (v === 'ru' || v === 'en') return v;
        } catch (_) {}
        return FALLBACK;
    }

    function setLocale(lang) {
        if (lang !== 'en' && lang !== 'ru') return;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (_) {}
        document.documentElement.lang = lang === 'ru' ? 'ru' : 'en';
    }

    function t(key, vars) {
        const loc = getLocale();
        let s = (STRINGS[loc] && STRINGS[loc][key]) || STRINGS[FALLBACK][key] || key;
        if (vars && typeof vars === 'object') {
            Object.keys(vars).forEach(function (k) {
                s = s.split('{' + k + '}').join(String(vars[k]));
            });
        }
        return s;
    }

    function applyStaticTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            el.innerHTML = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            el.placeholder = t(key);
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
            const key = el.getAttribute('data-i18n-aria-label');
            if (!key) return;
            el.setAttribute('aria-label', t(key));
        });
    }

    function updateLangSwitchUI() {
        const loc = getLocale();
        document.querySelectorAll('.lang-switch [data-set-lang]').forEach(function (btn) {
            const active = btn.getAttribute('data-set-lang') === loc;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function initLanguageSwitch() {
        document.querySelectorAll('.lang-switch [data-set-lang]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const lang = btn.getAttribute('data-set-lang');
                if (!lang) return;
                setLocale(lang);
                applyStaticTranslations();
                updateLangSwitchUI();
                document.dispatchEvent(new CustomEvent('wordcards:locale-changed'));
            });
        });
        updateLangSwitchUI();
    }

    function boot() {
        document.documentElement.lang = getLocale() === 'ru' ? 'ru' : 'en';
        applyStaticTranslations();
        initLanguageSwitch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    global.I18N = {
        t: t,
        getLocale: getLocale,
        setLocale: setLocale,
        applyStaticTranslations: applyStaticTranslations,
        updateLangSwitchUI: updateLangSwitchUI
    };
})(typeof window !== 'undefined' ? window : this);
