/**
 * EasyDict PWA - Main Application
 * English-Chinese Dictionary with Word Analysis
 */

import { lookupWord, lookupChineseWord, isChinese, getBestAudioUrl, getPhoneticText, getAllSynonyms, fetchWordFamily, fetchChineseTranslation, fetchEnglishDefinition, DictionaryError } from './js/dictionary-service.js';
import { audioPlayer } from './js/audio-player.js';
// word-forms-analyzer.js no longer used - replaced by API-based Word Family
import { analyzeWordRoot, ComponentType } from './js/word-root-analyzer.js';
import { analyzeWordUsage, UsageScenario } from './js/word-usage-analyzer.js';
import { TOEFL_VOCABULARY } from './js/toefl-vocabulary.js';

// GRE vocabulary loaded on first use so a missing file doesn't break the app
let GRE_VOCABULARY = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const backBtn = document.getElementById('backBtn');
const historyBtn = document.getElementById('historyBtn');
const shareBtn = document.getElementById('shareBtn');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const dismissError = document.getElementById('dismissError');
const searchSection = document.getElementById('searchSection');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsContainer = document.getElementById('resultsContainer');
const emptyState = document.getElementById('emptyState');
const welcomeSection = document.getElementById('welcomeSection');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const notebookBtn = document.getElementById('notebookBtn');
const notebookSection = document.getElementById('notebookSection');
const notebookList = document.getElementById('notebookList');
const clearNotebookBtn = document.getElementById('clearNotebookBtn');
const exportNotebookBtn = document.getElementById('exportNotebookBtn');
const importNotebookBtn = document.getElementById('importNotebookBtn');
const importNotebookInput = document.getElementById('importNotebookInput');
const notebookAddBar = document.getElementById('notebookAddBar');
const notebookAddBtn = document.getElementById('notebookAddBtn');
const notebookAddLabel = document.getElementById('notebookAddLabel');
const learnToffleBtn = document.getElementById('learnToffleBtn');
const toffleSection = document.getElementById('toffleSection');
const toffleLetterGrid = document.getElementById('toffleLetterGrid');
const toffleBackToLetters = document.getElementById('toffleBackToLetters');
const toffleSubtitle = document.getElementById('toffleSubtitle');
const toffleList = document.getElementById('toffleList');
const learnGreBtn = document.getElementById('learnGreBtn');
const greSection = document.getElementById('greSection');
const greLetterGrid = document.getElementById('greLetterGrid');
const greBackToLetters = document.getElementById('greBackToLetters');
const greSubtitle = document.getElementById('greSubtitle');
const greList = document.getElementById('greList');
const learnIdiomBtn = document.getElementById('learnIdiomBtn');
const idiomSection = document.getElementById('idiomSection');
const idiomLetterGrid = document.getElementById('idiomLetterGrid');
const idiomBackToLetters = document.getElementById('idiomBackToLetters');
const idiomSubtitle = document.getElementById('idiomSubtitle');
const idiomList = document.getElementById('idiomList');

// Result elements
const resultWord = document.getElementById('resultWord');
const phoneticText = document.getElementById('phoneticText');
const playAudioBtn = document.getElementById('playAudioBtn');
const audioIcon = document.getElementById('audioIcon');
const audioSpinner = document.getElementById('audioSpinner');
const chineseTranslation = document.getElementById('chineseTranslation');
const definitionsContainer = document.getElementById('definitionsContainer');
const wordRootCard = document.getElementById('wordRootCard');
const wordRootContent = document.getElementById('wordRootContent');
const wordFamilyCard = document.getElementById('wordFamilyCard');
const wordFamilyContent = document.getElementById('wordFamilyContent');
const wordUsageCard = document.getElementById('wordUsageCard');
const wordUsageContent = document.getElementById('wordUsageContent');
const googleLink = document.getElementById('googleLink');

// State
let currentResult = null;
let currentAudioUrl = null;
let searchHistory = [];
let notebook = [];
/** @type {Set<string>} - lowercase words user has marked as known */
let toffleKnown = new Set();
/** 'letters' = 26-letter grid, 'letter' = word list for one letter */
let toffleView = 'letters';
/** Current letter when toffleView === 'letter' (e.g. 'A') */
let toffleCurrentLetter = null;

// Constants
const MAX_HISTORY_SIZE = 20;
const HISTORY_STORAGE_KEY = 'easydict_search_history';
const NOTEBOOK_STORAGE_KEY = 'easydict_notebook';
const TOFFLE_KNOWN_STORAGE_KEY = 'easydict_toffle_known';
const GRE_KNOWN_STORAGE_KEY = 'easydict_gre_known';
const IDIOM_KNOWN_STORAGE_KEY = 'easydict_idiom_known';

/** @type {Set<string>} - GRE words user has marked as known */
let greKnown = new Set();
/** 'letters' = 26-letter grid, 'letter' = word list for one letter */
let greView = 'letters';
/** Current letter when greView === 'letter' (e.g. 'A') */
let greCurrentLetter = null;

/** Idiom vocabulary (common American idioms); fallback set at init, file load may replace */
let IDIOM_VOCABULARY = getDefaultIdiomVocabulary();
/** @type {Set<string>} - idioms (lowercase) user has marked as known */
let idiomKnown = new Set();
let idiomView = 'letters';
let idiomCurrentLetter = null;

/** Navigation stack for Back: each entry is { view, letter? }. Back pops and shows previous view. */
let navStack = [];

/**
 * @returns {{ view: string, letter?: string }} Current view descriptor
 */
function getCurrentView() {
  if (resultsContainer && resultsContainer.style.display === 'flex') return { view: 'results' };
  if (notebookSection && notebookSection.style.display === 'block') return { view: 'notebook' };
  if (historySection && historySection.style.display === 'block') return { view: 'history' };
  if (toffleSection && toffleSection.style.display === 'block') {
    return toffleView === 'letter' ? { view: 'toffle-letter', letter: toffleCurrentLetter } : { view: 'toffle' };
  }
  if (greSection && greSection.style.display === 'block') {
    return greView === 'letter' ? { view: 'gre-letter', letter: greCurrentLetter } : { view: 'gre' };
  }
  if (idiomSection && idiomSection.style.display === 'block') {
    return idiomView === 'letter' ? { view: 'idiom-letter', letter: idiomCurrentLetter } : { view: 'idiom' };
  }
  return { view: 'welcome' };
}

/**
 * Show a previously saved view (used when Back pops from nav stack).
 * @param {{ view: string, letter?: string }} desc
 */
function showView(desc) {
  hideResults();
  hideError();
  showEmptyState();
  if (searchInput) searchInput.value = '';
  handleInputChange();
  if (backBtn) backBtn.style.display = 'none';
  if (shareBtn) shareBtn.style.display = 'none';
  if (notebookAddBar) notebookAddBar.style.display = 'none';
  window.history.replaceState({}, '', window.location.pathname);

  if (desc.view === 'notebook') {
    if (searchSection) searchSection.style.display = 'none';
    if (backBtn) backBtn.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    if (notebookSection) notebookSection.style.display = 'block';
    updateNotebookDisplay();
  } else if (desc.view === 'toffle' || desc.view === 'toffle-letter') {
    if (searchSection) searchSection.style.display = 'none';
    if (backBtn) backBtn.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    if (notebookSection) notebookSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    if (toffleSection) {
      toffleSection.style.display = 'block';
      toffleView = desc.view === 'toffle-letter' ? 'letter' : 'letters';
      toffleCurrentLetter = desc.view === 'toffle-letter' ? (desc.letter || null) : null;
      updateToffleDisplay();
    }
  } else if (desc.view === 'gre' || desc.view === 'gre-letter') {
    if (searchSection) searchSection.style.display = 'none';
    if (backBtn) backBtn.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    if (notebookSection) notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    if (greSection) {
      greSection.style.display = 'block';
      greView = desc.view === 'gre-letter' ? 'letter' : 'letters';
      greCurrentLetter = desc.view === 'gre-letter' ? (desc.letter || null) : null;
      updateGreDisplay();
    }
    if (idiomSection) idiomSection.style.display = 'none';
  } else if (desc.view === 'idiom' || desc.view === 'idiom-letter') {
    if (searchSection) searchSection.style.display = 'none';
    if (backBtn) backBtn.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    if (notebookSection) notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) {
      idiomSection.style.display = 'block';
      idiomView = desc.view === 'idiom-letter' ? 'letter' : 'letters';
      idiomCurrentLetter = desc.view === 'idiom-letter' ? (desc.letter || null) : null;
      updateIdiomDisplay();
    }
  } else if (desc.view === 'history') {
    if (searchSection) searchSection.style.display = '';
    if (notebookSection) notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    updateHistoryDisplay();
    if (searchHistory.length > 0) {
      if (welcomeSection) welcomeSection.style.display = 'none';
      if (historySection) historySection.style.display = 'block';
    } else {
      if (welcomeSection) welcomeSection.style.display = 'block';
      if (historySection) historySection.style.display = 'none';
    }
  } else {
    // welcome
    if (searchSection) searchSection.style.display = '';
    if (notebookSection) notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    updateHistoryDisplay();
    if (welcomeSection) welcomeSection.style.display = 'block';
    if (historySection) historySection.style.display = 'none';
  }
}

