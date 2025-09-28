// 单词速记系统
class WordStudySystem {
    constructor() {
        this.db = null;
        this.currentPage = 'intro';
        this.currentWordData = null;
        this.isImporting = false; // 跟踪导入状态
        
        // 初始化所有元素
        this.initElements();
        this.initDatabase();
        this.initEventListeners();
        
        // 设置默认页面
        this.switchPage(this.currentPage);
    }
    
    initElements() {
        // 导航元素
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.pages = document.querySelectorAll('.page');
        
        // 查询页面元素
        this.wordInput = document.getElementById('wordInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.wordInfo = document.getElementById('wordInfo');
        this.errorMessage = document.getElementById('errorMessage');
        this.wordTitle = document.getElementById('wordTitle');
        this.wordType = document.getElementById('wordType');
        this.wordMeaning = document.getElementById('wordMeaning');
        this.verbForms = document.getElementById('verbForms');
        this.nounForms = document.getElementById('nounForms');
        this.adjectiveForms = document.getElementById('adjectiveForms');
        this.adverbForms = document.getElementById('adverbForms');
        this.errorText = document.getElementById('errorText');
        this.addToDbBtn = document.getElementById('addToDbBtn');
        
        // 背单词页面元素
        this.sortSelect = document.getElementById('sortSelect');
        this.wordCount = document.getElementById('wordCount');
        this.wordsGrid = document.getElementById('wordsGrid');
        
        // 导入页面元素
        this.fileInput = document.getElementById('fileInput');
        this.manualInput = document.getElementById('manualInput');
        this.importBtn = document.getElementById('importBtn');
        this.importProgress = document.getElementById('importProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.fastModeCheckbox = document.getElementById('fastModeCheckbox');
        
        // 搜索页面元素
        this.dbSearchInput = document.getElementById('dbSearchInput');
        this.dbSearchBtn = document.getElementById('dbSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.searchResults = document.getElementById('searchResults');
        
        // 清空所有单词按钮
        this.clearAllBtn = document.getElementById('clearAllBtn');
        
        // 弹窗元素
        this.wordModal = document.getElementById('wordModal');
        this.modalWordTitle = document.getElementById('modalWordTitle');
        this.modalBody = document.getElementById('modalBody');
        this.modalClose = document.getElementById('modalClose');
    }
    
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WordStudyDB', 1);
            
            request.onerror = () => {
                console.error('数据库打开失败');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('数据库初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建单词表
                if (!db.objectStoreNames.contains('words')) {
                    const wordStore = db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
                    wordStore.createIndex('word', 'word', { unique: true });
                    wordStore.createIndex('stars', 'stars', { unique: false });
                    wordStore.createIndex('importDate', 'importDate', { unique: false });
                }
                
                console.log('数据库结构创建成功');
            };
        });
    }
    
    initEventListeners() {
        // 导航切换
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.switchPage(page);
            });
        });
        
        // 查询页面事件
        this.searchBtn.addEventListener('click', () => this.searchWord());
        this.wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWord();
            }
        });
        this.wordInput.addEventListener('input', () => this.hideError());
        this.addToDbBtn.addEventListener('click', () => this.addWordToDatabase());
        
        // 背单词页面事件
        this.sortSelect.addEventListener('change', () => this.loadStudyWords());
        
        // 导入页面事件
        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        this.importBtn.addEventListener('click', () => this.handleManualImport());
        
        // 搜索页面事件
        this.dbSearchBtn.addEventListener('click', () => this.searchDatabase());
        this.dbSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchDatabase();
            }
        });
        this.dbSearchInput.addEventListener('input', () => this.updateClearButton());
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        
        // 清空所有单词事件
        this.clearAllBtn.addEventListener('click', () => this.handleClearAllWords());
        
        // 弹窗事件
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.wordModal.addEventListener('click', (e) => {
            if (e.target === this.wordModal) {
                this.closeModal();
            }
        });
    }
    
    switchPage(page) {
        // 更新导航按钮状态
        this.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // 显示对应页面
        this.pages.forEach(p => {
            p.style.display = p.id === page + 'Page' ? 'flex' : 'none';
        });
        
        this.currentPage = page;
        
        // 页面切换时的特殊处理
        if (page === 'study') {
            this.loadStudyWords();
            this.hideSearchResults();
        }
    }
    
    // 单词查询功能
    async searchWord() {
        const word = this.wordInput.value.trim().toLowerCase();
        
        if (!word) {
            this.showError('请输入一个英语单词');
            return;
        }
        
        this.showLoading();
        
        try {
            // 使用免费的英语词典API
            const wordData = await this.fetchWordFromAPI(word);
            
            if (wordData) {
                // 获取中文翻译
                const chineseMeaning = await this.getChineseTranslation(word);
                wordData.chineseMeaning = chineseMeaning;
                
                this.currentWordData = wordData;
                this.displayWordData(wordData);
            } else {
                this.showError(`未找到单词 "${word}" 的变形信息。请检查拼写或尝试其他单词。`);
            }
        } catch (error) {
            console.error('API查询失败:', error);
            this.showError('网络连接失败，请检查网络后重试');
        }
    }
    
    async fetchWordFromAPI(word) {
        try {
            // 使用Free Dictionary API
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (!response.ok) {
                throw new Error('Word not found');
            }
            
            const data = await response.json();
            
            // 调试信息
            console.log('API原始数据:', data[0]);
            
            const parsedData = this.parseAPIResponse(data[0]);
            console.log('解析后的数据:', parsedData);
            
            return parsedData;
        } catch (error) {
            console.log('API查询失败');
            return null;
        }
    }
    
    async getChineseTranslation(word) {
        try {
            // 使用免费的翻译API
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|zh`);
            
            if (!response.ok) {
                throw new Error('Translation failed');
            }
            
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData) {
                return data.responseData.translatedText;
            } else {
                return '暂无翻译';
            }
        } catch (error) {
            console.log('翻译API失败');
            return '暂无翻译';
        }
    }
    
    parseAPIResponse(apiData) {
        if (!apiData || !apiData.meanings) {
            return null;
        }
        
        const word = apiData.word;
        const meanings = apiData.meanings;
        
        // 创建综合的变形信息
        const allForms = {
            '原形': word
        };
        
        let wordType = 'noun';
        let hasVerbForms = false;
        let hasNounForms = false;
        let hasAdjectiveForms = false;
        let hasAdverbForms = false;
        
        // 遍历所有词性，收集变形信息
        for (const meaning of meanings) {
            const partOfSpeech = meaning.partOfSpeech;
            
            // 确定主要词性
            if (partOfSpeech === 'verb') {
                wordType = 'verb';
                hasVerbForms = true;
                this.extractVerbFormsFromAPI(meaning, allForms);
            } else if (partOfSpeech === 'noun') {
                if (wordType !== 'verb') wordType = 'noun';
                hasNounForms = true;
                this.extractNounFormsFromAPI(meaning, allForms);
            } else if (partOfSpeech === 'adjective') {
                if (wordType === 'noun') wordType = 'adjective';
                hasAdjectiveForms = true;
                this.extractAdjectiveFormsFromAPI(meaning, allForms);
            } else if (partOfSpeech === 'adverb') {
                if (wordType === 'noun') wordType = 'adverb';
                hasAdverbForms = true;
                this.extractAdverbFormsFromAPI(meaning, allForms);
            }
        }
        
        // 如果没有找到变形信息，尝试从单词本身推断
        if (Object.keys(allForms).length === 1) {
            this.inferFormsFromWord(word, wordType, allForms);
        }
        
        // 添加词性信息
        allForms['词性'] = wordType;
        
        return {
            type: wordType,
            forms: allForms
        };
    }
    
    extractVerbFormsFromAPI(meaning, allForms) {
        if (!meaning.definitions) return;
        
        for (const def of meaning.definitions) {
            const definition = def.definition || '';
            
            // 查找动词变形模式
            const patterns = [
                { key: '过去式', regex: /past tense of (\w+)/i },
                { key: '过去分词', regex: /past participle of (\w+)/i },
                { key: '现在分词', regex: /present participle of (\w+)/i },
                { key: '第三人称单数', regex: /third person singular of (\w+)/i },
                { key: '过去式', regex: /simple past of (\w+)/i },
                { key: '过去分词', regex: /past participle of (\w+)/i },
                { key: '现在分词', regex: /gerund of (\w+)/i }
            ];
            
            for (const pattern of patterns) {
                const match = definition.match(pattern.regex);
                if (match && !allForms[pattern.key]) {
                    allForms[pattern.key] = match[1];
                }
            }
        }
    }
    
    extractNounFormsFromAPI(meaning, allForms) {
        if (!meaning.definitions) return;
        
        for (const def of meaning.definitions) {
            const definition = def.definition || '';
            
            // 查找名词变形模式
            const patterns = [
                { key: '复数', regex: /plural of (\w+)/i },
                { key: '复数', regex: /plural form of (\w+)/i },
                { key: '复数', regex: /irregular plural of (\w+)/i }
            ];
            
            for (const pattern of patterns) {
                const match = definition.match(pattern.regex);
                if (match && !allForms[pattern.key]) {
                    allForms[pattern.key] = match[1];
                }
            }
        }
    }
    
    extractAdjectiveFormsFromAPI(meaning, allForms) {
        if (!meaning.definitions) return;
        
        for (const def of meaning.definitions) {
            const definition = def.definition || '';
            
            // 查找形容词变形模式
            const patterns = [
                { key: '比较级', regex: /comparative of (\w+)/i },
                { key: '最高级', regex: /superlative of (\w+)/i },
                { key: '比较级', regex: /comparative form of (\w+)/i },
                { key: '最高级', regex: /superlative form of (\w+)/i }
            ];
            
            for (const pattern of patterns) {
                const match = definition.match(pattern.regex);
                if (match && !allForms[pattern.key]) {
                    allForms[pattern.key] = match[1];
                }
            }
        }
    }
    
    extractAdverbFormsFromAPI(meaning, allForms) {
        if (!meaning.definitions) return;
        
        for (const def of meaning.definitions) {
            const definition = def.definition || '';
            
            // 查找副词变形模式
            const patterns = [
                { key: '比较级', regex: /comparative of (\w+)/i },
                { key: '最高级', regex: /superlative of (\w+)/i }
            ];
            
            for (const pattern of patterns) {
                const match = definition.match(pattern.regex);
                if (match && !allForms[pattern.key]) {
                    allForms[pattern.key] = match[1];
                }
            }
        }
    }
    
    inferFormsFromWord(word, wordType, allForms) {
        // 基于单词本身推断变形
        if (wordType === 'verb') {
            this.inferVerbForms(word, allForms);
        } else if (wordType === 'noun') {
            this.inferNounForms(word, allForms);
        } else if (wordType === 'adjective') {
            this.inferAdjectiveForms(word, allForms);
        }
    }
    
    inferVerbForms(word, allForms) {
        // 推断动词变形 - 更智能的规则
        if (word.endsWith('ing')) {
            // 现在分词，推断原形
            let base = word.slice(0, -3);
            
            // 处理双写辅音字母的情况
            if (base.length > 2 && this.isConsonant(base[base.length-1]) && 
                this.isConsonant(base[base.length-2]) && 
                !this.isConsonant(base[base.length-3])) {
                base = base.slice(0, -1); // 去掉重复的辅音字母
            }
            
            allForms['原形'] = base;
            allForms['现在分词'] = word;
            allForms['第三人称单数'] = this.getThirdPersonSingular(base);
            allForms['过去式'] = this.getPastTense(base);
            allForms['过去分词'] = this.getPastParticiple(base);
            
        } else if (word.endsWith('ed')) {
            // 过去式或过去分词
            let base = word.slice(0, -2);
            
            // 处理双写辅音字母的情况
            if (base.length > 2 && this.isConsonant(base[base.length-1]) && 
                this.isConsonant(base[base.length-2]) && 
                !this.isConsonant(base[base.length-3])) {
                base = base.slice(0, -1);
            }
            
            allForms['原形'] = base;
            allForms['过去式'] = word;
            allForms['过去分词'] = word;
            allForms['第三人称单数'] = this.getThirdPersonSingular(base);
            allForms['现在分词'] = this.getPresentParticiple(base);
            
        } else {
            // 原形动词
            allForms['原形'] = word;
            allForms['第三人称单数'] = this.getThirdPersonSingular(word);
            allForms['过去式'] = this.getPastTense(word);
            allForms['过去分词'] = this.getPastParticiple(word);
            allForms['现在分词'] = this.getPresentParticiple(word);
        }
    }
    
    inferNounForms(word, allForms) {
        // 推断名词变形 - 更智能的规则
        if (word.endsWith('s') && word.length > 3) {
            // 可能是复数
            if (word.endsWith('ies')) {
                // 以ies结尾的复数 (如: cities -> city)
                const singular = word.slice(0, -3) + 'y';
                allForms['单数'] = singular;
                allForms['复数'] = word;
            } else if (word.endsWith('ves')) {
                // 以ves结尾的复数 (如: knives -> knife)
                const singular = word.slice(0, -3) + 'f';
                allForms['单数'] = singular;
                allForms['复数'] = word;
            } else if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('xes') || word.endsWith('zes')) {
                // 以ch, sh, x, z结尾的复数 (如: boxes -> box)
                const singular = word.slice(0, -2);
                allForms['单数'] = singular;
                allForms['复数'] = word;
            } else if (word.endsWith('oes')) {
                // 以oes结尾的复数 (如: tomatoes -> tomato)
                const singular = word.slice(0, -2);
                allForms['单数'] = singular;
                allForms['复数'] = word;
            } else {
                // 普通复数
                const singular = word.slice(0, -1);
                allForms['单数'] = singular;
                allForms['复数'] = word;
            }
        } else {
            // 单数形式
            allForms['单数'] = word;
            allForms['复数'] = this.getPluralForm(word);
        }
    }
    
    // 辅助方法
    isConsonant(char) {
        const vowels = 'aeiou';
        return !vowels.includes(char.toLowerCase());
    }
    
    getThirdPersonSingular(verb) {
        if (verb.endsWith('s') || verb.endsWith('sh') || verb.endsWith('ch') || 
            verb.endsWith('x') || verb.endsWith('z')) {
            return verb + 'es';
        } else if (verb.endsWith('y') && this.isConsonant(verb[verb.length-2])) {
            return verb.slice(0, -1) + 'ies';
        } else {
            return verb + 's';
        }
    }
    
    getPastTense(verb) {
        // 不规则动词需要特殊处理，这里使用规则变化
        if (verb.endsWith('e')) {
            return verb + 'd';
        } else if (verb.endsWith('y') && this.isConsonant(verb[verb.length-2])) {
            return verb.slice(0, -1) + 'ied';
        } else if (verb.endsWith('c')) {
            return verb + 'ked';
        } else {
            return verb + 'ed';
        }
    }
    
    getPastParticiple(verb) {
        // 大多数情况下与过去式相同
        return this.getPastTense(verb);
    }
    
    getPresentParticiple(verb) {
        if (verb.endsWith('e')) {
            return verb.slice(0, -1) + 'ing';
        } else if (verb.endsWith('y')) {
            return verb + 'ing';
        } else if (verb.endsWith('c')) {
            return verb + 'king';
        } else {
            return verb + 'ing';
        }
    }
    
    getPluralForm(noun) {
        if (noun.endsWith('s') || noun.endsWith('sh') || noun.endsWith('ch') || 
            noun.endsWith('x') || noun.endsWith('z')) {
            return noun + 'es';
        } else if (noun.endsWith('y') && this.isConsonant(noun[noun.length-2])) {
            return noun.slice(0, -1) + 'ies';
        } else if (noun.endsWith('f')) {
            return noun.slice(0, -1) + 'ves';
        } else if (noun.endsWith('fe')) {
            return noun.slice(0, -2) + 'ves';
        } else {
            return noun + 's';
        }
    }
    
    inferAdjectiveForms(word, allForms) {
        // 推断形容词变形
        if (word.endsWith('er')) {
            // 可能是比较级
            const base = word.slice(0, -2);
            allForms['原级'] = base;
            allForms['比较级'] = word;
            allForms['最高级'] = base + 'est';
        } else if (word.endsWith('est')) {
            // 可能是最高级
            const base = word.slice(0, -3);
            allForms['原级'] = base;
            allForms['比较级'] = base + 'er';
            allForms['最高级'] = word;
        } else {
            // 原级
            allForms['原级'] = word;
            allForms['比较级'] = word + 'er';
            allForms['最高级'] = word + 'est';
        }
    }
    
    displayWordData(wordData) {
        this.hideLoading();
        this.hideError();
        
        // 显示单词标题和类型
        this.wordTitle.textContent = this.wordInput.value.trim();
        this.wordType.textContent = this.getTypeText(wordData.type);
        
        // 显示中文意思
        this.displayChineseMeaning(wordData.chineseMeaning);
        
        // 清空之前的表单
        this.clearForms();
        
        // 根据单词类型显示相应的变形
        this.populateForms(wordData);
        
        // 显示结果
        this.wordInfo.style.display = 'block';
    }
    
    displayChineseMeaning(chineseMeaning) {
        if (chineseMeaning && chineseMeaning !== '暂无翻译') {
            this.wordMeaning.innerHTML = `
                <div class="meaning-item">
                    <span class="part-of-speech">中文意思：</span>
                    <span class="definition">${chineseMeaning}</span>
                </div>
            `;
        } else {
            this.wordMeaning.innerHTML = `
                <div class="meaning-item">
                    <span class="part-of-speech">中文意思：</span>
                    <span class="definition">暂无翻译</span>
                </div>
            `;
        }
    }
    
    getTypeText(type) {
        const typeMap = {
            'verb': '动词',
            'noun': '名词',
            'adjective': '形容词',
            'adverb': '副词'
        };
        return typeMap[type] || type;
    }
    
    clearForms() {
        this.verbForms.innerHTML = '';
        this.nounForms.innerHTML = '';
        this.adjectiveForms.innerHTML = '';
        this.adverbForms.innerHTML = '';
    }
    
    populateForms(wordData) {
        const forms = wordData.forms;
        
        // 根据单词类型填充相应的表单
        switch (wordData.type) {
            case 'verb':
                this.populateFormList(this.verbForms, forms);
                break;
            case 'noun':
                this.populateFormList(this.nounForms, forms);
                break;
            case 'adjective':
                this.populateFormList(this.adjectiveForms, forms);
                break;
            case 'adverb':
                this.populateFormList(this.adverbForms, forms);
                break;
        }
    }
    
    populateFormList(container, forms) {
        Object.entries(forms).forEach(([label, value]) => {
            const formItem = document.createElement('div');
            formItem.className = 'form-item';
            
            formItem.innerHTML = `
                <span class="form-label">${label}</span>
                <span class="form-value">${value}</span>
            `;
            
            container.appendChild(formItem);
        });
    }
    
    showLoading() {
        this.hideAll();
        this.loading.style.display = 'flex';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    showError(message) {
        this.hideAll();
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'flex';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    hideAll() {
        this.loading.style.display = 'none';
        this.wordInfo.style.display = 'none';
        this.errorMessage.style.display = 'none';
    }
    
    // 数据库操作
    async addWordToDatabase() {
        if (!this.currentWordData) {
            this.showError('没有可添加的单词数据');
            return;
        }
        
        const word = this.wordInput.value.trim().toLowerCase();
        const wordData = {
            word: word,
            meaning: this.currentWordData.chineseMeaning || '暂无翻译',
            type: this.currentWordData.type,
            forms: this.currentWordData.forms,
            stars: 0,
            importDate: new Date().toISOString()
        };
        
        try {
            await this.saveWordToDB(wordData);
            this.addToDbBtn.textContent = '已添加到单词库';
            this.addToDbBtn.disabled = true;
            this.addToDbBtn.style.background = '#45a049';
        } catch (error) {
            console.error('添加单词失败:', error);
            this.showError('添加单词失败，请重试');
        }
    }
    
    async saveWordToDB(wordData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['words'], 'readwrite');
            const store = transaction.objectStore('words');
            
            const request = store.add(wordData);
            
            request.onsuccess = () => resolve();
            request.onerror = () => {
                if (request.error.name === 'ConstraintError') {
                    reject(new Error('单词已存在于数据库中'));
                } else {
                    reject(request.error);
                }
            };
        });
    }
    
    async getAllWords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['words'], 'readonly');
            const store = transaction.objectStore('words');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateWordStars(wordId, newStars) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['words'], 'readwrite');
            const store = transaction.objectStore('words');
            
            const getRequest = store.get(wordId);
            getRequest.onsuccess = () => {
                const word = getRequest.result;
                if (word) {
                    word.stars = Math.max(0, Math.min(5, newStars));
                    const updateRequest = store.put(word);
                    updateRequest.onsuccess = () => resolve(word);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('单词不存在'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }
    
    // 背单词功能
    async loadStudyWords() {
        try {
            const words = await this.getAllWords();
            const sortType = this.sortSelect.value;
            
            // 排序
            let sortedWords = words;
            switch (sortType) {
                case 'stars':
                    sortedWords = words.sort((a, b) => b.stars - a.stars);
                    break;
                case 'alphabetical':
                    sortedWords = words.sort((a, b) => a.word.localeCompare(b.word));
                    break;
                case 'random':
                    sortedWords = this.shuffleArray([...words]);
                    break;
                case 'import':
                default:
                    sortedWords = words.sort((a, b) => new Date(a.importDate) - new Date(b.importDate));
                    break;
            }
            
            this.displayStudyWords(sortedWords);
            this.wordCount.textContent = words.length;
        } catch (error) {
            console.error('加载单词失败:', error);
            this.wordsGrid.innerHTML = '<p style="text-align: center; color: #666;">加载单词失败</p>';
        }
    }
    
    displayStudyWords(words) {
        this.wordsGrid.innerHTML = '';
        
        if (words.length === 0) {
            this.wordsGrid.innerHTML = '<p style="text-align: center; color: #666;">暂无单词，请先导入一些单词</p>';
            return;
        }
        
        words.forEach(word => {
            const wordCard = this.createWordCard(word);
            this.wordsGrid.appendChild(wordCard);
        });
    }
    
    createWordCard(word) {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.wordId = word.id;
        
        const stars = '★'.repeat(word.stars) + '☆'.repeat(5 - word.stars);
        
        card.innerHTML = `
            <div class="word-card-header">
                <div class="word-card-title">${word.word}</div>
                <div class="star-rating">${stars}</div>
            </div>
            <div class="word-card-meaning">${word.meaning}</div>
            <div class="word-card-actions">
                <button class="action-btn remember-btn" onclick="wordStudySystem.updateStars(${word.id}, ${word.stars + 1})">记得</button>
                <button class="action-btn forget-btn" onclick="wordStudySystem.updateStars(${word.id}, ${word.stars - 1})">不记得</button>
            </div>
        `;
        
        // 点击卡片显示详情
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('action-btn')) {
                this.showWordDetails(word);
            }
        });
        
        return card;
    }
    
    async updateStars(wordId, newStars) {
        try {
            await this.updateWordStars(wordId, newStars);
            this.loadStudyWords(); // 重新加载以更新显示
        } catch (error) {
            console.error('更新星级失败:', error);
        }
    }
    
    showWordDetails(word) {
        this.modalWordTitle.textContent = word.word;
        
        let detailsHTML = `
            <div class="word-detail-item">
                <strong>中文意思：</strong> ${word.meaning}
            </div>
            <div class="word-detail-item">
                <strong>词性：</strong> ${this.getTypeText(word.type)}
            </div>
            <div class="word-detail-item">
                <strong>星级：</strong> ${word.stars}/5
            </div>
            <div class="word-detail-item">
                <strong>导入时间：</strong> ${new Date(word.importDate).toLocaleString()}
            </div>
        `;
        
        if (word.forms) {
            detailsHTML += '<div class="word-detail-item"><strong>变形：</strong></div>';
            Object.entries(word.forms).forEach(([label, value]) => {
                if (label !== '词性') {
                    detailsHTML += `<div class="form-detail">${label}: ${value}</div>`;
                }
            });
        }
        
        this.modalBody.innerHTML = detailsHTML;
        this.wordModal.style.display = 'flex';
    }
    
    closeModal() {
        this.wordModal.style.display = 'none';
    }
    
    // 批量导入功能
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const words = text.split('\n').map(w => w.trim()).filter(w => w);
        
        if (words.length === 0) {
            alert('文件中没有找到有效的单词');
            return;
        }
        
        await this.importWords(words);
    }
    
    async handleManualImport() {
        const text = this.manualInput.value.trim();
        if (!text) {
            alert('请输入要导入的单词');
            return;
        }
        
        const words = text.split('\n').map(w => w.trim()).filter(w => w);
        await this.importWords(words);
    }
    
    async importWords(words) {
        this.isImporting = true;
        this.importProgress.style.display = 'block';
        this.progressFill.style.width = '0%';
        
        // 添加页面关闭警告
        this.addPageCloseWarning();
        
        // 一次性获取所有现有单词，避免重复查询
        const existingWords = await this.getAllWords();
        const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();
            
            try {
                // 使用Set进行快速重复检查
                const exists = existingWordSet.has(word);
                
                if (!exists) {
                    // 获取单词详细信息
                    const wordData = await this.fetchWordFromAPI(word);
                    if (wordData) {
                        const chineseMeaning = await this.getChineseTranslation(word);
                        const wordObj = {
                            word: word,
                            meaning: chineseMeaning || '暂无翻译',
                            type: wordData.type,
                            forms: wordData.forms,
                            stars: 0,
                            importDate: new Date().toISOString()
                        };
                        
                        await this.saveWordToDB(wordObj);
                        successCount++;
                        // 将新导入的单词添加到Set中，避免后续重复检查
                        existingWordSet.add(word);
                    } else {
                        errorCount++;
                    }
                } else {
                    // 单词已存在，跳过导入
                    skipCount++;
                }
            } catch (error) {
                console.error(`导入单词 ${word} 失败:`, error);
                errorCount++;
            }
            
            // 每5个单词或最后一个单词更新一次进度显示
            if ((i + 1) % 5 === 0 || i === words.length - 1) {
                this.progressText.textContent = `正在导入: ${word} (${i + 1}/${words.length}) - 成功:${successCount} 跳过:${skipCount} 失败:${errorCount}`;
                const progress = ((i + 1) / words.length) * 100;
                this.progressFill.style.width = progress + '%';
            }
            
            // 根据快速模式设置延迟时间
            const delay = this.fastModeCheckbox.checked ? 50 : 200;
            if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // 生成详细的导入结果信息
        let resultMessage = `导入完成！`;
        if (successCount > 0) {
            resultMessage += ` 成功: ${successCount}`;
        }
        if (skipCount > 0) {
            resultMessage += ` 跳过: ${skipCount}`;
        }
        if (errorCount > 0) {
            resultMessage += ` 失败: ${errorCount}`;
        }
        
        this.progressText.textContent = resultMessage;
        
        // 移除页面关闭警告
        this.removePageCloseWarning();
        this.isImporting = false;
        
        setTimeout(() => {
            this.importProgress.style.display = 'none';
            this.manualInput.value = '';
            this.fileInput.value = '';
        }, 3000);
    }
    
    // 搜索功能
    async searchDatabase() {
        const query = this.dbSearchInput.value.trim().toLowerCase();
        if (!query) {
            this.hideSearchResults();
            this.loadStudyWords(); // 显示所有单词
            return;
        }
        
        try {
            const words = await this.getAllWords();
            const results = words.filter(word => 
                word.word.includes(query) || 
                word.meaning.includes(query)
            );
            
            this.displaySearchResults(results, query);
        } catch (error) {
            console.error('搜索失败:', error);
            this.searchResults.innerHTML = '<p style="text-align: center; color: #666;">搜索失败</p>';
            this.showSearchResults();
        }
    }
    
    hideSearchResults() {
        this.searchResults.style.display = 'none';
        this.wordsGrid.style.display = 'grid';
    }
    
    showSearchResults() {
        this.searchResults.style.display = 'block';
        this.wordsGrid.style.display = 'none';
    }
    
    updateClearButton() {
        const hasText = this.dbSearchInput.value.trim().length > 0;
        this.clearSearchBtn.classList.toggle('show', hasText);
    }
    
    clearSearch() {
        this.dbSearchInput.value = '';
        this.updateClearButton();
        this.hideSearchResults();
        this.loadStudyWords();
    }
    
    displaySearchResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p style="margin-bottom: 20px;">未找到包含 "${query}" 的单词</p>
                    <button onclick="wordStudySystem.importNewWord('${query}')" class="add-btn">导入这个单词</button>
                </div>
            `;
            this.showSearchResults();
            return;
        }
        
        // 使用单词卡片样式显示搜索结果
        this.searchResults.innerHTML = '';
        results.forEach(word => {
            const wordCard = this.createWordCard(word);
            this.searchResults.appendChild(wordCard);
        });
        
        this.showSearchResults();
    }
    
    async importNewWord(word) {
        try {
            const wordData = await this.fetchWordFromAPI(word);
            if (wordData) {
                const chineseMeaning = await this.getChineseTranslation(word);
                const wordObj = {
                    word: word,
                    meaning: chineseMeaning || '暂无翻译',
                    type: wordData.type,
                    forms: wordData.forms,
                    stars: 0,
                    importDate: new Date().toISOString()
                };
                
                await this.saveWordToDB(wordObj);
                alert('单词导入成功！');
                this.searchDatabase(); // 重新搜索
            } else {
                alert('无法获取该单词的信息');
            }
        } catch (error) {
            console.error('导入单词失败:', error);
            alert('导入失败，请重试');
        }
    }
    
    // 清空所有单词
    async clearAllWords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['words'], 'readwrite');
            const store = transaction.objectStore('words');
            
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('所有单词已清空');
                resolve();
            };
            request.onerror = () => {
                console.error('清空单词失败:', request.error);
                reject(request.error);
            };
        });
    }
    
    // 乱序算法 (Fisher-Yates洗牌算法)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // 添加页面关闭警告
    addPageCloseWarning() {
        this.beforeUnloadHandler = (event) => {
            event.preventDefault();
            event.returnValue = '正在导入单词，关闭页面将中断导入过程，确定要离开吗？';
            return '正在导入单词，关闭页面将中断导入过程，确定要离开吗？';
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
    
    // 移除页面关闭警告
    removePageCloseWarning() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
    }
    
    // 处理清空所有单词的点击事件
    async handleClearAllWords() {
        // 先检查是否有单词
        try {
            const words = await this.getAllWords();
            if (words.length === 0) {
                alert('单词库中没有任何单词');
                return;
            }
            
            // 显示确认对话框
            const confirmed = confirm(`确定要删除所有 ${words.length} 个单词吗？\n\n此操作不可撤销！`);
            if (!confirmed) {
                return;
            }
            
            // 执行清空操作
            await this.clearAllWords();
            
            // 更新界面
            this.loadStudyWords();
            this.hideSearchResults();
            this.dbSearchInput.value = '';
            this.updateClearButton();
            
            alert('所有单词已成功删除！');
            
        } catch (error) {
            console.error('清空单词失败:', error);
            alert('删除失败，请重试');
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.wordStudySystem = new WordStudySystem();
});
