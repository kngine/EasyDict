/**
 * EasyDict PWA - Main Application
 * English-Chinese Dictionary with Word Analysis
 */

import { lookupWord, lookupChineseWord, isChinese, getBestAudioUrl, getPhoneticText, getAllSynonyms, fetchWordFamily, DictionaryError } from './js/dictionary-service.js';
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

/** @type {Set<string>} - GRE words user has marked as known */
let greKnown = new Set();
/** 'letters' = 26-letter grid, 'letter' = word list for one letter */
let greView = 'letters';
/** Current letter when greView === 'letter' (e.g. 'A') */
let greCurrentLetter = null;

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
    if (notebookSection) notebookSection.style.display = 'block';
    updateNotebookDisplay();
  } else if (desc.view === 'toffle' || desc.view === 'toffle-letter') {
    if (searchSection) searchSection.style.display = 'none';
    if (backBtn) backBtn.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    if (notebookSection) notebookSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
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
    if (greSection) {
      greSection.style.display = 'block';
      greView = desc.view === 'gre-letter' ? 'letter' : 'letters';
      greCurrentLetter = desc.view === 'gre-letter' ? (desc.letter || null) : null;
      updateGreDisplay();
    }
  } else if (desc.view === 'history') {
    if (searchSection) searchSection.style.display = '';
    if (notebookSection) notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSearchHistory();
    loadNotebook();
    loadToffleKnown();
    loadGreKnown();
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
  setupNotebookDragDrop();
  setupNotebookItemClick();

  if (toffleList) toffleList.addEventListener('click', handleToffleListClick);
  if (toffleLetterGrid) toffleLetterGrid.addEventListener('click', handleToffleLetterGridClick);
  if (toffleBackToLetters) toffleBackToLetters.addEventListener('click', () => goBack());
  if (greList) greList.addEventListener('click', handleGreListClick);
  if (greLetterGrid) greLetterGrid.addEventListener('click', handleGreLetterGridClick);
  if (greBackToLetters) greBackToLetters.addEventListener('click', () => goBack());
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
    notebookSection.style.display = 'block';
    updateNotebookDisplay();
  } else if (panel === 'toffle') {
    if (searchSection) searchSection.style.display = 'none';
    backBtn.style.display = 'flex';
    welcomeSection.style.display = 'none';
    historySection.style.display = 'none';
    notebookSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
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
  } else if (panel === 'history') {
    if (searchSection) searchSection.style.display = '';
    notebookSection.style.display = 'none';
    if (toffleSection) toffleSection.style.display = 'none';
    if (greSection) greSection.style.display = 'none';
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
  notebook = [];
  saveNotebook();
  updateNotebookDisplay();
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
      <span class="notebook-item-grip" draggable="true" aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z"/></svg>
      </span>
      <svg class="notebook-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span class="notebook-item-word" data-word="${(word || '').replace(/"/g, '&quot;')}">${word}</span>
      <button class="notebook-item-delete" type="button" onclick="event.stopPropagation(); removeFromNotebook('${word.replace(/'/g, "\\'")}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </li>
  `).join('');
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

  // Touch support for mobile (no native DnD on touch): long-press on grip then drag to reorder
  let touchStartIndex = null;
  let touchStartY = 0;
  let touchMovedEnough = false;
  notebookList.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    touchStartIndex = parseInt(item.dataset.index, 10);
    touchStartY = e.touches[0].clientY;
    touchMovedEnough = false;
  }, { passive: true });
  notebookList.addEventListener('touchmove', (e) => {
    if (touchStartIndex == null) return;
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dy > 25) touchMovedEnough = true;
  }, { passive: true });
  notebookList.addEventListener('touchend', (e) => {
    const fromIndex = touchStartIndex;
    const moved = touchMovedEnough;
    touchStartIndex = null;
    touchMovedEnough = false;
    if (fromIndex == null || !moved) return;
    const item = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY)?.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    const toIndex = parseInt(item.dataset.index, 10);
    if (fromIndex === toIndex) return;
    const [word] = notebook.splice(fromIndex, 1);
    notebook.splice(toIndex, 0, word);
    saveNotebook();
    updateNotebookDisplay();
  }, { passive: true });
}

function setupNotebookItemClick() {
  if (!notebookList) return;
  notebookList.addEventListener('click', (e) => {
    if (Date.now() - notebookDragEndTime < 400) return; // ignore click right after drag
    const item = e.target.closest('.notebook-item');
    if (!item || item.classList.contains('notebook-empty')) return;
    if (e.target.closest('.notebook-item-grip') || e.target.closest('.notebook-item-delete')) return;
    const wordEl = item.querySelector('.notebook-item-word');
    const word = wordEl?.dataset?.word ? wordEl.dataset.word.replace(/&quot;/g, '"') : (wordEl?.textContent || '').trim();
    if (word) searchWord(word);
  });
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
        <span class="toffle-item-word">${displayWord}</span>
        <button type="button" class="toffle-item-known-btn" title="${known ? 'Mark as unknown' : 'I know this word'}" aria-label="${known ? 'Mark as unknown' : 'I know this word'}">
          ${known ? '✓' : '○'}
        </button>
      </li>
    `;
  }).join('');
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
        <span class="toffle-item-word">${displayWord}</span>
        ${inNotebook ? '<span class="toffle-item-notebook-icon" title="In your notebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg></span>' : ''}
        <button type="button" class="toffle-item-known-btn" title="${known ? 'Mark as unknown' : 'I know this word'}" aria-label="${known ? 'Mark as unknown' : 'I know this word'}">
          ${known ? '✓' : '○'}
        </button>
      </li>
    `;
  }).join('');
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
  if (e.target.closest('.toffle-item-known-btn')) {
    e.preventDefault();
    toggleGreKnown(word);
  } else {
    searchWord(word);
  }
}

// Expose to global scope for inline handlers
window.removeFromHistory = removeFromHistory;
window.removeFromNotebook = removeFromNotebook;
