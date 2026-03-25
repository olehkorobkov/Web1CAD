# 🚀 Web1CAD - Professional 2D CAD System

**Version 251207 Beta** | **Release Date**: December 7, 2025

A powerful browser-based 2D CAD system developed by Oleh Korobkov.

## 🚀 Features

### Core CAD Functionality
- **Drawing Tools**: Line, Polyline, Circle, Ellipse, Arc, Rectangle, Polygon, Spline, Hatch, Point, Text
  - Snap-to-grid functionality for precise placement
  - Keyboard shortcuts and toolbar access
  - Real-time preview while drawing
  
- **Vector PDF Export**: Advanced PDF generation with full vector graphics support
  - Area selection tool for exporting specific drawing regions
  - Multiple paper formats: A0, A1, A2, A3, A4, Letter, Legal, Tabloid
  - Portrait and landscape orientation support
  - Quality settings and margin controls
  - True vector graphics preservation (not rasterized)
  - Fixed text rendering with proper font sizing
  
- **Layer Management**: Professional layer system with complete control
  - Create, rename, and delete layers
  - Visibility toggling (show/hide layers)
  - Layer locking to prevent accidental edits
  - Color management per layer
  - Layer organization for complex drawings
  
- **Command Interface**: Powerful command-line system for precise object creation
  - Coordinate-based object creation for extreme precision
  - Examples: `line 0,0 100,100`, `circle 50,50 25`, `arc 0,0 100,0 90`
  - Batch operations and automation
  - Real-time command validation and feedback
  
- **File Operations**: Multiple file format support
  - Save and load projects in `.wcd` format (Web1CAD Document)
  - Export to JSON format for data exchange
  - Import from JSON for data integration
  - Automatic save functionality

### Advanced Features
- **Real-time Precision Tools**
  - Dynamic coordinate display showing exact cursor position
  - Real-time measurements for distances and angles
  - Automatic angle calculations
  - Zoom range: 0.001× to 1000× magnification
  - Grid system with dynamic scaling (4-500 units, adaptive)
  
- **Undo/Redo System**
  - Unlimited undo/redo operations
  - Non-destructive editing workflow
  - Memory-efficient undo history (~5-50 MB for 50 steps)
  
- **Cross-Platform Compatibility**
  - Works seamlessly on Windows, macOS, and Linux
  - No installation required - run directly in browser
  - Responsive design for different screen sizes
  - Basic functionality on mobile devices (iOS, Android)
  
- **Performance Optimization**
  - Viewport culling - only renders visible objects
  - Support for 10,000+ shapes with good performance
  - 60 FPS target rendering frame rate
  - Layer caching for faster redraws
  - Stabilized rendering at extreme zoom levels
  
### Technical Features
- **HTML5 Canvas**: Hardware-accelerated 2D graphics rendering
- **Vector Graphics Engine**: Precise mathematical calculations
- **Cartesian Coordinate System**: Standard technical drawing coordinates
- **Memory Monitoring**: Real-time heap usage tracking (Chrome DevTools compatible)
- **Offline Capable**: Fully functional after initial load (no internet required)
- **File Format Support**: .wcd (Web1CAD), .json, PDF (vector export)

## 🛠️ Installation & Usage

### Quick Start
1. Open `index.html` in a web browser for project information
2. Click "Launch Web1CAD" or open `cad.html` directly
3. Use toolbar buttons for drawing tools
4. Use command input for precise coordinate-based construction
5. Export drawings to PDF using the area selection tool

### Command Examples
```
line 0,0 100,100          # Draw line from (0,0) to (100,100)
circle 50,50 25           # Circle at center (50,50) with radius 25
arc 0,0 100,0 90          # Arc from (0,0) to (100,0) with 90° sweep
rectangle 10,10 50,30     # Rectangle at (10,10) with size 50x30
```

### Building
```bash
./build.sh               # Build production version
./release.sh             # Create release package
```

## 📁 Project Structure

```
Web1CAD ver.251207/
├── index.html                          # Landing page
├── cad.html                           # Main CAD application
├── README.md                          # This file
├── VERSION.md                         # Version history and changelog
├── CHANGELOG.md                       # Detailed change history
├── SYSTEM_REQUIREMENTS.md             # Technical requirements
├── icon.png                           # Application icon
├── css/style.css                      # Application styling
├── js/
│   ├── command-system.js              # Global command processor
│   ├── debug-system.js                # Debug utilities
│   ├── jspdf.min.js                   # PDF export library (jsPDF)
│   ├── render-stabilizer.js           # Render optimization system
│   ├── shape-handler-unified.js       # Shape management
│   ├── shape-renderer.js              # Rendering engine
│   ├── web1cad-optimizations.js       # Performance optimizations
│   └── cad/
│       ├── commands/                  # Command implementations
│       │   ├── copy.js
│       │   ├── hatch.js
│       │   ├── move.js
│       │   ├── rotate.js
│       │   └── scale.js
│       ├── core/                      # Core functionality modules
│       │   ├── auto_save.js           # Automatic save system
│       │   ├── constants.js           # Application constants
│       │   ├── events.js              # Event system
│       │   ├── layers.js              # Layer management
│       │   ├── pdf-export.js          # Vector PDF export
│       │   ├── selection.js           # Object selection system
│       │   ├── shapes.js              # Shape definitions
│       │   ├── state.js               # Application state
│       │   ├── undo.js                # Undo/redo system
│       │   └── utils.js               # Utility functions
│       ├── geometry/                  # Geometric calculations
│       │   ├── hatch.js               # Hatch pattern generation
│       │   ├── operations.js          # Geometric operations
│       │   ├── primitives.js          # Geometric primitives
│       │   └── utils.js               # Geometry utilities
│       ├── rendering/                 # Rendering system
│       │   ├── context.js             # Canvas context management
│       │   ├── performance.js         # Performance monitoring
│       │   ├── renderer.js            # Main rendering engine
│       │   ├── timing.js              # Performance timing
│       │   └── viewport.js            # Viewport management
│       └── ui/                        # User interface
│           ├── command-system.js      # UI command system
│           └── properties-panel.js    # Properties panel UI
├── build.sh                           # Build script
├── release.sh                         # Release packaging
└── build/                             # Production build output
```