/**
 * Push current view onto nav stack, then navigate to the given panel (same as goBackToHome but with history).
 */
function navigateTo(panel) {
  const current = getCurrentView();
  navStack.push(current);
  goBackToHome(panel);
}

/**
 * Go back to the previous page (pop nav stack). If stack is empty, go to welcome.
 */
function goBack() {
  if (navStack.length === 0) {
    goBackToHome();
    return;
  }
  const previous = navStack.pop();
  showView(previous);
}

/** Inline fallback idiom list so Idiom page works even if js/idiom-vocabulary.js fails to load */
function getDefaultIdiomVocabulary() {
  return [
    'a blessing in disguise', 'a dime a dozen', 'a piece of cake', 'a taste of your own medicine',
    'actions speak louder than words', 'add insult to injury', 'at the drop of a hat', 'back to square one',
    'ball is in your court', 'bark up the wrong tree', 'beat around the bush', 'bend over backwards',
    'best of both worlds', 'bite the bullet', 'break the ice', 'bring something to the table',
    'burn the midnight oil', 'by the skin of your teeth', 'call it a day', 'caught between a rock and a hard place',
    'chip on your shoulder', 'cold feet', 'come rain or shine', 'cost an arm and a leg',
    'cross that bridge when you come to it', 'curiosity killed the cat', 'cut somebody some slack',
    'cutting corners', 'down to earth', 'draw the line', 'drive someone up the wall', 'drop the ball',
    'easier said than done', 'elephant in the room', 'every cloud has a silver lining', 'feel under the weather',
    'get off on the wrong foot', 'get out of hand', 'get the ball rolling', 'get your act together',
    'go the extra mile', 'hang in there', 'hard nut to crack', 'head in the clouds', 'hear a pin drop',
    'hit the nail on the head', 'hit the sack', 'hold your horses', 'in the heat of the moment', 'in the same boat',
    'it takes two to tango', 'jump on the bandwagon', 'jump the gun', 'keep your chin up',
    'kill two birds with one stone', 'let the cat out of the bag', 'long story short', 'miss the boat',
    'no pain no gain', 'off the top of my head', 'on cloud nine', 'on the same page', 'once in a blue moon',
    'piece of cake', 'pull yourself together', 'raining cats and dogs', 'read between the lines',
    'see eye to eye', 'sit on the fence', 'speak of the devil', 'spill the beans', 'take it with a grain of salt',
    'the ball is in your court', 'the best of both worlds', 'the last straw', 'the whole nine yards',
    'through thick and thin', 'throw in the towel', 'time flies', 'under the weather', 'up in the air',
    'when pigs fly', 'wrap your head around something', 'you can say that again', 'your call'
  ];
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSearchHistory();
    loadNotebook();
    loadToffleKnown();
    loadGreKnown();
    loadIdiomKnown();
    loadIdiomVocabulary();
    setupEventListeners();
    registerServiceWorker();
    checkUrlForWord();
    // Always show welcome on app open (never default to history)
    if (welcomeSection) welcomeSection.style.display = 'block';
    if (historySection) historySection.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  } catch (err) {
    console.error('EasyDict init error:', err);
  }
});

/**
 * Check URL for word parameter and search if present
 */
function checkUrlForWord() {
  const urlParams = new URLSearchParams(window.location.search);
  const word = urlParams.get('word') || urlParams.get('q');
  if (word) {
    searchInput.value = word;
    handleInputChange();
    handleSearch();
  }
}

/**
 * Register service worker for PWA
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Search
  if (searchBtn) searchBtn.addEventListener('click', handleSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    searchInput.addEventListener('input', handleInputChange);
  }

  // Clear button
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (searchInput) searchInput.focus();
  });

  // Back button - go to previous page (pop nav stack)
  if (backBtn) backBtn.addEventListener('click', goBack);

  // History button - show history panel
  if (historyBtn) historyBtn.addEventListener('click', () => navigateTo('history'));

  // Notebook button - show notebook panel
  if (notebookBtn) notebookBtn.addEventListener('click', () => navigateTo('notebook'));

  // Learn TOFFLE button - show TOFFLE vocabulary page
  if (learnToffleBtn) learnToffleBtn.addEventListener('click', () => navigateTo('toffle'));

  // Learn GRE button - show GRE vocabulary page
  if (learnGreBtn) learnGreBtn.addEventListener('click', () => navigateTo('gre'));

  // Learn Idioms button - show Idioms page
  if (learnIdiomBtn) learnIdiomBtn.addEventListener('click', () => navigateTo('idiom'));

  // Share button
  if (shareBtn) shareBtn.addEventListener('click', handleShare);

  // Add to Notebook button
  if (notebookAddBtn) notebookAddBtn.addEventListener('click', handleNotebookToggle);

  // Error dismiss
  if (dismissError) dismissError.addEventListener('click', hideError);

  // Audio player
  if (playAudioBtn) playAudioBtn.addEventListener('click', handlePlayAudio);
  if (audioPlayer && audioPlayer.setStateChangeCallback) audioPlayer.setStateChangeCallback(updateAudioButtonState);

  // History
  if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

  // Notebook
  if (clearNotebookBtn) clearNotebookBtn.addEventListener('click', clearNotebook);
  if (exportNotebookBtn) exportNotebookBtn.addEventListener('click', exportNotebook);
  if (importNotebookBtn) importNotebookBtn.addEventListener('click', () => importNotebookInput?.click());
  if (importNotebookInput) importNotebookInput.addEventListener('change', handleImportNotebookFile);
  setupNotebookDragDrop();
  setupNotebookItemClick();

  if (toffleList) toffleList.addEventListener('click', handleToffleListClick);
  if (toffleLetterGrid) toffleLetterGrid.addEventListener('click', handleToffleLetterGridClick);
  if (toffleBackToLetters) toffleBackToLetters.addEventListener('click', () => { if (navStack.length > 0) navStack.pop(); toffleShowLetterGrid(); });
  if (greList) greList.addEventListener('click', handleGreListClick);
  if (greLetterGrid) greLetterGrid.addEventListener('click', handleGreLetterGridClick);
  if (greBackToLetters) greBackToLetters.addEventListener('click', () => { if (navStack.length > 0) navStack.pop(); greShowLetterGrid(); });
  if (idiomLetterGrid) idiomLetterGrid.addEventListener('click', handleIdiomLetterGridClick);
  if (idiomList) idiomList.addEventListener('click', handleIdiomListClick);
  if (idiomBackToLetters) idiomBackToLetters.addEventListener('click', () => { if (navStack.length > 0) navStack.pop(); idiomShowLetterGrid(); });
}

/**
 * Go back to home view, optionally showing history or notebook
 * @param {'history'|'notebook'} panel - Which panel to show (default: welcome or history if has items)
 */
