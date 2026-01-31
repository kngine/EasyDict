/**
 * Audio Player Module
 * Handles pronunciation audio playback
 */

class AudioPlayer {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.onStateChange = null;
  }

  /**
   * Play audio from URL
   * @param {string} url - Audio URL to play
   * @returns {Promise<void>}
   */
  async play(url) {
    if (!url) {
      console.warn('No audio URL provided');
      return;
    }

    // Stop any currently playing audio
    this.stop();

    try {
      this.isLoading = true;
      this._notifyStateChange();

      this.audio = new Audio(url);
      
      // Set up event listeners
      this.audio.onloadstart = () => {
        this.isLoading = true;
        this._notifyStateChange();
      };

      this.audio.oncanplay = () => {
        this.isLoading = false;
        this._notifyStateChange();
      };

      this.audio.onplay = () => {
        this.isPlaying = true;
        this._notifyStateChange();
      };

      this.audio.onended = () => {
        this.isPlaying = false;
        this._notifyStateChange();
      };

      this.audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        this.isPlaying = false;
        this.isLoading = false;
        this._notifyStateChange();
      };

      await this.audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.isPlaying = false;
      this.isLoading = false;
      this._notifyStateChange();
    }
  }

  /**
   * Stop current audio playback
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.isPlaying = false;
    this.isLoading = false;
    this._notifyStateChange();
  }

  /**
   * Toggle play/pause
   * @param {string} url - Audio URL
   */
  toggle(url) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(url);
    }
  }

  /**
   * Set state change callback
   * @param {Function} callback - Callback function
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  /**
   * Notify state change
   * @private
   */
  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        isLoading: this.isLoading
      });
    }
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayer();