## 🔧 Development

### Latest Architecture (v251207 - December 7, 2025)

**Major Code Refactoring & Modularization**
- **Restructured Codebase**: Reorganized into logical module folders for better maintainability
  - `core/`: Core functionality (state management, selection, shapes, layers, PDF export)
  - `commands/`: Command implementations (copy, move, rotate, scale, hatch)
  - `geometry/`: Mathematical operations and geometric calculations
  - `rendering/`: Canvas rendering, viewport management, and performance optimization
  - `ui/`: User interface components and command system
- **Code Consolidation**: Removed ~380 lines of duplicate code
- **Improved Safety**: Added 8+ typeof checks before critical function calls
- **Critical Fixes**: Fixed Ctrl+C/Ctrl+V shortcuts after refactoring
- **Zero Compilation Errors**: Fully tested and verified refactoring

### Architecture Highlights
- **Modular Design**: Clean separation of concerns with dedicated modules for each function
- **Canvas-based**: HTML5 Canvas for high-performance 2D graphics rendering
- **Command Pattern**: Unified command system for user actions and batch operations
- **Layer System**: Advanced layer management with visibility, locking, and color control
- **Vector Graphics**: True vector PDF export with jsPDF library
- **Stabilized Rendering**: RenderStabilizer system for consistent rendering at extreme zoom levels

### Code Quality Standards
- **Modern JavaScript**: ES6+ features, classes, arrow functions, modules
- **Maintainable Structure**: Clear module boundaries and file organization
- **Responsive Design**: Adapts to different screen sizes and browsers
- **Cross-browser Compatible**: Works with all modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance Optimized**: 
  - Viewport culling (only render visible shapes)
  - Layer caching for faster redraws
  - Spatial indexing for efficient object selection
  - RequestAnimationFrame for smooth interactions
  - Memory pooling to reduce garbage collection

