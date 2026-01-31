# EasyDict PWA

A Progressive Web App version of EasyDict - an English-Chinese Dictionary with word analysis, etymology breakdown, and usage scenarios.

## Features

- **Word Lookup**: Search English words and phrases
- **Bilingual Results**: English definitions + Chinese translations
- **Pronunciation**: Audio playback (prefers US English)
- **Word Forms Analysis**: Related verb/noun/adjective/adverb forms (~700 word families)
- **Word Root Analysis**: Prefix/root/suffix breakdown with meanings (~350 components)
- **Usage Scenarios**: Formality analysis with alternatives (~800 words)
- **Search History**: Last 20 searches saved locally
- **Offline Support**: Works offline after first load (PWA)
- **Mobile Friendly**: Responsive design for all screen sizes

## Getting Started

### Option 1: Using a Local Server

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

## Generating PWA Icons

1. Open `icons/generate-icons.html` in a browser
2. Right-click each canvas and "Save image as..." with the corresponding filename
3. Save icons as: `icon-72x72.png`, `icon-96x96.png`, `icon-128x128.png`, etc.

## APIs Used

- **Dictionary API**: [dictionaryapi.dev](https://dictionaryapi.dev/) - English definitions, phonetics, audio
- **MyMemory Translation**: [mymemory.translated.net](https://mymemory.translated.net/) - Chinese translations

## Project Structure

```
DictLearning/
├── index.html              # Main HTML file
├── styles.css              # All CSS styles
├── app.js                  # Main application logic
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── js/
│   ├── dictionary-service.js    # API calls
│   ├── audio-player.js          # Pronunciation playback
│   ├── word-forms-analyzer.js   # Word family analysis
│   ├── word-root-analyzer.js    # Etymology analysis
│   └── word-usage-analyzer.js   # Formality analysis
└── icons/
    └── generate-icons.html      # Icon generator tool
```

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers (iOS Safari, Chrome for Android)

## Comparison with iOS App

This PWA maintains feature parity with the original iOS/SwiftUI app:

| Feature | iOS App | PWA |
|---------|---------|-----|
| Word Lookup | ✅ | ✅ |
| Chinese Translation | ✅ | ✅ |
| Audio Pronunciation | ✅ | ✅ |
| Word Forms | ✅ | ✅ |
| Word Root Analysis | ✅ | ✅ |
| Usage Scenarios | ✅ | ✅ |
| Search History | ✅ | ✅ |
| Offline Support | ❌ | ✅ |
| No App Store Required | ❌ | ✅ |

## License

MIT License - Feel free to use and modify.
