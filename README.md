# METS - Mechanism Timing Simulation

A cross-platform desktop application for visualizing mechanism timing sequences.

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run build
```

### Build for specific platforms
```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

## Features
- Import CSV data for timing sequences
- Grid-based visualization
- Animation playback controls
- Export to multiple formats (PNG, PDF, Excel, MP4)
- Cross-platform support (macOS, Windows, Linux)