function goBackToHome(panel) {
  hideResults();
  hideError();
  showEmptyState();
  if (searchInput) searchInput.value = '';
  handleInputChange();
  if (backBtn) backBtn.style.display = 'none';
  if (shareBtn) shareBtn.style.display = 'none';
  if (notebookAddBar) notebookAddBar.style.display = 'none';
  window.history.replaceState({}, '', window.location.pathname);

  if (panel === 'notebook') {
    if (searchSection) searchSection.style.display = 'none';
    backBtn.style.display = 'flex';
    welcomeSection.style.display = 'none';
    historySection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    notebookSection.style.display = 'block';
    updateNotebookDisplay();
  } else if (panel === 'toffle') {
    if (searchSection) searchSection.style.display = 'none';
    backBtn.style.display = 'flex';
    welcomeSection.style.display = 'none';
    historySection.style.display = 'none';
    notebookSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    if (toffleSection) {
      toffleSection.style.display = 'block';
      toffleView = 'letters';
      toffleCurrentLetter = null;
      updateToffleDisplay();
    }
  } else if (panel === 'gre') {
    if (searchSection) searchSection.style.display = 'none';
    backBtn.style.display = 'flex';
    welcomeSection.style.display = 'none';
    historySection.style.display = 'none';
    notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    if (greSection) {
      greSection.style.display = 'block';
      greView = 'letters';
      greCurrentLetter = null;
      if (GRE_VOCABULARY.length === 0) {
        import('./js/gre-vocabulary.js').then((m) => {
          GRE_VOCABULARY = m.GRE_VOCABULARY || [];
          updateGreDisplay();
        }).catch(() => {
          GRE_VOCABULARY = [];
          updateGreDisplay();
        });
      } else {
        updateGreDisplay();
      }
    }
  } else if (panel === 'idiom') {
    if (searchSection) searchSection.style.display = 'none';
    backBtn.style.display = 'flex';
    welcomeSection.style.display = 'none';
    historySection.style.display = 'none';
    notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) {
      idiomSection.style.display = 'block';
      idiomView = 'letters';
      idiomCurrentLetter = null;
      updateIdiomDisplay();
    }
  } else if (panel === 'history') {
    if (searchSection) searchSection.style.display = '';
    notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    updateHistoryDisplay();
    if (searchHistory.length > 0) {
      welcomeSection.style.display = 'none';
      historySection.style.display = 'block';
    } else {
      welcomeSection.style.display = 'block';
      historySection.style.display = 'none';
    }
  } else {
    if (searchSection) searchSection.style.display = '';
    notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
    if (idiomSection) idiomSection.style.display = 'none';
    updateHistoryDisplay();
    welcomeSection.style.display = 'block';
    historySection.style.display = 'none';
  }
}

/**
 * Handle share button click
 */
async function handleShare() {
  if (!currentResult) return;
  
  const word = currentResult.word || currentResult.chineseWord;
  const shareUrl = `${window.location.origin}${window.location.pathname}?word=${encodeURIComponent(word)}`;
  
  // Try native share API first (works on mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: `EasyDict - ${word}`,
        text: `Look up "${word}" on EasyDict`,
        url: shareUrl
      });
      return;
    } catch (error) {
      // User cancelled or share failed, fall back to clipboard
    }
  }
  
  // Fall back to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    showShareToast('Link copied to clipboard!');
  } catch (error) {
    // Final fallback - prompt user
    prompt('Copy this link:', shareUrl);
  }
}

/**
 * Show a brief toast message
 */
function showShareToast(message) {
  const toast = document.createElement('div');
  toast.className = 'share-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Handle input change
 */
function handleInputChange() {
  clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
}

/**
 * Handle search
 */
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  hideError();
  showLoading();
  hideResults();

  try {
    let result;
    
    // Check if input is Chinese
    if (isChinese(query)) {
      result = await lookupChineseWord(query);
      currentResult = result;
      displayChineseResults(result);
    } else {
      result = await lookupWord(query);
      currentResult = result;
      displayResults(result);
    }
    
    // Add to history
    addToHistory(query);
  } catch (error) {
    console.error('Search error:', error);
    showError(getErrorMessage(error));
    showEmptyState();
  } finally {
    hideLoading();
  }
}

/**
 * Search a specific word (used for synonym clicks)
 * @param {string} word - Word to search
 */
function searchWord(word) {
  searchInput.value = word;
  handleInputChange();
  handleSearch();
}

// Expose to global scope for inline handlers
window.searchWord = searchWord;

/**
 * Get user-friendly error message
 * @param {Object} error - Error object
 * @returns {string} Error message
 */
