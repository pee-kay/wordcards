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
            'nav.wordList': 'Word list editor',

            'wordList.presetNone': '— Choose word list —',
            'wordList.presetUnavailable': '(list unavailable)',
            'wordList.loadFailed': 'Could not load that list.',
            'wordList.needsServer':
                'Loading preset word list requires a connection to server.',
            'wordList.hide': 'Hide word list',
            'wordList.show': 'Show word list',
            'wordList.exportCsv': 'Export CSV',
            'wordList.importCsv': 'Import CSV',

            'index.documentTitle': 'Word Cards',
            'index.h1': 'Word Cards',
            'index.subtitle':
                'Study vocabulary with flashcards, quizzes, and a simple questionnaire.',
            'index.selectMode': 'Select mode',
            'mode.flashcard': 'Flashcards',
            'mode.multipleChoice': 'Multiple choice',
            'mode.pronunciation': 'Pronunciation',
            'mode.writing': 'Writing',
            'mode.editor': 'Editor',
            'index.wordList': 'Word list',
            'index.wordListHelp':
                'List words with following format <code>word,pronunciation,meaning</code> per line. After editing, switch to Flashcards or another mode to apply changes.\nThere\'re also a few already prepared word lists, that you can select here:',
            'index.wordInputPlaceholder':
                'Example:\n谢谢,xièxie,thank you\n再见,zàijiàn,goodbye\n你好,nǐhǎo,hello',
            'index.noCards': 'No cards loaded',
            'index.loadedSession': 'Loaded {count} cards from previous session',
            'index.loadedCount': 'Loaded {count} cards',
            'index.editorWarning':
                'The word list was changed. Switch to another mode to apply edits.',
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
            'mc.qWordMeaning': 'What does «{word}» mean?',
            'mc.qWordPron': 'How is «{word}» pronounced?',
            'mc.correct': 'Correct!',
            'mc.tryAgain': 'Incorrect, try again!',
            'mc.wrong': 'Incorrect. The correct answer is: {word}',
            'mc.hardMode': 'Double amount of choices',
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
            'ws.hwToggle': 'Handwriting input',
            'ws.hwUndo': 'Undo',
            'ws.hwClear': 'Clear',
            'ws.hwLoading': 'Loading handwriting recognition…',
            'ws.qMeaning': 'How do you write the word that means «{meaning}»?',
            'ws.qPron': 'How do you write the word pronounced «{pron}»?',
            'ws.correct': 'Correct!',
            'ws.wrong': 'The correct answer was supposed to be the word {word}.',
            'empty.title': 'No cards available',
            'empty.text': 'Add cards in the word list (Editor mode), then switch to this mode.',
            'empty.goEditor': 'Go to editor',
            'alert.enterCards': 'Please enter some word cards',
            'alert.noValidCards': 'No valid cards found. Please check your input format.',
            'alert.nothingExport': 'Nothing to export',
            'confirm.clear': 'Are you sure you want to clear all cards?',

            'radicals.documentTitle': 'Missing strokes / radicals practice',
            'radicals.h1': 'Missing strokes / radicals practice',
            'radicals.subtitle':
                'Generate exercise for inserting missing strokes and/or radicals. Each cell shows a character with some strokes hidden (character\'s strokes data from <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> is used).',
            'radicals.wordList': 'Word list',
            'radicals.wordListHelp':
                'List words with following format <code>word,pronunciation,meaning</code> per line.\nYou can also just enter list of chinese characters (even in single line), missing pinyin is filled with <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> when the exercise is generated (needs network).\nThere\'re also a few already prepared word lists, that you can select here:',
            'radicals.wordInputPlaceholder':
                'Example:\n谢谢,xièxie,thank you\n再见,zàijiàn,goodbye\n你好,nǐhǎo,hello\nor just simply: 谢再见你好',
            'radicals.export': 'Export CSV',
            'radicals.import': 'Import CSV',
            'radicals.gridSection': 'Parameters',
            'radicals.whatToHide': 'What to hide',
            'radicals.optRadical': 'Radical (if radical information is available)',
            'radicals.optSingle': 'Single stroke (at random)',
            'radicals.optMultiple': 'Multiple strokes (at random)',
            'radicals.columns': 'Number of columns in the grid',
            'radicals.shuffle': 'Shuffle character order',
            'radicals.answerKey': 'Show another grid with answer key (fully written characters)',
            'radicals.generate': 'Generate',
            'radicals.statsNone': 'No characters yet',
            'radicals.hideHelp':
                'When radicals are hidden, <code>radStrokes</code> from data in <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> is used. If a character has no radical list, a random single stroke is hidden instead. Changing <strong>What to hide</strong> refreshes the preview automatically.',
            'radicals.loading': 'Loading character stroke data…',
            'radicals.preview': 'Preview',
            'radicals.previewHelp':
                'Use your browser’s print dialog (Ctrl + P) and choose «Save as PDF». Landscape often fits more columns.',
            'radicals.sheetExercise': 'Fill in the missing strokes',
            'radicals.sheetAnswers': 'Full characters',
            'radicals.warnEmpty':
                'Add at least one non-empty line in word list (single column, or word,pronunciation,meaning).',
            'radicals.warnNoHanzi': 'No characters found in the word column.',
            'radicals.statsNoHanzi': 'No characters',
            'radicals.warnPinyin':
                'Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.',
            'radicals.warnNoHw':
                'Hanzi Writer did not load; using the simple font mask for every character (stroke layout needs the library script).',
            'radicals.warnStrokeFallback':
                '',
            'radicals.warnRadicalFallback':
                '{n} character have no radical stroke list; a random single stroke was hidden instead.',
            'radicals.statsLine': '{count} characters · hide: {hide}',
            'radicals.hide.radical': 'radical',
            'radicals.hide.single': 'single stroke',
            'radicals.hide.multiple': 'multiple strokes',
            'radicals.imgAlt': 'Character with a part hidden',
            'radicals.exportEmpty': 'Nothing to export.',

            'strokes.documentTitle': 'Stroke order practice',
            'strokes.h1': 'Stroke order practice',
            'strokes.subtitle':
                'Generate a printable sheet to learn strokes order. Each character is shown step by step in correct order (data from <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a> is used).',
            'strokes.wordList': 'Word list',
            'strokes.wordListHelp':
                'List words with following format <code>word,pronunciation,meaning</code> per line.\nYou can also just enter list of chinese characters (even in single line), missing pinyin is filled with <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> when the exercise is generated (needs network). Characters must exist in Hanzi Writer’s dataset (most common simplified forms; some rare characters may fail).\nThere\'re also a few already prepared word lists, that you can select here:',
            'strokes.wordInputPlaceholder':
                'Example:\n谢谢,xièxie,thank you\n再见,zàijiàn,goodbye\n你好,nǐhǎo,hello\nor just simply: 谢再见你好',
            'strokes.export': 'Export CSV',
            'strokes.import': 'Import CSV',
            'strokes.layoutSection': 'Parameters',
            'strokes.stepsPerRow': 'Step boxes per row',
            'strokes.stepSize': 'Step size (px)',
            'strokes.showPinyin': 'Show pinyin under each character title',
            'strokes.generate': 'Generate',
            'strokes.statsNone': 'No characters yet',
            'strokes.loading': 'Loading stroke data…',
            'strokes.preview': 'Preview',
            'strokes.previewHelp':
                '',
            'strokes.warnNoHw': 'Hanzi Writer failed to load. Check your network and refresh.',
            'strokes.statsUnavailable': 'Hanzi Writer unavailable',
            'strokes.warnEmpty':
                'Add at least one non-empty line in word list (single column, or word,pronunciation,meaning).',
            'strokes.warnNoHanzi': 'No characters found in the word column.',
            'strokes.statsNoHanzi': 'No characters',
            'strokes.warnPinyin':
                'Some syllables are unknown. Load pinyin-pro (network) or use space-separated pinyin matching each character in every word.',
            'strokes.warnFailed':
                'No stroke data for {n} character(s): {sample}{more}. They are skipped below.',
            'strokes.warnMore': ' …',
            'strokes.missingData': 'Stroke data not available for this character.',
            'strokes.statsLine': '{ok} of {total} characters rendered · {steps} stroke steps total',
            'strokes.exportEmpty': 'Nothing to export.',

            'wl.documentTitle': 'Word List Editor',
            'wl.h1': 'Word List Editor',
            'wl.subtitle': 'Build and edit word lists for use in flashcards, quizzes, and exercises.',
            'wl.addWords': 'Add words',
            'wl.addPlaceholder': 'Enter Chinese words separated by commas or spaces',
            'wl.addBtn': 'Add',
            'wl.toolbar': 'Tools',
            'wl.undo': 'Undo',
            'wl.redo': 'Redo',
            'wl.sort': 'Sort',
            'wl.dedup': 'Deduplicate',
            'wl.exportCsv': 'Export CSV',
            'wl.importCsv': 'Import CSV',
            'wl.clearAll': 'Clear all',
            'wl.thematic': 'Add from thematic lists',
            'wl.thematicSelect': '— Choose a thematic list —',
            'wl.thematicHide': 'Hide words',
            'wl.thematicShow': 'Show words',
            'wl.thematicAddAll': 'Add all',
            'wl.table': 'Word list',
            'wl.colNum': '#',
            'wl.colWord': 'Word',
            'wl.colPinyin': 'Pinyin',
            'wl.colTranslation': 'Translation',
            'wl.colActions': 'Actions',
            'wl.empty': 'No words yet. Add words above or import a CSV file.',
            'wl.dedupResult': 'Removed {n} duplicate(s).',
            'wl.dedupNone': 'No duplicates found.',
            'wl.confirmClear': 'Remove all {n} words from the list?',
            'wl.statsLine': '{n} word(s) in the list'
        },
        ru: {
            'lang.label': 'Язык',
            'lang.en': 'EN',
            'lang.ru': 'RU',

            'nav.aria': 'Сайт',
            'nav.wordCards': 'Карточки слов',
            'nav.radicals': 'Пропуски черт / ключей',
            'nav.strokes': 'Порядок черт',
            'nav.wordList': 'Редактор списка слов',

            'wordList.presetNone': '— Выберите список слов —',
            'wordList.presetUnavailable': '(список недоступен)',
            'wordList.loadFailed': 'Не удалось загрузить список.',
            'wordList.needsServer':
                'Чтобы подгружать списки слов, необходимо подключение к серверу.',
            'wordList.hide': 'Скрыть список слов',
            'wordList.show': 'Показать список слов',
            'wordList.exportCsv': 'Экспорт CSV',
            'wordList.importCsv': 'Импорт CSV',

            'index.documentTitle': 'Карточки слов',
            'index.h1': 'Карточки слов',
            'index.subtitle':
                'Изучайте слова с помощью карточек, тестов и простых вопросов.',
            'index.selectMode': 'Режим',
            'mode.flashcard': 'Карточки',
            'mode.multipleChoice': 'Выбор ответа',
            'mode.pronunciation': 'Произношение',
            'mode.writing': 'Написание',
            'mode.editor': 'Редактор',
            'index.wordList': 'Список слов',
            'index.wordListHelp':
                'Введите слова в виде <code>слово,произношение,перевод</code> на каждой отдельной строчке. После внесения правок переключитесь на «Карточки» или любой другой режим, чтобы применить изменения.\nТак же вы можете подгрузить один из заранее подготовленных списков слов:',
            'index.wordInputPlaceholder':
                'Пример:\n谢谢,xièxie,спасибо\n再见,zàijiàn,до свидания\n你好,nǐhǎo,здравствуйте',
            'index.noCards': 'Карточек нет',
            'index.loadedSession': 'Загружено {count} карточек из прошлой сессии',
            'index.loadedCount': 'Загружено {count} карточек',
            'index.editorWarning':
                'Текст списка изменен. Переключитесь на другой режим, чтобы применить правки.',
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
            'flashcard.position': '{cur} карточка из {total}',
            'mc.title': 'Выбор ответа',
            'mc.question': 'Вопрос',
            'mc.next': 'Следующий вопрос',
            'mc.qMeaning': 'Какое слово означает «{meaning}»?',
            'mc.qPron': 'Какое слово произносится как «{pron}»?',
            'mc.qWordMeaning': 'Что означает «{word}»?',
            'mc.qWordPron': 'Как произносится «{word}»?',
            'mc.correct': 'Верно!',
            'mc.tryAgain': 'Неверно, попробуйте ещё!',
            'mc.wrong': 'Неверно. Правильный ответ: {word}',
            'mc.hardMode': 'Удвоить число вариантов',
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
            'ws.hwToggle': 'Рукописный ввод',
            'ws.hwUndo': 'Отменить',
            'ws.hwClear': 'Очистить',
            'ws.hwLoading': 'Загрузка распознавания рукописного ввода…',
            'ws.qMeaning': 'Как написать слово со значением «{meaning}»?',
            'ws.qPron': 'Как написать слово с произношением «{pron}»?',
            'ws.correct': 'Верно!',
            'ws.wrong': 'Правильным ответом предполагалось слово {word}.',
            'empty.title': 'Нет карточек',
            'empty.text': 'Добавьте карточки в списке слов (режим «Редактор»), затем переключитесь сюда.',
            'empty.goEditor': 'К редактору',
            'alert.enterCards': 'Введите карточки',
            'alert.noValidCards': 'Нет корректно введенных слов. Проверьте формат.',
            'alert.nothingExport': 'Нечего экспортировать',
            'confirm.clear': 'Очистить все карточки?',

            'radicals.documentTitle': 'Пропуски черт и ключей',
            'radicals.h1': 'Пропуски черт и ключей',
            'radicals.subtitle':
                'Генератор упражения для вставки пропущенных черт и/или ключей. В каждой ячейке - иероглиф с рядом пропущенных черт (для отображения используются данные о начертании иероглифов из <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a>).',
            'radicals.wordList': 'Список слов',
            'radicals.wordListHelp':
                'Введите слова в виде <code>слово,произношение,перевод</code> на каждой отдельной строчке. Поддерживается и простое перечисление необходимого набора иероглифов без пиньиня и перевода (даже в одну строчку), недостающий пиньинь подставится из <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> при обновлении таблицы (нужна сеть).\nТак же вы можете подгрузить один из заранее подготовленных списков слов:',
            'radicals.wordInputPlaceholder':
                'Пример:\n谢谢,xièxie,спасибо\n再见,zàijiàn,до свидания\n你好,nǐhǎo,здравствуйте\nили просто: 谢再见你好',
            'radicals.export': 'Экспорт CSV',
            'radicals.import': 'Импорт CSV',
            'radicals.gridSection': 'Параметры',
            'radicals.whatToHide': 'Что скрывать',
            'radicals.optRadical': 'Ключ (если есть информация о ключе)',
            'radicals.optSingle': 'Одна черта (случайно)',
            'radicals.optMultiple': 'Несколько черт (случайно)',
            'radicals.columns': 'Число столбцов в таблице',
            'radicals.shuffle': 'Перемешать порядок иероглифов',
            'radicals.answerKey': 'Показать еще одну таблицу с ответами (полностью начертанные иероглифы)',
            'radicals.generate': 'Сгенерировать',
            'radicals.statsNone': 'Нет введенных иероглифов',
            'radicals.hideHelp':
                'Когда скрываются ключи, используется информация о <code>radStrokes</code> из <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a>. Если для иероглифа нет списка ключей, скрывается одна случайная черта. Смена <strong>Что скрывать</strong> обновляет таблицу автоматически.',
            'radicals.loading': 'Загрузка данных о чертах…',
            'radicals.preview': 'Просмотр',
            'radicals.previewHelp':
                'Используйте печать страницы средствами браузера (Ctrl + P) и выберите «Сохранить как PDF». Альбомная ориентация подойдет лучше, если таблица сгенерирована на много столбцов.',
            'radicals.sheetExercise': 'Впишите недостающие черты',
            'radicals.sheetAnswers': 'Полное начертание',
            'radicals.warnEmpty':
                'Добавьте хотя бы одну непустую строку в список слов (один столбец или слово,пиньинь,перевод).',
            'radicals.warnNoHanzi': 'В столбце слов нет иероглифов.',
            'radicals.statsNoHanzi': 'Нет иероглифов',
            'radicals.warnPinyin':
                'Часть слогов неизвестна. Загрузите pinyin-pro (сеть) или введите слоги через пробел по числу иероглифов.',
            'radicals.warnNoHw':
                'Hanzi Writer не загрузился; для всех ячеек используется простая маска (нужен скрипт библиотеки).',
            'radicals.warnStrokeFallback':
                '',
            'radicals.warnRadicalFallback':
                'У {n} иероглифа(ов) нет списка ключевых черт; скрыта одна случайная черта.',
            'radicals.statsLine': '{count} иероглифов · скрытие: {hide}',
            'radicals.hide.radical': 'ключ',
            'radicals.hide.single': 'одна черта',
            'radicals.hide.multiple': 'несколько черт',
            'radicals.imgAlt': 'Иероглиф с частично скрытыми чертами',
            'radicals.exportEmpty': 'Нечего экспортировать.',

            'strokes.documentTitle': 'Порядок черт',
            'strokes.h1': 'Порядок черт',
            'strokes.subtitle':
                'Генерация таблиц для изучения порядка черт. Каждый иероглиф отображается по шагам в порядке начертания (для отображения используются данные из <a href="https://hanziwriter.org/" rel="noopener noreferrer">Hanzi Writer</a>).',
            'strokes.wordList': 'Список слов',
            'strokes.wordListHelp':
                'Введите слова в виде <code>слово,произношение,перевод</code> на каждой отдельной строчке. Поддерживается и простое перечисление необходимого набора иероглифов без пиньиня и перевода (даже в одну строчку), недостающий пиньинь подставится из <a href="https://github.com/zh-lx/pinyin-pro" rel="noopener noreferrer">pinyin-pro</a> при обновлении таблицы (нужна сеть). Информация о введенных иероглифах должна присутствовать в базе Hanzi Writer (верно для частоиспользуемых упрощённых форм, но некоторые более редкие иероглифы могут отсутствовать).\nТак же вы можете подгрузить один из заранее подготовленных списков слов:',
            'strokes.wordInputPlaceholder':
                'Пример:\n谢谢,xièxie,спасибо\n再见,zàijiàn,до свидания\n你好,nǐhǎo,здравствуйте\nили просто: 谢再见你好',
            'strokes.export': 'Экспорт CSV',
            'strokes.import': 'Импорт CSV',
            'strokes.layoutSection': 'Параметры',
            'strokes.stepsPerRow': 'Шагов в строке',
            'strokes.stepSize': 'Размер шага (px)',
            'strokes.showPinyin': 'Пиньинь под каждым иероглифом',
            'strokes.generate': 'Сгенерировать',
            'strokes.statsNone': 'Пока нет иероглифов',
            'strokes.loading': 'Загрузка данных о чертах…',
            'strokes.preview': 'Просмотр',
            'strokes.previewHelp':
                '',
            'strokes.warnNoHw': 'Hanzi Writer не загрузился. Проверьте сеть и обновите генерацию.',
            'strokes.statsUnavailable': 'Hanzi Writer недоступен',
            'strokes.warnEmpty':
                'Добавьте хотя бы одну непустую строку в список слов (один столбец или слово,пиньинь,перевод).',
            'strokes.warnNoHanzi': 'В столбце слов нет иероглифов.',
            'strokes.statsNoHanzi': 'Нет иероглифов',
            'strokes.warnPinyin':
                'Часть слогов неизвестна. Загрузите pinyin-pro или введите слоги через пробел.',
            'strokes.warnFailed':
                'Нет данных черт для {n} иероглифов: {sample}{more}. Они пропущены ниже.',
            'strokes.warnMore': ' …',
            'strokes.missingData': 'Нет данных о чертах для этого иероглифа.',
            'strokes.statsLine': '{ok} из {total} иероглифов · всего шагов: {steps}',
            'strokes.exportEmpty': 'Нечего экспортировать.',

            'wl.documentTitle': 'Редактор списка слов',
            'wl.h1': 'Редактор списка слов',
            'wl.subtitle': 'Создавайте и редактируйте списки слов для карточек, тестов и упражнений.',
            'wl.addWords': 'Добавить слова',
            'wl.addPlaceholder': 'Введите китайские слова через запятую или пробел',
            'wl.addBtn': 'Добавить',
            'wl.toolbar': 'Инструменты',
            'wl.undo': 'Отменить',
            'wl.redo': 'Повторить',
            'wl.sort': 'Сортировать',
            'wl.dedup': 'Убрать дубликаты',
            'wl.exportCsv': 'Экспорт CSV',
            'wl.importCsv': 'Импорт CSV',
            'wl.clearAll': 'Очистить всё',
            'wl.thematic': 'Добавить из тематических списков',
            'wl.thematicSelect': '— Выберите тематический список —',
            'wl.thematicHide': 'Скрыть слова',
            'wl.thematicShow': 'Показать слова',
            'wl.thematicAddAll': 'Добавить все',
            'wl.table': 'Список слов',
            'wl.colNum': '№',
            'wl.colWord': 'Слово',
            'wl.colPinyin': 'Пиньинь',
            'wl.colTranslation': 'Перевод',
            'wl.colActions': 'Действия',
            'wl.empty': 'Слов пока нет. Добавьте слова выше или импортируйте CSV-файл.',
            'wl.dedupResult': 'Удалено дубликатов: {n}.',
            'wl.dedupNone': 'Дубликатов не найдено.',
            'wl.confirmClear': 'Удалить все {n} слов из списка?',
            'wl.statsLine': 'Слов в списке: {n}'
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
        let s = STRINGS[loc] && STRINGS[loc][key];
        if (s === undefined) {
            s = STRINGS[FALLBACK][key];
        }
        if (s === undefined) {
            s = key;
        }
        if (vars && typeof vars === 'object') {
            Object.keys(vars).forEach(function (k) {
                s = s.split('{' + k + '}').join(String(vars[k]));
            });
        }
        return s;
    }

    function applyStaticTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            const key = (el.getAttribute('data-i18n') || '').trim();
            if (!key) return;
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            const key = (el.getAttribute('data-i18n-html') || '').trim();
            if (!key) return;
            el.innerHTML = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            const key = (el.getAttribute('data-i18n-placeholder') || '').trim();
            if (!key) return;
            el.placeholder = t(key);
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
            const key = (el.getAttribute('data-i18n-aria-label') || '').trim();
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
