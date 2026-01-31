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
 * Fetch word family (related word forms) using Datamuse API
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
    // Use Datamuse API to find morphologically related words
    // rel_trg = triggered by, sp = spelled like pattern
    const rootLength = Math.max(3, Math.floor(trimmedWord.length * 0.6));
    const root = trimmedWord.substring(0, rootLength);
    
    // Fetch words that start with the same root
    const response = await fetch(`${DATAMUSE_API_BASE}?sp=${root}*&md=p&max=50`);
    
    if (!response.ok) {
      return { word: trimmedWord, forms: [], hasContent: false };
    }
    
    const data = await response.json();
    
    // Common derivational suffixes by part of speech
    const suffixPatterns = {
      noun: ['tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'er', 'or', 'ist', 'ism', 'dom', 'ship', 'hood', 'age', 'ure', 'al', 'th'],
      verb: ['ize', 'ise', 'ify', 'ate', 'en', 'ed', 'ing'],
      adjective: ['able', 'ible', 'al', 'ial', 'ful', 'less', 'ous', 'ious', 'ive', 'ic', 'ical', 'ant', 'ent', 'ary', 'ory', 'y', 'ly', 'ed'],
      adverb: ['ly', 'ally', 'ily', 'ward', 'wise']
    };
    
    // Map Datamuse tags to readable labels
    const posLabels = {
      n: { label: 'Noun', icon: 'N' },
      v: { label: 'Verb', icon: 'V' },
      adj: { label: 'Adjective', icon: 'Adj' },
      adv: { label: 'Adverb', icon: 'Adv' }
    };
    
    const forms = [];
    const seenWords = new Set([trimmedWord]);
    
    for (const item of data) {
      const relatedWord = item.word.toLowerCase();
      
      // Skip the original word and already seen words
      if (seenWords.has(relatedWord)) continue;
      
      // Must share significant portion of the root
      if (!relatedWord.startsWith(root.substring(0, Math.min(3, root.length)))) continue;
      
      // Skip if too different in length
      if (Math.abs(relatedWord.length - trimmedWord.length) > 6) continue;
      
      // Get part of speech from tags
      const tags = item.tags || [];
      let pos = null;
      
      for (const tag of tags) {
        if (posLabels[tag]) {
          pos = tag;
          break;
        }
      }
      
      if (pos && !seenWords.has(relatedWord)) {
        seenWords.add(relatedWord);
        forms.push({
          word: relatedWord,
          partOfSpeech: posLabels[pos].label,
          icon: posLabels[pos].icon
        });
        
        if (forms.length >= 8) break;
      }
    }
    
    // Sort by part of speech order: Noun, Verb, Adjective, Adverb
    const posOrder = ['Noun', 'Verb', 'Adjective', 'Adverb'];
    forms.sort((a, b) => posOrder.indexOf(a.partOfSpeech) - posOrder.indexOf(b.partOfSpeech));
    
    return {
      word: trimmedWord,
      forms,
      hasContent: forms.length > 0
    };
  } catch (error) {
    console.error('Word family fetch error:', error);
    return { word: trimmedWord, forms: [], hasContent: false };
  }
}