function getErrorMessage(error) {
  if (error.type === DictionaryError.WORD_NOT_FOUND) {
    return 'Word not found. Try a different spelling or search for a phrase.';
  }
  if (error.type === DictionaryError.NETWORK_ERROR) {
    return 'Network error. Please check your connection and try again.';
  }
  if (error.type === DictionaryError.DECODING_ERROR) {
    return 'Unable to process the response. Please try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Display Chinese → English results
 * @param {Object} result - Chinese lookup result
 */
function displayChineseResults(result) {
  // Word header - show Chinese word
  resultWord.textContent = result.chineseWord;
  phoneticText.textContent = '';
  currentAudioUrl = null;
  // Show play button for TTS (Chinese or English translation) to improve pronunciation coverage
  const hasWordToSpeak = !!(result.chineseWord || result.englishTranslation);
  playAudioBtn.style.display = hasWordToSpeak ? 'flex' : 'none';
  
  // Hide the Chinese translation card (we're translating FROM Chinese)
  document.querySelector('.chinese-translation-card').style.display = 'none';
  
  // Clear and build definitions container for Chinese results
  definitionsContainer.innerHTML = '';
  
  // First Section: English Translation (main translation clickable)
  const mainTranslationEscaped = String(result.englishTranslation).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const translationCard = document.createElement('div');
  translationCard.className = 'definition-card';
  translationCard.innerHTML = `
    <div class="card-header">
      <span class="card-icon">Aa</span>
      <span class="card-title">English Translation</span>
    </div>
    <div class="english-translation-content">
      <span class="main-translation main-translation-clickable" onclick="searchWord('${mainTranslationEscaped}')">${result.englishTranslation}</span>
      ${result.translationWords.length > 1 ? `
        <div class="translation-words">
          ${result.translationWords.map(word => `
            <span class="translation-word-tag" onclick="searchWord('${word}')">${word}</span>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  definitionsContainer.appendChild(translationCard);
  
  // Second Section: Alternative English Words
  if (result.alternatives.length > 0) {
    const alternativesCard = document.createElement('div');
    alternativesCard.className = 'definition-card';
    alternativesCard.innerHTML = `
      <div class="card-header">
        <span class="card-icon">🔄</span>
        <span class="card-title">Alternative English Words</span>
      </div>
      <p class="alternatives-description">Other English words that may translate to "${result.chineseWord}":</p>
      <div class="alternatives-grid">
        ${result.alternatives.map(word => `
          <span class="alternative-word-tag" onclick="searchWord('${word}')">${word}</span>
        `).join('')}
      </div>
    `;
    definitionsContainer.appendChild(alternativesCard);
  }
  
  // If we have definitions for the main word, show them
  if (result.definitions.length > 0) {
    const entry = result.definitions[0];
    entry.meanings.slice(0, 2).forEach((meaning) => {
      const card = document.createElement('div');
      card.className = 'definition-card';
      
      const limitedDefinitions = meaning.definitions.slice(0, 2);
      
      card.innerHTML = `
        <div class="card-header">
          <span class="card-icon">📖</span>
          <span class="card-title">${result.translationWords[0] || result.englishTranslation.split(' ')[0]} - ${meaning.partOfSpeech}</span>
        </div>
        <div class="definitions-list">
          ${limitedDefinitions.map((def, index) => `
            <div class="definition-item">
              <span class="definition-number">${index + 1}</span>
              <div class="definition-content">
                <p class="definition-text">${def.definition}</p>
                ${def.example ? `<p class="definition-example">"${def.example}"</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      definitionsContainer.appendChild(card);
    });
  }
  
  // Hide word root, family and usage cards for Chinese input
  wordRootCard.style.display = 'none';
  wordFamilyCard.style.display = 'none';
  wordUsageCard.style.display = 'none';
  
  // Set Google link
  googleLink.href = `https://www.google.com/search?q=${encodeURIComponent(result.chineseWord)}&udm=50`;
  
  // Show results
  showResults();
}

/**
 * Display results
 * @param {Object} result - Lookup result
 */
function displayResults(result) {
  // Word header
  resultWord.textContent = result.word;
  
  // Phonetic
  if (result.englishDefinitions.length > 0) {
    const phonetic = getPhoneticText(result.englishDefinitions[0]);
    phoneticText.textContent = phonetic || '';
    
    // Audio: API URL or TTS fallback (so pronunciation is available for more words)
    currentAudioUrl = getBestAudioUrl(result.englishDefinitions[0].phonetics);
    const hasWordToSpeak = !!(result.word || result.chineseWord || result.englishTranslation);
    playAudioBtn.style.display = (currentAudioUrl || hasWordToSpeak) ? 'flex' : 'none';
  } else {
    phoneticText.textContent = '';
    currentAudioUrl = null;
    // Still show play button if we have text for TTS (e.g. Chinese lookup with English translation)
    const hasWordToSpeak = !!(result.word || result.chineseWord || result.englishTranslation);
    playAudioBtn.style.display = hasWordToSpeak ? 'flex' : 'none';
  }
  
  // Show Chinese translation card (may have been hidden by Chinese search)
  document.querySelector('.chinese-translation-card').style.display = 'block';
  
  // Chinese translation - show primary and alternatives separated
  const translation = result.chineseTranslation;
  if (typeof translation === 'object' && translation.primary) {
    const allTranslations = [translation.primary, ...(translation.alternatives || [])];
    chineseTranslation.innerHTML = allTranslations
      .map((t, i) => `<span class="${i === 0 ? 'chinese-primary' : 'chinese-alt-item'}">${t}</span>`)
      .join('<span class="chinese-separator"> · </span>');
  } else {
    chineseTranslation.textContent = translation;
  }
  
  // English definitions
  displayDefinitions(result);
  
  // Word root analysis
  displayWordRoot(result);
  
  // Word family (async - fetched from API)
  displayWordFamily(result.word);
  
  // Word usage analysis
  displayWordUsage(result);
  
  // Set Google link
  googleLink.href = `https://www.google.com/search?q=${encodeURIComponent(result.word)}&udm=50`;
  
  // Show results
  showResults();
}

/**
 * Display English definitions
 * @param {Object} result - Lookup result
 */
function displayDefinitions(result) {
  definitionsContainer.innerHTML = '';
  
  if (result.englishDefinitions.length === 0) {
    if (result.isPhrase) {
      definitionsContainer.innerHTML = `
        <div class="definition-card">
          <div class="card-header">
            <span class="card-icon">📝</span>
            <span class="card-title">Phrase</span>
          </div>
          <p style="color: var(--gray-500); font-style: italic;">
            This is a phrase. English definition is not available, but see the Chinese translation above.
          </p>
        </div>
      `;
    }
    return;
  }
  
  // Group definitions by part of speech
  const entry = result.englishDefinitions[0];
  const allSynonyms = getAllSynonyms(entry);
  
  entry.meanings.forEach((meaning) => {
    const card = document.createElement('div');
    card.className = 'definition-card';
    
    // Limit to 3 definitions per part of speech
    const limitedDefinitions = meaning.definitions.slice(0, 3);
    
    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">📖</span>
        <span class="card-title">${meaning.partOfSpeech}</span>
      </div>
      <div class="definitions-list">
        ${limitedDefinitions.map((def, index) => `
          <div class="definition-item">
            <span class="definition-number">${index + 1}</span>
            <div class="definition-content">
              <p class="definition-text">${def.definition}</p>
              ${def.example ? `<p class="definition-example">"${def.example}"</p>` : ''}
              ${def.synonyms && def.synonyms.length > 0 ? `
                <div class="synonyms-container">
                  <span class="synonym-label">Synonyms:</span>
                  ${def.synonyms.slice(0, 5).map(syn => `
                    <span class="synonym-tag" onclick="searchWord('${syn}')">${syn}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    definitionsContainer.appendChild(card);
  });
}

/**
 * Display word root analysis
 * @param {Object} result - Lookup result
 */
function displayWordRoot(result) {
  // Only analyze single words
  if (result.isPhrase || result.word.includes(' ')) {
    wordRootCard.style.display = 'none';
    return;
  }
  
  const origin = result.englishDefinitions[0]?.origin || null;
  const analysis = analyzeWordRoot(result.word, origin);
  
  if (!analysis.hasContent) {
    wordRootCard.style.display = 'none';
    return;
  }
  
  let html = '';
  
  // Visual breakdown
  if (analysis.components.length > 0) {
    html += `
      <div class="word-breakdown">
        ${analysis.components.map((comp, index) => `
          ${index > 0 ? '<span class="component-arrow">→</span>' : ''}
          <div class="component-badge ${comp.type.key}">
            <span class="component-part">${comp.part}</span>
            <span class="component-type">${comp.type.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="components-detail">
        ${analysis.components.map(comp => `
          <div class="component-detail-item">
            <span class="component-detail-badge ${comp.type.key}">${comp.type.label}</span>
            <div class="component-detail-content">
              <span class="component-detail-part">${comp.part}-</span>
              <span class="component-detail-meaning">${comp.meaning}</span>
              <span class="component-detail-chinese">${comp.chineseMeaning}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Origin
  if (analysis.origin) {
    html += `
      <div class="origin-section" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--gray-200);">
        <p style="font-size: var(--text-sm); color: var(--gray-600);"><strong>Origin:</strong> ${analysis.origin}</p>
      </div>
    `;
  }
  
  wordRootContent.innerHTML = html;
  wordRootCard.style.display = 'block';
}

/**
 * Display word family (related word forms from API)
 * @param {string} word - Word to find family for
 */
async function displayWordFamily(word) {
  // Skip phrases
  if (word.includes(' ')) {
    wordFamilyCard.style.display = 'none';
    return;
  }
  
  // Show loading state
  wordFamilyContent.innerHTML = '<p class="loading-text">Finding related words...</p>';
  wordFamilyCard.style.display = 'block';
  
  try {
    const family = await fetchWordFamily(word);
    
    if (!family.hasContent) {
      wordFamilyCard.style.display = 'none';
      return;
    }
    
    const html = `
      <div class="word-family-grid">
        ${family.forms.map(form => `
          <div class="word-family-item" onclick="searchWord('${form.word}')">
            <span class="word-family-pos">${form.icon}</span>
            <span class="word-family-word">${form.word}</span>
            <span class="word-family-label">${form.partOfSpeech}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    wordFamilyContent.innerHTML = html;
  } catch (error) {
    console.error('Word family error:', error);
    wordFamilyCard.style.display = 'none';
  }
}

/**
 * Display word usage analysis
 * @param {Object} result - Lookup result
 */
function displayWordUsage(result) {
  // Only analyze single words
  if (result.isPhrase || result.word.includes(' ')) {
    wordUsageCard.style.display = 'none';
    return;
  }
  
  const synonyms = result.englishDefinitions[0] ? getAllSynonyms(result.englishDefinitions[0]) : [];
  const analysis = analyzeWordUsage(result.word, synonyms);
  
  if (!analysis.hasContent) {
    wordUsageCard.style.display = 'none';
    return;
  }
  
  // Sort: appropriate (good) usages first, then alternatives
  const sortedSuggestions = [...analysis.suggestions].sort((a, b) => {
    if (a.isAppropriate && !b.isAppropriate) return -1;
    if (!a.isAppropriate && b.isAppropriate) return 1;
    return 0;
  });
  
  const html = sortedSuggestions.map(suggestion => `
    <div class="usage-scenario ${suggestion.isAppropriate ? 'appropriate' : 'alternative'}">
      <div class="usage-scenario-row">
        <span class="usage-icon">${suggestion.scenario.icon}</span>
        <span class="usage-scenario-name">${suggestion.scenario.label}</span>
        <div class="usage-status-badge ${suggestion.isAppropriate ? 'good' : 'consider'}">
          ${suggestion.isAppropriate ? '✓' : '△'}
        </div>
      </div>
      ${!suggestion.isAppropriate && suggestion.suggestedWord ? `
        <div class="usage-suggestion-row">
          <span class="suggestion-arrow">→</span>
          <span class="suggestion-word" onclick="searchWord('${suggestion.suggestedWord}')">${suggestion.suggestedWord}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  wordUsageContent.innerHTML = html;
  wordUsageCard.style.display = 'block';
}

/**
 * Handle play audio button click (API audio or TTS fallback)
 */
function handlePlayAudio() {
  if (currentAudioUrl) {
    audioPlayer.toggle(currentAudioUrl);
    return;
  }
  // TTS fallback when API has no audio – improves pronunciation coverage
  const text = currentResult?.isChinese
    ? (currentResult.chineseWord || currentResult.englishTranslation)
    : (currentResult?.word || currentResult?.englishTranslation || currentResult?.chineseWord);
  if (!text) return;
  if (audioPlayer.isPlaying) {
    audioPlayer.stop();
  } else {
    const lang = currentResult?.isChinese ? 'zh-CN' : 'en-US';
    audioPlayer.speakTts(text, lang);
  }
}

/**
 * Update audio button state
 * @param {Object} state - Audio state
 */
function updateAudioButtonState(state) {
  if (state.isLoading) {
    audioIcon.style.display = 'none';
    audioSpinner.style.display = 'block';
  } else {
    audioIcon.style.display = 'block';
    audioSpinner.style.display = 'none';
  }
}

// UI State Functions

function showLoading() {
  loadingIndicator.style.display = 'flex';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
}

function showResults() {
  if (getCurrentView().view !== 'results') {
    navStack.push(getCurrentView());
  }
  resultsContainer.style.display = 'flex';
  emptyState.style.display = 'none';
  backBtn.style.display = 'flex';
  shareBtn.style.display = 'flex';
  if (notebookAddBar) notebookAddBar.style.display = 'flex';
  updateNotebookButtonState();
  
  // Update URL with current word
  const word = currentResult?.word || currentResult?.chineseWord;
  if (word) {
    const newUrl = `${window.location.pathname}?word=${encodeURIComponent(word)}`;
    window.history.replaceState({}, '', newUrl);
  }
}

function hideResults() {
  resultsContainer.style.display = 'none';
  backBtn.style.display = 'none';
  shareBtn.style.display = 'none';
  if (notebookAddBar) notebookAddBar.style.display = 'none';
}

function showEmptyState() {
  emptyState.style.display = 'flex';
  updateHistoryDisplay();
}

function showError(message) {
  errorMessage.textContent = message;
  errorBanner.style.display = 'flex';
}

function hideError() {
  errorBanner.style.display = 'none';
}

// Search History Functions

function loadSearchHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      searchHistory = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load search history:', error);
    searchHistory = [];
  }
  updateHistoryDisplay();
}

function saveSearchHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(searchHistory));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

function addToHistory(word) {
  // Remove if already exists
  const index = searchHistory.indexOf(word.toLowerCase());
  if (index > -1) {
    searchHistory.splice(index, 1);
  }
  
  // Add to beginning
  searchHistory.unshift(word.toLowerCase());
  
  // Limit size
  if (searchHistory.length > MAX_HISTORY_SIZE) {
    searchHistory = searchHistory.slice(0, MAX_HISTORY_SIZE);
  }
  
  saveSearchHistory();
  updateHistoryDisplay();
}

function removeFromHistory(word) {
  const index = searchHistory.indexOf(word.toLowerCase());
  if (index > -1) {
    searchHistory.splice(index, 1);
    saveSearchHistory();
    updateHistoryDisplay();
  }
}

function clearHistory() {
  if (!confirm('Clear all search history? This cannot be undone.')) return;
  searchHistory = [];
  saveSearchHistory();
  updateHistoryDisplay();
}

function updateHistoryDisplay() {
  if (searchHistory.length === 0) {
    historyList.innerHTML = '';
    if (clearHistoryBtn) clearHistoryBtn.style.display = 'none';
    return;
  }
  if (clearHistoryBtn) clearHistoryBtn.style.display = 'block';
  historyList.innerHTML = searchHistory.map(word => `
    <li class="history-item" onclick="searchWord('${word}')">
      <svg class="history-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <span class="history-item-word">${word}</span>
      <button class="history-item-delete" onclick="event.stopPropagation(); removeFromHistory('${word}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </li>
  `).join('');
}

// Notebook functions
function loadNotebook() {
  try {
    const stored = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
    if (stored) {
      notebook = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load notebook:', error);
    notebook = [];
  }
}

function saveNotebook() {
  try {
    localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(notebook));
  } catch (error) {
    console.error('Failed to save notebook:', error);
  }
}

function addToNotebook(word) {
  const w = word.trim();
  if (!w) return;
  const key = w.toLowerCase();
  if (notebook.some(item => item.toLowerCase() === key)) return;
  notebook.unshift(w);
  saveNotebook();
  updateNotebookDisplay();
  updateNotebookButtonState();
}

function removeFromNotebook(word) {
  const key = word.toLowerCase();
  notebook = notebook.filter(item => item.toLowerCase() !== key);
  saveNotebook();
  updateNotebookDisplay();
  updateNotebookButtonState();
}

function clearNotebook() {
  if (!confirm('Clear all words from your notebook? This cannot be undone.')) return;
  notebook = [];
  saveNotebook();
  updateNotebookDisplay();
}

/**
 * Export notebook as a local JSON file (download).
 */
function exportNotebook() {
  const data = {
    app: 'EasyDict',
    exportedAt: new Date().toISOString(),
    words: [...notebook]
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `easydict-notebook-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Handle file selected for import (merge words into notebook).
 * @param {Event} e - change event from file input
 */
function handleImportNotebookFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const words = Array.isArray(parsed) ? parsed : (parsed?.words ?? []);
      if (!Array.isArray(words)) {
        showError('Invalid format: expected an array of words or { words: [...] }');
        return;
      }
      const seen = new Set(notebook.map(w => w.toLowerCase()));
      let added = 0;
      for (const w of words) {
        const word = typeof w === 'string' ? w.trim() : String(w).trim();
        if (!word) continue;
        const key = word.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        notebook.push(word);
        added++;
      }
      if (added > 0) {
        saveNotebook();
        updateNotebookDisplay();
        updateNotebookButtonState();
      }
    } catch (err) {
      console.error('Import failed:', err);
      showError('Could not read file. Use a valid JSON file (array of words or { words: [...] }).');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function updateNotebookDisplay() {
  if (notebook.length === 0) {
    notebookList.innerHTML = '<li class="notebook-empty">No words in your notebook yet. Search for a word and tap "Add to Notebook".</li>';
    clearNotebookBtn.style.display = 'none';
    return;
  }
  clearNotebookBtn.style.display = 'block';
  notebookList.innerHTML = notebook.map((word, index) => `
    <li class="notebook-item" data-index="${index}">
      <span class="notebook-item-grip" draggable="true" aria-label="Hold to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z"/></svg>
      </span>
      <svg class="notebook-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <div class="notebook-item-text">
        <span class="notebook-item-word" data-word="${(word || '').replace(/"/g, '&quot;')}">${word}</span>
        <span class="notebook-item-translation" data-word="${(word || '').replace(/"/g, '&quot;')}"></span>
      </div>
      <button type="button" class="notebook-pronounce-btn" data-word="${(word || '').replace(/"/g, '&quot;')}" aria-label="Pronounce">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      </button>
      <div class="notebook-item-reorder">
        <button type="button" class="notebook-move-btn notebook-move-up" data-index="${index}" aria-label="Move up" ${index === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
        <button type="button" class="notebook-move-btn notebook-move-down" data-index="${index}" aria-label="Move down" ${index === notebook.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <button class="notebook-item-delete" type="button" onclick="event.stopPropagation(); removeFromNotebook('${word.replace(/'/g, "\\'")}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </li>
  `).join('');
  loadNotebookTranslations();
}

/**
 * Fetch Chinese translation for each notebook word and fill the second line (limited concurrency).
 */
async function loadNotebookTranslations() {
  if (!notebookList || notebook.length === 0) return;
  const CONCURRENCY = 3;
  const queue = [...notebook];
  async function run() {
    while (queue.length > 0) {
      const word = queue.shift();
      if (!word) continue;
      try {
        const result = await fetchChineseTranslation(word);
        const primary = result?.primary || '';
        notebookList.querySelectorAll('.notebook-item-translation').forEach((el) => {
          if (el.dataset.word === word) el.textContent = primary;
        });
      } catch (_) {
        // Leave translation empty on error
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => run());
  await Promise.all(workers);
}

function updateNotebookButtonState() {
  const word = currentResult?.word || currentResult?.chineseWord;
  if (!word) return;
  const key = word.trim().toLowerCase();
  const inNotebook = notebook.some(item => item.toLowerCase() === key);
  notebookAddBtn.classList.toggle('in-notebook', inNotebook);
  notebookAddLabel.textContent = inNotebook ? 'Remove from Notebook' : 'Add to Notebook';
}

function handleNotebookToggle() {
  const word = currentResult?.word || currentResult?.chineseWord;
  if (!word) return;
  const key = word.trim().toLowerCase();
  const inNotebook = notebook.some(item => item.toLowerCase() === key);
  if (inNotebook) {
    removeFromNotebook(word.trim());
  } else {
    addToNotebook(word.trim());
  }
}

let notebookDragEndTime = 0;

function setupNotebookDragDrop() {
  if (!notebookList) return;

  notebookList.addEventListener('dragstart', (e) => {
    const grip = e.target.closest('.notebook-item-grip');
    const item = grip ? grip.closest('.notebook-item') : e.target.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    e.dataTransfer.setData('text/plain', item.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', '{}'); // required for drop in some browsers
    item.classList.add('notebook-item-dragging');
  });
  notebookList.addEventListener('dragend', (e) => {
    const item = e.target.closest('.notebook-item');
    if (item) item.classList.remove('notebook-item-dragging');
    notebookDragEndTime = Date.now();
  });
  notebookList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.notebook-item');
    if (item && !item.classList.contains('notebook-item-dragging')) {
      item.classList.add('notebook-item-drag-over');
    }
  });
  notebookList.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.notebook-item');
    if (item) item.classList.remove('notebook-item-drag-over');
  });
  notebookList.addEventListener('drop', (e) => {
    e.preventDefault();
    notebookList.querySelectorAll('.notebook-item').forEach(el => el.classList.remove('notebook-item-drag-over'));
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const targetItem = e.target.closest('.notebook-item');
    if (!targetItem || targetItem.classList.contains('notebook-empty') || Number.isNaN(fromIndex)) return;
    const toIndex = parseInt(targetItem.dataset.index, 10);
    if (fromIndex === toIndex) return;
    const [word] = notebook.splice(fromIndex, 1);
    notebook.splice(toIndex, 0, word);
    saveNotebook();
    updateNotebookDisplay();
  });

  // Touch support for iPhone: long-press on grip only to start reorder, then drag; drop by Y position
  let touchLongPressTimer = null;
  let touchDragFromIndex = null;
  let touchLastY = 0;
  const LONG_PRESS_MS = 450;
  const MOVE_THRESHOLD_PX = 18;

  notebookList.addEventListener('touchstart', (e) => {
    const grip = e.target.closest('.notebook-item-grip');
    if (!grip) return;
    const item = grip.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    const fromIndex = parseInt(item.dataset.index, 10);
    touchLastY = e.touches[0].clientY;
    touchLongPressTimer = setTimeout(() => {
      touchLongPressTimer = null;
      touchDragFromIndex = fromIndex;
      item.classList.add('notebook-item-dragging');
    }, LONG_PRESS_MS);
  }, { passive: true });

  notebookList.addEventListener('touchmove', (e) => {
    if (touchLongPressTimer != null) {
      const dy = Math.abs(e.touches[0].clientY - touchLastY);
      if (dy > MOVE_THRESHOLD_PX) {
        clearTimeout(touchLongPressTimer);
        touchLongPressTimer = null;
      }
      return;
    }
    if (touchDragFromIndex != null) {
      touchLastY = e.touches[0].clientY;
      e.preventDefault();
      notebookList.querySelectorAll('.notebook-item').forEach(el => el.classList.remove('notebook-item-drag-over'));
      const items = notebookList.querySelectorAll('.notebook-item:not(.notebook-empty)');
      for (const el of items) {
        if (parseInt(el.dataset.index, 10) === touchDragFromIndex) continue;
        const rect = el.getBoundingClientRect();
        if (touchLastY >= rect.top && touchLastY <= rect.bottom) {
          el.classList.add('notebook-item-drag-over');
          break;
        }
      }
    }
  }, { passive: false });

  notebookList.addEventListener('touchend', (e) => {
    if (touchLongPressTimer != null) {
      clearTimeout(touchLongPressTimer);
      touchLongPressTimer = null;
    }
    if (touchDragFromIndex == null) return;
    notebookList.querySelectorAll('.notebook-item').forEach(el => el.classList.remove('notebook-item-dragging', 'notebook-item-drag-over'));
    const fromIndex = touchDragFromIndex;
    touchDragFromIndex = null;
    const items = notebookList.querySelectorAll('.notebook-item:not(.notebook-empty)');
    let toIndex = fromIndex;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (touchLastY <= mid) {
        toIndex = i;
        break;
      }
      toIndex = i;
    }
    if (fromIndex !== toIndex) {
      const [word] = notebook.splice(fromIndex, 1);
      notebook.splice(toIndex, 0, word);
      saveNotebook();
      updateNotebookDisplay();
    }
  }, { passive: true });

  notebookList.addEventListener('touchcancel', () => {
    if (touchLongPressTimer != null) clearTimeout(touchLongPressTimer);
    touchLongPressTimer = null;
    touchDragFromIndex = null;
    notebookList.querySelectorAll('.notebook-item').forEach(el => el.classList.remove('notebook-item-dragging', 'notebook-item-drag-over'));
  }, { passive: true });
}

function setupNotebookItemClick() {
  if (!notebookList) return;
  notebookList.addEventListener('click', (e) => {
    if (Date.now() - notebookDragEndTime < 400) return; // ignore click right after drag
    const item = e.target.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    if (e.target.closest('.notebook-item-grip') || e.target.closest('.notebook-item-delete')) return;
    // Pronunciation (same icon as search page; play without leaving notebook)
    const pronounceBtn = e.target.closest('.notebook-pronounce-btn');
    if (pronounceBtn) {
      e.preventDefault();
      const w = pronounceBtn.dataset.word ? pronounceBtn.dataset.word.replace(/&quot;/g, '"') : (pronounceBtn.closest('.notebook-item')?.querySelector('.notebook-item-word')?.textContent || '').trim();
      if (w) pronounceNotebookWord(w);
      return;
    }
    // Move up / move down (touch-friendly reorder on iPhone)
    const moveUp = e.target.closest('.notebook-move-up');
    const moveDown = e.target.closest('.notebook-move-down');
    if (moveUp && !moveUp.disabled) {
      e.preventDefault();
      moveNotebookItemUp(parseInt(moveUp.dataset.index, 10));
      return;
    }
    if (moveDown && !moveDown.disabled) {
      e.preventDefault();
      moveNotebookItemDown(parseInt(moveDown.dataset.index, 10));
      return;
    }
    const wordEl = item.querySelector('.notebook-item-word');
    const word = wordEl?.dataset?.word ? wordEl.dataset.word.replace(/&quot;/g, '"') : (wordEl?.textContent || '').trim();
    if (word) searchWord(word);
  });
}

function moveNotebookItemUp(index) {
  if (index <= 0) return;
  [notebook[index - 1], notebook[index]] = [notebook[index], notebook[index - 1]];
  saveNotebook();
  updateNotebookDisplay();
}

function moveNotebookItemDown(index) {
  if (index >= notebook.length - 1) return;
  [notebook[index], notebook[index + 1]] = [notebook[index + 1], notebook[index]];
  saveNotebook();
  updateNotebookDisplay();
}

/**
 * Pronounce a notebook word (API audio when available, else TTS). Does not leave the notebook page.
 */
async function pronounceNotebookWord(word) {
  const w = (word || '').trim();
  if (!w) return;
  try {
    const entries = await fetchEnglishDefinition(w);
    if (entries && entries[0] && entries[0].phonetics) {
      const url = getBestAudioUrl(entries[0].phonetics);
      if (url) {
        audioPlayer.play(url);
        return;
      }
    }
  } catch (_) {
    // Word not found or network error: fall back to TTS
  }
  audioPlayer.speakTts(w, 'en-US');
}

// TOFFLE (TOEFL vocabulary)
function loadToffleKnown() {
  try {
    const stored = localStorage.getItem(TOFFLE_KNOWN_STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      toffleKnown = new Set(arr.map((w) => String(w).toLowerCase()));
    }
  } catch (error) {
    console.error('Failed to load TOFFLE known words:', error);
    toffleKnown = new Set();
  }
}

function saveToffleKnown() {
  try {
    localStorage.setItem(TOFFLE_KNOWN_STORAGE_KEY, JSON.stringify([...toffleKnown]));
  } catch (error) {
    console.error('Failed to save TOFFLE known words:', error);
  }
}

function toggleToffleKnown(word) {
  const key = String(word).trim().toLowerCase();
  if (!key) return;
  if (toffleKnown.has(key)) {
    toffleKnown.delete(key);
  } else {
    toffleKnown.add(key);
  }
  saveToffleKnown();
  updateToffleDisplay();
}

function updateToffleDisplay() {
  if (toffleView === 'letters') {
    updateToffleLetterGrid();
    if (toffleLetterGrid) toffleLetterGrid.style.display = 'grid';
    if (toffleList) toffleList.style.display = 'none';
    if (toffleBackToLetters) toffleBackToLetters.style.display = 'none';
    if (toffleSubtitle) toffleSubtitle.textContent = 'Choose a letter';
  } else {
    updateToffleWordList(toffleCurrentLetter);
    if (toffleLetterGrid) toffleLetterGrid.style.display = 'none';
    if (toffleList) toffleList.style.display = 'block';
    if (toffleBackToLetters) toffleBackToLetters.style.display = 'block';
    if (toffleSubtitle) toffleSubtitle.textContent = toffleCurrentLetter ? `Words starting with ${toffleCurrentLetter}` : 'Choose a letter';
  }
}

function updateToffleLetterGrid() {
  if (!toffleLetterGrid) return;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  toffleLetterGrid.innerHTML = letters.map((letter) => {
    const count = (TOEFL_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter).length;
    return `<button type="button" class="toffle-letter-btn" data-letter="${letter}" title="${letter} (${count} words)">${letter}</button>`;
  }).join('');
}

function updateToffleWordList(letter) {
  if (!toffleList || !letter) return;
  const words = (TOEFL_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter.toUpperCase());
  toffleList.innerHTML = words.map((word) => {
    const key = word.toLowerCase();
    const known = toffleKnown.has(key);
    const displayWord = word.charAt(0).toUpperCase() + word.slice(1);
    return `
      <li class="toffle-item ${known ? 'toffle-item--known' : ''}" data-word="${(word || '').replace(/"/g, '&quot;')}">
        <div class="toffle-item-text">
          <span class="toffle-item-word">${displayWord}</span>
          <span class="toffle-item-translation" data-word="${(word || '').replace(/"/g, '&quot;')}"></span>
        </div>
        <button type="button" class="toffle-pronounce-btn" data-word="${(word || '').replace(/"/g, '&quot;')}" aria-label="Pronounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </button>
        <button type="button" class="toffle-item-known-btn" title="${known ? 'Mark as unknown' : 'I know this word'}" aria-label="${known ? 'Mark as unknown' : 'I know this word'}">
          ${known ? '✓' : '○'}
        </button>
      </li>
    `;
  }).join('');
  loadToffleTranslations(letter);
}

async function loadToffleTranslations(letter) {
  if (!toffleList) return;
  const words = (TOEFL_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter.toUpperCase());
  const CONCURRENCY = 3;
  const queue = [...words];
  async function run() {
    while (queue.length > 0) {
      const word = queue.shift();
      if (!word) continue;
      try {
        const result = await fetchChineseTranslation(word);
        const primary = result?.primary || '';
        toffleList.querySelectorAll('.toffle-item-translation').forEach((el) => {
          if (el.dataset.word === word) el.textContent = primary;
        });
      } catch (_) {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, words.length) }, () => run()));
}

function handleToffleLetterGridClick(e) {
  const btn = e.target.closest('.toffle-letter-btn');
  if (!btn) return;
  const letter = btn.dataset.letter;
  if (!letter) return;
  navStack.push(getCurrentView());
  toffleView = 'letter';
  toffleCurrentLetter = letter;
  updateToffleDisplay();
}

function toffleShowLetterGrid() {
  toffleView = 'letters';
  toffleCurrentLetter = null;
  updateToffleDisplay();
}

function handleToffleListClick(e) {
  const item = e.target.closest('.toffle-item');
  if (!item) return;
  const word = item.dataset?.word ? item.dataset.word.replace(/&quot;/g, '"') : (item.querySelector('.toffle-item-word')?.textContent || '').trim();
  if (!word) return;
  if (e.target.closest('.toffle-pronounce-btn')) {
    e.preventDefault();
    pronounceNotebookWord(word);
    return;
  }
  if (e.target.closest('.toffle-item-known-btn')) {
    e.preventDefault();
    toggleToffleKnown(word);
  } else {
    searchWord(word);
  }
}

// GRE (GRE vocabulary)
function loadGreKnown() {
  try {
    const stored = localStorage.getItem(GRE_KNOWN_STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      greKnown = new Set(arr.map((w) => String(w).toLowerCase()));
    }
  } catch (error) {
    console.error('Failed to load GRE known words:', error);
    greKnown = new Set();
  }
}

function saveGreKnown() {
  try {
    localStorage.setItem(GRE_KNOWN_STORAGE_KEY, JSON.stringify([...greKnown]));
  } catch (error) {
    console.error('Failed to save GRE known words:', error);
  }
}

function toggleGreKnown(word) {
  const key = String(word).trim().toLowerCase();
  if (!key) return;
  if (greKnown.has(key)) {
    greKnown.delete(key);
  } else {
    greKnown.add(key);
  }
  saveGreKnown();
  updateGreDisplay();
}

function updateGreDisplay() {
  if (greView === 'letters') {
    updateGreLetterGrid();
    if (greLetterGrid) greLetterGrid.style.display = 'grid';
    if (greList) greList.style.display = 'none';
    if (greBackToLetters) greBackToLetters.style.display = 'none';
    if (greSubtitle) greSubtitle.textContent = 'Choose a letter';
  } else {
    updateGreWordList(greCurrentLetter);
    if (greLetterGrid) greLetterGrid.style.display = 'none';
    if (greList) greList.style.display = 'block';
    if (greBackToLetters) greBackToLetters.style.display = 'block';
    if (greSubtitle) greSubtitle.textContent = greCurrentLetter ? `Words starting with ${greCurrentLetter}` : 'Choose a letter';
  }
}

function updateGreLetterGrid() {
  if (!greLetterGrid) return;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  greLetterGrid.innerHTML = letters.map((letter) => {
    const count = (GRE_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter).length;
    return `<button type="button" class="toffle-letter-btn" data-letter="${letter}" title="${letter} (${count} words)">${letter}</button>`;
  }).join('');
}

function updateGreWordList(letter) {
  if (!greList || !letter) return;
  const words = (GRE_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter.toUpperCase());
  greList.innerHTML = words.map((word) => {
    const key = word.toLowerCase();
    const known = greKnown.has(key);
    const inNotebook = notebook.some((item) => item.toLowerCase() === key);
    const displayWord = word.charAt(0).toUpperCase() + word.slice(1);
    return `
      <li class="toffle-item ${known ? 'toffle-item--known' : ''} ${inNotebook ? 'toffle-item--in-notebook' : ''}" data-word="${(word || '').replace(/"/g, '&quot;')}">
        <div class="toffle-item-text">
          <span class="toffle-item-word">${displayWord}</span>
          <span class="toffle-item-translation" data-word="${(word || '').replace(/"/g, '&quot;')}"></span>
        </div>
        <button type="button" class="toffle-pronounce-btn" data-word="${(word || '').replace(/"/g, '&quot;')}" aria-label="Pronounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </button>
        ${inNotebook ? '<span class="toffle-item-notebook-icon" title="In your notebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg></span>' : ''}
        <button type="button" class="toffle-item-known-btn" title="${known ? 'Mark as unknown' : 'I know this word'}" aria-label="${known ? 'Mark as unknown' : 'I know this word'}">
          ${known ? '✓' : '○'}
        </button>
      </li>
    `;
  }).join('');
  loadGreTranslations(greCurrentLetter);
}

async function loadGreTranslations(letter) {
  if (!greList || !letter) return;
  const words = (GRE_VOCABULARY || []).filter((w) => w.charAt(0).toUpperCase() === letter.toUpperCase());
  const CONCURRENCY = 3;
  const queue = [...words];
  async function run() {
    while (queue.length > 0) {
      const word = queue.shift();
      if (!word) continue;
      try {
        const result = await fetchChineseTranslation(word);
        const primary = result?.primary || '';
        greList.querySelectorAll('.toffle-item-translation').forEach((el) => {
          if (el.dataset.word === word) el.textContent = primary;
        });
      } catch (_) {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, words.length) }, () => run()));
}

function handleGreLetterGridClick(e) {
  const btn = e.target.closest('.toffle-letter-btn');
  if (!btn) return;
  const letter = btn.dataset.letter;
  if (!letter) return;
  greView = 'letter';
  greCurrentLetter = letter;
  updateGreDisplay();
}

function greShowLetterGrid() {
  greView = 'letters';
  greCurrentLetter = null;
  updateGreDisplay();
}

function handleGreListClick(e) {
  const item = e.target.closest('.toffle-item');
  if (!item) return;
  const word = item.dataset?.word ? item.dataset.word.replace(/&quot;/g, '"') : (item.querySelector('.toffle-item-word')?.textContent || '').trim();
  if (!word) return;
  if (e.target.closest('.toffle-pronounce-btn')) {
    e.preventDefault();
    pronounceNotebookWord(word);
    return;
  }
  if (e.target.closest('.toffle-item-known-btn')) {
    e.preventDefault();
    toggleGreKnown(word);
  } else {
    searchWord(word);
  }
}

// Idioms: hardcoded list only (from js/idiom-vocabulary.js or inline default)
function loadIdiomVocabulary() {
  import('./js/idiom-vocabulary.js')
    .then((m) => {
      const list = m.IDIOM_VOCABULARY;
      if (Array.isArray(list) && list.length > 0) IDIOM_VOCABULARY = list;
      if (idiomSection && idiomSection.style.display === 'block') updateIdiomDisplay();
    })
    .catch(() => {});
}

function loadIdiomKnown() {
  try {
    const stored = localStorage.getItem(IDIOM_KNOWN_STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      idiomKnown = new Set(arr.map((w) => String(w).toLowerCase()));
    }
  } catch (error) {
    console.error('Failed to load idiom known:', error);
    idiomKnown = new Set();
  }
}

function saveIdiomKnown() {
  try {
    localStorage.setItem(IDIOM_KNOWN_STORAGE_KEY, JSON.stringify([...idiomKnown]));
  } catch (error) {
    console.error('Failed to save idiom known:', error);
  }
}

function updateIdiomDisplay() {
  if (idiomView === 'letters') {
    updateIdiomLetterGrid();
    if (idiomLetterGrid) idiomLetterGrid.style.display = 'grid';
    if (idiomList) idiomList.style.display = 'none';
    if (idiomBackToLetters) idiomBackToLetters.style.display = 'none';
    if (idiomSubtitle) idiomSubtitle.textContent = 'Choose a letter';
  } else {
    updateIdiomWordList(idiomCurrentLetter);
    if (idiomLetterGrid) idiomLetterGrid.style.display = 'none';
    if (idiomList) idiomList.style.display = 'block';
    if (idiomBackToLetters) idiomBackToLetters.style.display = 'block';
    if (idiomSubtitle) idiomSubtitle.textContent = idiomCurrentLetter ? `Idioms starting with ${idiomCurrentLetter}` : 'Choose a letter';
  }
}

function updateIdiomLetterGrid() {
  if (!idiomLetterGrid) return;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  idiomLetterGrid.innerHTML = letters.map((letter) => {
    const count = (IDIOM_VOCABULARY || []).filter((p) => p.trim().charAt(0).toUpperCase() === letter).length;
    return `<button type="button" class="toffle-letter-btn" data-letter="${letter}" title="${letter} (${count} idioms)">${letter}</button>`;
  }).join('');
}

function updateIdiomWordList(letter) {
  if (!idiomList || !letter) return;
  const phrases = (IDIOM_VOCABULARY || []).filter((p) => p.trim().charAt(0).toUpperCase() === letter.toUpperCase());
  idiomList.innerHTML = phrases.map((phrase) => {
    const key = phrase.trim().toLowerCase();
    const known = idiomKnown.has(key);
    const displayPhrase = phrase.trim().charAt(0).toUpperCase() + phrase.trim().slice(1);
    return `
      <li class="toffle-item ${known ? 'toffle-item--known' : ''}" data-word="${(phrase || '').replace(/"/g, '&quot;')}">
        <div class="toffle-item-text">
          <span class="toffle-item-word">${displayPhrase}</span>
          <span class="toffle-item-translation" data-word="${(phrase || '').replace(/"/g, '&quot;')}"></span>
        </div>
        <button type="button" class="toffle-pronounce-btn" data-word="${(phrase || '').replace(/"/g, '&quot;')}" aria-label="Pronounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </button>
        <button type="button" class="toffle-item-known-btn" title="${known ? 'Mark as unknown' : 'I know this idiom'}" aria-label="${known ? 'Mark as unknown' : 'I know this idiom'}">
          ${known ? '✓' : '○'}
        </button>
      </li>
    `;
  }).join('');
  loadIdiomTranslations(letter);
}

async function loadIdiomTranslations(letter) {
  if (!idiomList || !letter) return;
  const phrases = (IDIOM_VOCABULARY || []).filter((p) => p.trim().charAt(0).toUpperCase() === letter.toUpperCase());
  const CONCURRENCY = 3;
  const queue = [...phrases];
  async function run() {
    while (queue.length > 0) {
      const phrase = queue.shift();
      if (!phrase) continue;
      try {
        const result = await fetchChineseTranslation(phrase.trim());
        const primary = result?.primary || '';
        idiomList.querySelectorAll('.toffle-item-translation').forEach((el) => {
          if (el.dataset.word === phrase) el.textContent = primary;
        });
      } catch (_) {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, phrases.length) }, () => run()));
}

function handleIdiomLetterGridClick(e) {
  const btn = e.target.closest('.toffle-letter-btn');
  if (!btn) return;
  const letter = btn.dataset.letter;
  if (!letter) return;
  navStack.push(getCurrentView());
  idiomView = 'letter';
  idiomCurrentLetter = letter;
  updateIdiomDisplay();
}

function idiomShowLetterGrid() {
  idiomView = 'letters';
  idiomCurrentLetter = null;
  updateIdiomDisplay();
}

function handleIdiomListClick(e) {
  const item = e.target.closest('.toffle-item');
  if (!item) return;
  const phrase = item.dataset?.word ? item.dataset.word.replace(/&quot;/g, '"') : (item.querySelector('.toffle-item-word')?.textContent || '').trim();
  if (!phrase) return;
  if (e.target.closest('.toffle-pronounce-btn')) {
    e.preventDefault();
    audioPlayer.speakTts(phrase, 'en-US');
    return;
  }
  if (e.target.closest('.toffle-item-known-btn')) {
    e.preventDefault();
    toggleIdiomKnown(phrase);
  } else {
    searchWord(phrase);
  }
}

function toggleIdiomKnown(phrase) {
  const key = String(phrase).trim().toLowerCase();
  if (!key) return;
  if (idiomKnown.has(key)) {
    idiomKnown.delete(key);
  } else {
    idiomKnown.add(key);
  }
  saveIdiomKnown();
  updateIdiomDisplay();
}

// Expose to global scope for inline handlers
window.removeFromHistory = removeFromHistory;
window.removeFromNotebook = removeFromNotebook;
