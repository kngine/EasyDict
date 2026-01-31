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
 * @returns {Array<string>} Potential word forms to check
 */
function generatePotentialForms(word) {
  const forms = new Set();
  const w = word.toLowerCase();
  
  // Common transformations for verbs
  // -ed (past tense)
  forms.add(w + 'ed');
  forms.add(w + 'd');
  if (w.endsWith('e')) forms.add(w + 'd');
  if (w.endsWith('y')) forms.add(w.slice(0, -1) + 'ied');
  if (w.match(/[aeiou][bcdfghjklmnpqrstvwxz]$/)) forms.add(w + w.slice(-1) + 'ed');
  
  // -ing (present participle)
  forms.add(w + 'ing');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'ing');
  if (w.match(/[aeiou][bcdfghjklmnpqrstvwxz]$/)) forms.add(w + w.slice(-1) + 'ing');
  
  // -s, -es (plural/third person)
  forms.add(w + 's');
  forms.add(w + 'es');
  if (w.endsWith('y')) forms.add(w.slice(0, -1) + 'ies');
  
  // Noun forms
  forms.add(w + 'tion');
  forms.add(w + 'ation');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'ation');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'ion');
  forms.add(w + 'ment');
  forms.add(w + 'ness');
  forms.add(w + 'er');
  forms.add(w + 'or');
  forms.add(w + 'ist');
  forms.add(w + 'ity');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'ity');
  if (w.endsWith('ive')) forms.add(w.slice(0, -3) + 'ion');
  
  // Adjective forms
  forms.add(w + 'ive');
  forms.add(w + 'ative');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'ive');
  if (w.endsWith('ion')) forms.add(w.slice(0, -3) + 'ive');
  forms.add(w + 'able');
  forms.add(w + 'ible');
  if (w.endsWith('e')) forms.add(w.slice(0, -1) + 'able');
  forms.add(w + 'al');
  forms.add(w + 'ful');
  forms.add(w + 'less');
  forms.add(w + 'ous');
  forms.add(w + 'y');
  
  // Adverb forms
  forms.add(w + 'ly');
  if (w.endsWith('y')) forms.add(w.slice(0, -1) + 'ily');
  if (w.endsWith('le')) forms.add(w.slice(0, -1) + 'y');
  if (w.endsWith('ic')) forms.add(w + 'ally');
  
  // Try to find base form (remove common suffixes)
  const suffixesToRemove = ['ed', 'ing', 's', 'es', 'tion', 'ation', 'ment', 'ness', 'er', 'or', 'ive', 'able', 'ible', 'al', 'ly', 'ity'];
  for (const suffix of suffixesToRemove) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      const base = w.slice(0, -suffix.length);
      forms.add(base);
      forms.add(base + 'e');
    }
  }
  
  // Remove the original word and invalid forms
  forms.delete(w);
  
  return Array.from(forms).filter(f => f.length > 2 && f.length < 20);
}

/**
 * Verify a word exists and get its part of speech using dictionary API
 * @param {string} word - Word to verify
 * @returns {Promise<Object|null>} Word info or null if not found
 */
async function verifyWordForm(word) {
  try {
    const response = await fetch(`${ENGLISH_API_BASE}${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || !data[0]) return null;
    
    // Get the primary part of speech
    const entry = data[0];
    const meanings = entry.meanings || [];
    
    if (meanings.length === 0) return null;
    
    // Map parts of speech to display labels
    const posMap = {
      'noun': { label: 'Noun', icon: 'N', order: 1 },
      'verb': { label: 'Verb', icon: 'V', order: 2 },
      'adjective': { label: 'Adjective', icon: 'Adj', order: 3 },
      'adverb': { label: 'Adverb', icon: 'Adv', order: 4 },
      'participle': { label: 'Participle', icon: 'Part', order: 5 }
    };
    
    const pos = meanings[0].partOfSpeech?.toLowerCase();
    const posInfo = posMap[pos];
    
    if (!posInfo) return null;
    
    return {
      word: entry.word,
      partOfSpeech: posInfo.label,
      icon: posInfo.icon,
      order: posInfo.order
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
    
    // Limit concurrent requests - check top candidates
    const topCandidates = potentialForms.slice(0, 12);
    
    // Verify forms in parallel
    const verificationPromises = topCandidates.map(form => verifyWordForm(form));
    const results = await Promise.all(verificationPromises);
    
    // Filter valid results and remove duplicates
    const seenWords = new Set([trimmedWord]);
    const forms = [];
    
    for (const result of results) {
      if (result && !seenWords.has(result.word.toLowerCase())) {
        seenWords.add(result.word.toLowerCase());
        forms.push(result);
      }
    }
    
    // Sort by part of speech order
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
