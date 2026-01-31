/**
 * Dictionary Service
 * Handles API calls to dictionary and translation services
 */

const ENGLISH_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const TRANSLATION_API_BASE = 'https://api.mymemory.translated.net/get';
const DATAMUSE_API_BASE = 'https://api.datamuse.com/words';

/**
 * Check if text contains Chinese characters
 * @param {string} text - Text to check
 * @returns {boolean} True if contains Chinese
 */
export function isChinese(text) {
  // Match CJK Unified Ideographs
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Error types for dictionary operations
 */
export const DictionaryError = {
  WORD_NOT_FOUND: 'WORD_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DECODING_ERROR: 'DECODING_ERROR',
  INVALID_URL: 'INVALID_URL'
};

/**
 * Fetch English definition from dictionary API
 * @param {string} word - The word to look up
 * @returns {Promise<Array>} Array of dictionary entries
 */
export async function fetchEnglishDefinition(word) {
  const encodedWord = encodeURIComponent(word.trim());
  const url = `${ENGLISH_API_BASE}${encodedWord}`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      throw { type: DictionaryError.WORD_NOT_FOUND, message: 'Word not found in dictionary' };
    }

    if (!response.ok) {
      throw { type: DictionaryError.NETWORK_ERROR, message: `HTTP Error: ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.type) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw { type: DictionaryError.DECODING_ERROR, message: 'Failed to parse response' };
    }
    throw { type: DictionaryError.NETWORK_ERROR, message: error.message || 'Network error occurred' };
  }
}

/**
 * Fetch Chinese translations from MyMemory API
 * @param {string} text - The text to translate
 * @returns {Promise<Object>} Object with primary translation and alternatives
 */
export async function fetchChineseTranslation(text) {
  const params = new URLSearchParams({
    q: text.trim(),
    langpair: 'en|zh-CN'
  });
  const url = `${TRANSLATION_API_BASE}?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw { type: DictionaryError.NETWORK_ERROR, message: `HTTP Error: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.responseData && data.responseData.translatedText) {
      const primary = data.responseData.translatedText;
      const alternatives = [];
      
      // Extract alternative translations from matches
      if (data.matches && Array.isArray(data.matches)) {
        const seen = new Set([primary.toLowerCase()]);
        
        for (const match of data.matches) {
          if (match.translation && match.quality && match.quality > 50) {
            const trans = match.translation.trim();
            const transLower = trans.toLowerCase();
            
            // Skip duplicates and very long translations
            if (!seen.has(transLower) && trans.length < 50) {
              seen.add(transLower);
              alternatives.push(trans);
              
              if (alternatives.length >= 5) break;
            }
          }
        }
      }
      
      return { primary, alternatives };
    }
    
    throw { type: DictionaryError.DECODING_ERROR, message: 'Invalid translation response' };
  } catch (error) {
    if (error.type) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw { type: DictionaryError.DECODING_ERROR, message: 'Failed to parse response' };
    }
    throw { type: DictionaryError.NETWORK_ERROR, message: error.message || 'Network error occurred' };
  }
}

/**
 * Fetch English translation from Chinese
 * @param {string} text - Chinese text to translate
 * @returns {Promise<string>} English translation
 */
export async function fetchEnglishTranslation(text) {
  const params = new URLSearchParams({
    q: text.trim(),
    langpair: 'zh-CN|en'
  });
  const url = `${TRANSLATION_API_BASE}?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw { type: DictionaryError.NETWORK_ERROR, message: `HTTP Error: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    
    throw { type: DictionaryError.DECODING_ERROR, message: 'Invalid translation response' };
  } catch (error) {
    if (error.type) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw { type: DictionaryError.DECODING_ERROR, message: 'Failed to parse response' };
    }
    throw { type: DictionaryError.NETWORK_ERROR, message: error.message || 'Network error occurred' };
  }
}

/**
 * Lookup Chinese word - translates to English and finds alternatives
 * @param {string} chineseText - Chinese word or phrase
 * @returns {Promise<Object>} Lookup result with translations and alternatives
 */
export async function lookupChineseWord(chineseText) {
  const trimmedText = chineseText.trim();
  
  // Get English translation
  const englishTranslation = await fetchEnglishTranslation(trimmedText);
  
  // Parse the translation to get individual words
  const translationWords = englishTranslation
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  // Try to get definitions for the main translation words
  let definitions = [];
  let alternatives = [];
  
  // Get definition for the first meaningful word
  const mainWord = translationWords[0] || englishTranslation.split(' ')[0];
  
  try {
    const defResult = await fetchEnglishDefinition(mainWord);
    if (defResult && defResult.length > 0) {
      definitions = defResult;
      // Get synonyms as alternatives
      const synonyms = getAllSynonyms(defResult[0]);
      alternatives = synonyms.slice(0, 10);
    }
  } catch (error) {
    // Definition not found, continue without
  }
  
  // Add other translation words as alternatives if we have few
  if (alternatives.length < 5) {
    const otherWords = translationWords.slice(1).filter(w => !alternatives.includes(w));
    alternatives = [...alternatives, ...otherWords].slice(0, 10);
  }
  
  return {
    chineseWord: trimmedText,
    englishTranslation,
    translationWords,
    definitions,
    alternatives,
    isChinese: true,
    timestamp: new Date()
  };
}

/**
 * Combined word lookup - fetches both English definitions and Chinese translation
 * @param {string} word - The word or phrase to look up
 * @returns {Promise<Object>} Combined lookup result
 */
export async function lookupWord(word) {
  const trimmedWord = word.trim();
  
  // Start both requests in parallel
  const translationPromise = fetchChineseTranslation(trimmedWord);
  
  let englishDefinitions = [];
  let isPhrase = false;

  // Try to get English definitions
  try {
    englishDefinitions = await fetchEnglishDefinition(trimmedWord);
  } catch (error) {
    if (error.type === DictionaryError.WORD_NOT_FOUND) {
      // Word/phrase not found in English dictionary - this is okay for phrases
      isPhrase = trimmedWord.includes(' ') || trimmedWord.includes('-');
    }
    // For other errors, we'll continue without English definitions
  }

  // Chinese translation is required
  const chineseTranslation = await translationPromise;

  return {
    word: trimmedWord,
    englishDefinitions,
    chineseTranslation,
    isPhrase: isPhrase || trimmedWord.includes(' '),
    timestamp: new Date()
  };
}

/**
 * Get the best audio URL from phonetics (prefer US pronunciation)
 * @param {Array} phonetics - Array of phonetic objects
 * @returns {string|null} Audio URL or null
 */
export function getBestAudioUrl(phonetics) {
  if (!phonetics || !Array.isArray(phonetics)) {
    return null;
  }

  // First try to find US pronunciation
  const usAudio = phonetics.find(p => 
    p.audio && (p.audio.includes('-us') || p.audio.includes('/us/'))
  );
  if (usAudio?.audio) {
    return usAudio.audio;
  }

  // Fall back to any available audio
  const anyAudio = phonetics.find(p => p.audio && p.audio.trim() !== '');
  return anyAudio?.audio || null;
}

/**
 * Get phonetic text from phonetics array
 * @param {Object} entry - Dictionary entry
 * @returns {string} Phonetic text or empty string
 */
export function getPhoneticText(entry) {
  if (entry.phonetic) {
    return entry.phonetic;
  }
  
  if (entry.phonetics && Array.isArray(entry.phonetics)) {
    const withText = entry.phonetics.find(p => p.text && p.text.trim() !== '');
    if (withText) {
      return withText.text;
    }
  }
  
  return '';
}

/**
 * Get all synonyms from an entry (both from meanings and definitions)
 * @param {Object} entry - Dictionary entry
 * @returns {Array<string>} Array of synonyms
 */
export function getAllSynonyms(entry) {
  const synonyms = new Set();
  
  if (entry.meanings) {
    for (const meaning of entry.meanings) {
      // Add meaning-level synonyms
      if (meaning.synonyms) {
        meaning.synonyms.forEach(s => synonyms.add(s));
      }
      
      // Add definition-level synonyms
      if (meaning.definitions) {
        for (const def of meaning.definitions) {
          if (def.synonyms) {
            def.synonyms.forEach(s => synonyms.add(s));
          }
        }
      }
    }
  }
  
  return Array.from(synonyms);
}

/**
 * Generate potential word forms based on morphology rules
 * @param {string} word - Base word
 * @returns {Array<string>} Potential word forms to check (prioritized)
 */
function generatePotentialForms(word) {
  const forms = [];
  const w = word.toLowerCase();
  
  // Helper to add unique forms
  const addForm = (form) => {
    if (form && form !== w && form.length > 2 && !forms.includes(form)) {
      forms.push(form);
    }
  };
  
  // Detect if word ends with 'e' (affects many transformations)
  const endsWithE = w.endsWith('e');
  const endsWithConsonantY = w.match(/[^aeiou]y$/);
  const base = endsWithE ? w.slice(0, -1) : w;
  
  // Priority 1: Direct derivations (most likely to be correct)
  
  // Verb forms
  if (endsWithE) {
    addForm(base + 'ing');      // create -> creating
    addForm(base + 'ed');       // create -> created (past participle sometimes listed)
    addForm(w + 'd');           // create -> created
    addForm(base + 'ion');      // create -> creation
    addForm(base + 'ation');    // create -> creation (alternative)
    addForm(base + 'ive');      // create -> creative
    addForm(base + 'or');       // create -> creator
    addForm(base + 'er');       // create -> creater (less common)
  } else {
    addForm(w + 'ing');         // learn -> learning
    addForm(w + 'ed');          // learn -> learned
    addForm(w + 'er');          // learn -> learner
    addForm(w + 'ion');         // not common but possible
    addForm(w + 'ation');       // inform -> information
  }
  
  // Adjective forms
  if (endsWithE) {
    addForm(base + 'ive');      // create -> creative
    addForm(base + 'ively');    // create -> creatively
  }
  addForm(w + 'ive');           // for words not ending in e
  addForm(w + 'ively');
  addForm(w + 'ly');            // large -> largely
  addForm(w + 'ness');          // large -> largeness
  
  // Comparative/superlative for adjectives
  if (endsWithE) {
    addForm(w + 'r');           // large -> larger
    addForm(w + 'st');          // large -> largest
  } else {
    addForm(w + 'er');          // small -> smaller  
    addForm(w + 'est');         // small -> smallest
  }
  
  // Handle -y endings
  if (endsWithConsonantY) {
    const yBase = w.slice(0, -1);
    addForm(yBase + 'ily');     // happy -> happily
    addForm(yBase + 'iness');   // happy -> happiness
    addForm(yBase + 'ier');     // happy -> happier
    addForm(yBase + 'iest');    // happy -> happiest
    addForm(yBase + 'ied');     // carry -> carried
    addForm(yBase + 'ies');     // carry -> carries
  }
  
  // Noun forms
  addForm(w + 'ment');          // develop -> development
  addForm(w + 'ness');          // kind -> kindness
  addForm(w + 'ity');           // able -> ability
  if (endsWithE) {
    addForm(base + 'ity');      // creative -> creativity
  }
  
  // If word looks like it might be a derived form, try to find base
  if (w.endsWith('tion') || w.endsWith('sion')) {
    const nounBase = w.slice(0, -4);
    addForm(nounBase + 'e');    // creation -> create
    addForm(nounBase);          // creation -> creat (then will check)
    addForm(nounBase + 'ive');  // creation -> creative
    addForm(nounBase + 'ively');// creation -> creatively
  }
  
  if (w.endsWith('ive')) {
    const adjBase = w.slice(0, -3);
    addForm(adjBase + 'e');     // creative -> create
    addForm(adjBase + 'ion');   // creative -> creation
    addForm(w + 'ly');          // creative -> creatively
    addForm(w.slice(0, -1) + 'ity'); // creative -> creativity
  }
  
  if (w.endsWith('ly')) {
    const advBase = w.slice(0, -2);
    addForm(advBase);           // creatively -> creative (may not exist)
    addForm(advBase + 'e');     // largely -> large
  }
  
  if (w.endsWith('ness')) {
    const nessBase = w.slice(0, -4);
    addForm(nessBase);          // largeness -> large
    addForm(nessBase + 'ly');   // largeness -> largely
  }
  
  return forms.slice(0, 20); // Limit to prevent too many API calls
}

/**
 * Determine the word form type based on ending patterns
 * @param {string} word - The word to analyze
 * @param {string} baseWord - The original search word for comparison
 * @returns {Object} Form info with pos, label, and icon
 */
function getWordFormInfo(word, baseWord) {
  const w = word.toLowerCase();
  const base = baseWord.toLowerCase();
  
  // Verb forms (check specific forms first)
  if (w.endsWith('ing')) {
    return { pos: 'verb', label: 'Present Participle', icon: '-ing' };
  }
  if (w.endsWith('ed') && (w.startsWith(base.slice(0, 3)) || base.endsWith('e'))) {
    return { pos: 'verb', label: 'Past Tense', icon: 'Past' };
  }
  if (w === base + 'd' || w === base.slice(0, -1) + 'ed') {
    return { pos: 'verb', label: 'Past Tense', icon: 'Past' };
  }
  
  // Comparative/Superlative (adjective forms)
  if (w.endsWith('est')) {
    return { pos: 'adjective', label: 'Superlative', icon: '-est' };
  }
  if (w.endsWith('er') && w.length < base.length + 4 && !w.endsWith('ier')) {
    // Check if this is likely a comparative vs a noun (teacher)
    if (w === base + 'r' || w === base + 'er' || w === base.slice(0, -1) + 'ier') {
      return { pos: 'adjective', label: 'Comparative', icon: '-er' };
    }
  }
  if (w.endsWith('ier') && base.endsWith('y')) {
    return { pos: 'adjective', label: 'Comparative', icon: '-er' };
  }
  if (w.endsWith('iest') && base.endsWith('y')) {
    return { pos: 'adjective', label: 'Superlative', icon: '-est' };
  }
  
  // Adverb patterns
  if (w.endsWith('ly')) {
    return { pos: 'adverb', label: 'Adverb', icon: 'Adv' };
  }
  if (w.endsWith('ily')) {
    return { pos: 'adverb', label: 'Adverb', icon: 'Adv' };
  }
  if (w.endsWith('ally')) {
    return { pos: 'adverb', label: 'Adverb', icon: 'Adv' };
  }
  
  // Adjective patterns
  if (w.endsWith('ive') || w.endsWith('ative')) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  if (w.endsWith('ous') || w.endsWith('ious') || w.endsWith('eous')) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  if (w.endsWith('able') || w.endsWith('ible')) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  if (w.endsWith('ful') || w.endsWith('less')) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  if (w.endsWith('al') && w.length > 4) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  if (w.endsWith('ic') || w.endsWith('ical')) {
    return { pos: 'adjective', label: 'Adjective', icon: 'Adj' };
  }
  
  // Noun patterns
  if (w.endsWith('tion') || w.endsWith('sion')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  if (w.endsWith('ment')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  if (w.endsWith('ness')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  if (w.endsWith('ity')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  if (w.endsWith('ance') || w.endsWith('ence')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  if (w.endsWith('er') || w.endsWith('or')) {
    // Person nouns (creator, teacher)
    return { pos: 'noun', label: 'Noun (person)', icon: 'N' };
  }
  if (w.endsWith('ist') || w.endsWith('ism')) {
    return { pos: 'noun', label: 'Noun', icon: 'N' };
  }
  
  // Default verb patterns
  if (w.endsWith('ize') || w.endsWith('ise')) {
    return { pos: 'verb', label: 'Verb', icon: 'V' };
  }
  if (w.endsWith('ify')) {
    return { pos: 'verb', label: 'Verb', icon: 'V' };
  }
  if (w.endsWith('ate') && w.length > 5) {
    return { pos: 'verb', label: 'Verb', icon: 'V' };
  }
  
  return null; // Unknown
}

/**
 * Verify a word exists and get its form info using dictionary API
 * @param {string} word - Word to verify
 * @param {string} baseWord - Original search word for context
 * @returns {Promise<Object|null>} Word info or null if not found
 */
async function verifyWordForm(word, baseWord) {
  try {
    const response = await fetch(`${ENGLISH_API_BASE}${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || !data[0]) return null;
    
    const entry = data[0];
    const meanings = entry.meanings || [];
    
    if (meanings.length === 0) return null;
    
    // Order for sorting
    const orderMap = {
      'noun': 1,
      'verb': 2,
      'adjective': 3,
      'adverb': 4
    };
    
    // Get form info based on word pattern
    const formInfo = getWordFormInfo(word, baseWord);
    
    // Collect all parts of speech from API
    const apiPOSList = meanings.map(m => m.partOfSpeech?.toLowerCase()).filter(Boolean);
    
    let label, icon, pos;
    
    if (formInfo && apiPOSList.includes(formInfo.pos)) {
      // Use our detected form info if API confirms the POS
      label = formInfo.label;
      icon = formInfo.icon;
      pos = formInfo.pos;
    } else if (formInfo) {
      // Trust the pattern-based detection
      label = formInfo.label;
      icon = formInfo.icon;
      pos = formInfo.pos;
    } else {
      // Fall back to API's first result with generic labels
      pos = apiPOSList[0];
      const genericLabels = {
        'noun': { label: 'Noun', icon: 'N' },
        'verb': { label: 'Verb', icon: 'V' },
        'adjective': { label: 'Adjective', icon: 'Adj' },
        'adverb': { label: 'Adverb', icon: 'Adv' }
      };
      const generic = genericLabels[pos];
      if (!generic) return null;
      label = generic.label;
      icon = generic.icon;
    }
    
    return {
      word: entry.word,
      partOfSpeech: label,
      icon: icon,
      order: orderMap[pos] || 5
    };
  } catch {
    return null;
  }
}

/**
 * Fetch word family (related word forms) by generating and verifying forms
 * @param {string} word - The word to find family for
 * @returns {Promise<Object>} Word family with different parts of speech
 */
export async function fetchWordFamily(word) {
  const trimmedWord = word.trim().toLowerCase();
  
  // Skip phrases
  if (trimmedWord.includes(' ')) {
    return { word: trimmedWord, forms: [], hasContent: false };
  }
  
  try {
    // Generate potential word forms
    const potentialForms = generatePotentialForms(trimmedWord);
    
    // Verify forms in parallel (check all generated forms)
    const verificationPromises = potentialForms.map(form => verifyWordForm(form, trimmedWord));
    const results = await Promise.all(verificationPromises);
    
    // Filter valid results and remove duplicates
    const seenWords = new Set([trimmedWord]);
    const seenPOS = new Set();
    const forms = [];
    
    for (const result of results) {
      if (result && !seenWords.has(result.word.toLowerCase())) {
        // Prefer one word per part of speech for cleaner results
        const posKey = result.partOfSpeech;
        if (!seenPOS.has(posKey) || forms.length < 4) {
          seenWords.add(result.word.toLowerCase());
          seenPOS.add(posKey);
          forms.push(result);
        }
      }
    }
    
    // Sort by part of speech order: Noun, Verb, Adjective, Adverb
    forms.sort((a, b) => a.order - b.order);
    
    // Limit to 6 results
    const limitedForms = forms.slice(0, 6);
    
    return {
      word: trimmedWord,
      forms: limitedForms,
      hasContent: limitedForms.length > 0
    };
  } catch (error) {
    console.error('Word family fetch error:', error);
    return { word: trimmedWord, forms: [], hasContent: false };
  }
}