### Module Dependencies
- **core/state.js**: Central application state management
- **core/selection.js**: Object selection and editing
- **core/shapes.js**: Shape data structures and properties
- **rendering/renderer.js**: Main canvas rendering pipeline
- **geometry/operations.js**: Mathematical calculations
- **commands/**: Individual command implementations
- **ui/command-system.js**: User input processing

## 📋 Version Information

**Current Version**: 251207 (December 7, 2025)

### Latest Release (v251207) - Architecture Refactoring & Code Reorganization
- **Code Modularization**: Complete restructuring into logical module folders
- **Removed Duplication**: Eliminated ~380 lines of duplicate code
- **Enhanced Safety**: Added defensive programming with typeof checks
- **Fixed Shortcuts**: Resolved Ctrl+C and Ctrl+V functionality issues
- **Improved Maintenance**: Better separation of concerns and code organization

### Previous Release (v250512) - PDF Export & UI Improvements
- **PDF Text Fix**: Corrected text rendering sizes in exported PDFs
- **Font Calculation**: Fixed mm-to-points conversion for accurate text sizing
- **UI Icons**: Updated toolbar icons for better clarity

### Documentation
For detailed version history and changelog information, see:
- **[VERSION.md](VERSION.md)** - Complete version history with release notes
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed changelog of all updates
- **[SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md)** - Technical system requirements

## 💻 System Requirements

### **Browser Requirements (Primary Platform)**

#### **Minimum Browser Versions**
- **Chrome/Chromium**: Version 80+ (2020)
- **Firefox**: Version 75+ (2020)
- **Safari**: Version 13+ (macOS 10.15+)
- **Edge**: Version 80+ (Chromium-based)

#### **Required Browser Features**
- **HTML5 Canvas**: 2D rendering context support
- **ES6+ JavaScript**: Modern JavaScript features (classes, arrow functions, modules)
- **File API**: Local file reading/writing capabilities
- **Canvas 2D Context**: Advanced drawing operations
- **Performance API**: Memory monitoring (optional but recommended)

### **Hardware Requirements**

#### **Minimum System Specifications**
- **CPU**: Dual-core processor, 1.8 GHz+
- **RAM**: 4 GB system memory
- **Available RAM for Browser**: 2 GB minimum
- **Graphics**: Integrated graphics with Canvas 2D support
- **Storage**: 50 MB free disk space (for cached files)
- **Display**: 1024×768 resolution

#### **Recommended System Specifications**
- **CPU**: Quad-core processor, 2.4 GHz+
- **RAM**: 8 GB+ system memory
- **Available RAM for Browser**: 4 GB+ allocated to browser
- **Graphics**: Dedicated GPU recommended for large drawings
- **Storage**: 500 MB+ free disk space
- **Display**: 1920×1080+ resolution (Full HD or higher)

### **Memory Requirements**

#### **JavaScript Heap Memory**
- **Minimum**: 256 MB available heap
- **Recommended**: 512 MB+ available heap
- **Large Projects**: 1 GB+ heap for complex drawings

#### **Browser Memory Allocation**
- **Base Application**: ~50-100 MB
- **Per 1000 Shapes**: ~10-20 MB additional
- **PDF Export**: ~50-200 MB temporary (depends on area size)
- **Undo System**: ~5-50 MB (50 undo steps × average complexity)

### **Performance Specifications**

#### **Canvas Performance**
- **Maximum Canvas Size**: 32,767 × 32,767 pixels (browser limitation)
- **Optimal Canvas Size**: 2048 × 2048 pixels for smooth performance
- **Shape Limits**: 10,000+ shapes with good performance
- **Rendering**: 60 FPS target with viewport culling

#### **Memory Monitoring**
- Real-time heap usage tracking (Chrome DevTools compatible)
- Automatic garbage collection optimization
- Object pooling for frequently created/destroyed objects
- Memory leak prevention systems

### **Technical Implementation Details**

#### **Graphics Engine**
- **Rendering**: HTML5 Canvas 2D Context
- **Coordinate System**: Cartesian coordinates with zoom/pan
- **Precision**: Floating-point coordinates with sub-pixel accuracy
- **Grid System**: Dynamic grid scaling (4-500 units, adaptive)
- **Zoom Range**: 0.001× to 1000× magnification

#### **Performance Optimizations**
- **Viewport Culling**: Only render visible shapes
- **Layer Caching**: Cache layer contents for faster redraw
- **Spatial Indexing**: Efficient shape selection and collision detection
- **RequestAnimationFrame**: Smooth animation and interaction
- **Memory Pooling**: Reuse objects to reduce garbage collection

#### **File Format Support**
- **Native Format**: .wcd (Web1CAD Document)
- **Export Formats**: PDF (vector), JSON
- **Import Formats**: .wcd, .json
- **PDF Export**: jsPDF library, true vector graphics

### **Network Requirements**
- **Initial Load**: Internet connection for first-time access
- **Operation**: Fully offline capable after initial load
- **File Size**: ~2-5 MB total application size
- **No Server Required**: Purely client-side application

### **Operating System Compatibility**

#### **Desktop Platforms**
- **Windows**: Windows 10/11 (Chrome, Firefox, Edge)
- **macOS**: macOS 10.15+ (Safari, Chrome, Firefox)
- **Linux**: Ubuntu 18.04+, other modern distributions (Chrome, Firefox)

#### **Mobile Platforms (Limited Support)**
- **iOS**: Safari on iOS 13+ (basic functionality)
- **Android**: Chrome on Android 8+ (basic functionality)
- **Note**: Touch interface limitations for precision CAD work

### **Development/Power User Requirements**
- **Browser DevTools**: Chrome DevTools recommended for debugging
- **Console Access**: For advanced command usage and troubleshooting
- **Local File System**: For save/load functionality (or server setup)

### **Recommended Development Environment**
- **Browser**: Chrome/Chromium with DevTools
- **Extensions**: Ad blockers may interfere (disable if issues occur)
- **Security**: Local file access permissions required
- **Performance**: Hardware acceleration enabled in browser

## 📄 License

© 2025 Oleh Korobkov. All rights reserved.

This software is proprietary and confidential. Unauthorized use, reproduction, or distribution is strictly prohibited.

For commercial use inquiries, please contact the developer.

## 🔗 Project Information

- **Project Name**: Web1CAD - Advanced 2D CAD System
- **Developer**: Oleh Korobkov
- **Current Version**: 251207 (December 7, 2025)
- **Status**: Beta
- **Type**: Browser-based CAD Application
- **License**: Proprietary
- **Platform**: Web (HTML5 Canvas)
- **Cost**: Free

## 📚 Additional Resources

- **[Version History](VERSION.md)** - Detailed version information and release notes
- **[Changelog](CHANGELOG.md)** - Complete list of all changes and improvements
- **[System Requirements](SYSTEM_REQUIREMENTS.md)** - Technical requirements and specifications
- **[Landing Page](index.html)** - Project information and features overview
- **[Application](cad.html)** - Launch the Web1CAD application

## 🤝 Support & Feedback

For questions, issues, or feedback about Web1CAD, please refer to the documentation files or contact the developer.