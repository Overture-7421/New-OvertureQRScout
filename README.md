# Overture RebuiltQR - FRC Scouting App

A Progressive Web App (PWA) for FIRST Robotics Competition scouting with QR code data output and offline support.

## Features

✅ **JSON-Driven Configuration** - Loads field definitions from `config.json`  
✅ **Offline Support** - Works without internet using service workers  
✅ **Schedule Management** - Auto-fills data from uploaded schedules  
✅ **QR Code Generation** - Generates scannable QR codes for data transfer  
✅ **Dark Theme** - Optimized for low-light competition environments  
✅ **Reactive & Fast** - Built with React and TypeScript  
✅ **Four-Phase Data Entry** - PREMATCH, AUTONOMOUS, TELEOP, ENDGAME tabs  
✅ **Multiple Field Types** - Text, Number, Dropdown, Switch, Counter  

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Usage

### 1. First Time Setup
- App loads with default schedule from `sample_schedule.txt`
- Select your Scouter ID from the dropdown
- View your assigned matches

### 2. Scouting Workflow
- **PREMATCH Tab**: Verify/enter match info (auto-filled from schedule)
- **AUTONOMOUS Tab**: Record autonomous period actions
- **TELEOP Tab**: Record teleoperated period
- **ENDGAME Tab**: Record end-game and commit data

### 3. Data Output
- Click "COMMIT DATA" to generate QR code
- Scan QR with external scanner app
- Or click "Copy Info" to paste into spreadsheets

### 4. Next Match
- Click "RESET FORM" to clear fields
- Select next match from dropdown
- Form auto-fills with new match data

## Configuration

### Custom Config File (`config.json`)
Located in `/public/config.json`. Defines all form fields.

```json
{
  "PREMATCH": [
    {
      "label": "Field Label",
      "key": "data_key",
      "type": "text|number|dropdown|switch|counter",
      "options": ["Option1", "Option2"]
    }
  ],
  "AUTONOMOUS": [...],
  "TELEOP": [...],
  "ENDGAME": [...]
}
```

**Supported Field Types:**
- `text` - Free text input
- `number` - Numeric input
- `dropdown` - Selection from options array
- `switch` - Boolean toggle (Yes/No)
- `counter` - Increment/decrement buttons

### Schedule File Format (`sample_schedule.txt`)
```
Event: Event Name
ScouterID, Match Number, Position, Team Number
ANA, 1, Blue 1, 1234
LEO, 2, Red 2, 5678
```

**Flexible Parsing:**
- Separators: commas, tabs, or multiple spaces
- Comments: lines starting with `#`
- Case-insensitive positions

## Offline Capabilities

The app uses Service Workers to cache:
- All application code and assets
- Config files (`config.json`, `sample_schedule.txt`)
- User-uploaded schedules and configs

**Once loaded, the app works completely offline!**

## Uploading Custom Files

### Schedule Upload
1. Click 📅 icon in header
2. Select `.txt` schedule file
3. Choose your Scouter ID
4. Matches auto-populate

### Config Upload
1. Click 📁 icon in header
2. Select custom `.json` config file
3. Form rebuilds with new fields

## Data Structure

### QR Code Output Format
Tab-separated values matching config field order:
```
ScouterName\tMatchNum\tPosition\tTeam\tField1\tField2\t...\tFieldN
```

### CSV Headers Output
Comma-separated column headers:
```
Scouter,Match,Position,Team,Field1,Field2,...,FieldN
```

## Technical Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **qrcode.react** - QR code generation
- **Workbox** - Service worker and PWA support

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with PWA support

## Project Structure

```
NewOvertureQR-Scout/
├── public/
│   ├── config.json          # Field definitions
│   ├── sample_schedule.txt  # Default schedule
│   └── manifest.json        # PWA manifest
├── src/
│   ├── components/
│   │   ├── FieldComponents.tsx  # Text, Number, Dropdown, Switch, Counter
│   │   ├── QRModal.tsx          # QR code display modal
│   │   └── *.css
│   ├── utils/
│   │   └── scheduleParser.ts    # Schedule file parser
│   ├── types.ts             # TypeScript interfaces
│   ├── App.tsx              # Main app component
│   └── main.tsx             # App entry point
├── package.json
└── vite.config.ts           # Vite & PWA config
```

## Development Tips

### Modifying Fields
Edit `/public/config.json` and reload the app. No code changes needed!

### Testing Offline
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open in browser
4. Turn off wifi/network
5. App continues to work

### Customizing Theme
Edit CSS custom properties in:
- `src/index.css` - Global styles
- `src/App.css` - Layout and structure
- `src/components/*.css` - Component styles

Purple accent: `#9c27b0`  
Dark background: `#121212`

## License

This project is open source for FRC teams.

## Support

For issues or questions, check the MVP.txt specification document.

---

**Built for FIRST Robotics Competition Teams 🤖**


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
