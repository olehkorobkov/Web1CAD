# Web1CAD Professional 2D CAD System

**Version 0.250808** | **Release Date**: August 8, 2025

A powerful browser-based 2D CAD system developed by Oleh Korobkov.

## 🚀 Features

### Core CAD Functionality
- **Drawing Tools**: Line, Polyline, Circle, Ellipse, Arc, Rectangle, Polygon, Spline, Hatch, Point, Text
- **Vector PDF Export**: Advanced area selection with multiple paper formats (A0-A4, Letter, Legal, Tabloid)
- **Layer Management**: Layer system with visibility control, locking, and color management
- **Command Interface**: Command-line system for coordinate-based object creation
- **File Operations**: Save/load projects (.wcd, .json formats) with import/export functionality

### Advanced Features
- **Vector PDF Export**: Export selected areas to PDF with true vector graphics preservation
  - Multiple paper formats: A0, A1, A2, A3, A4, Letter, Legal, Tabloid
  - Portrait and landscape orientation support
  - Quality settings and margin controls
- **Coordinate Commands**: Create objects with precise coordinates
  - `line 0,0 100,100` - Create line from point to point
  - `circle 50,50 25` - Create circle at center with radius
  - `arc 0,0 100,100 90` - Create arc with two points and sweep angle
  - `rectangle 10,10 50,30` - Create rectangle with precise dimensions
- **Real-time Precision**: Dynamic coordinate display, measurements, and calculations
- **Cross-Platform**: Runs in any modern web browser with zero installation

### Technical Highlights
- **HTML5 Canvas**: High-performance graphics rendering
- **Vector PDF Export**: True vector graphics with jsPDF library
- **Modular Architecture**: Organized codebase with separate modules
- **Command System**: Regex-based parsing and validation
- **Layer Management**: Advanced layer system with full control
- **Responsive Design**: Works on desktop and mobile devices

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
Web1CAD ver.0.250803/
├── index.html           # Landing page
├── cad.html            # Main CAD application
├── icon.png            # Application icon
├── css/style.css       # Application styling
├── js/
│   ├── cad.js          # Core CAD engine
│   ├── command-system.js # Command processor
│   ├── geometry-utils.js # Geometric calculations
│   ├── shape-renderer.js # Shape rendering engine
│   ├── jspdf.min.js    # PDF export library
│   └── [other modules] # Additional functionality
├── build.sh            # Build script
├── release.sh          # Release packaging
└── build/              # Production build output
```

## 🔧 Development

### Architecture
- **Modular Design**: Separate files for different functionality
- **Canvas-based**: HTML5 Canvas for high-performance graphics
- **Command Pattern**: Unified command processing system
- **Layer System**: Advanced layer management with visibility control
- **Vector Graphics**: True vector PDF export capabilities

### Code Quality
- **Modern JavaScript**: ES6+ features and best practices
- **Maintainable**: Clear structure and documentation
- **Responsive**: Works across different screen sizes
- **Cross-browser**: Compatible with all modern browsers
- **Performance**: Optimized rendering and calculations

## 📋 Version Information

**Current Version**: 0.250808 (August 8, 2025)
- Advanced vector PDF export with area selection
- Multiple paper format support (A0-A4, Letter, Legal, Tabloid)
- Enhanced layer management system
- Improved command interface
- Cross-platform browser compatibility
- Real-time precision tools and measurements

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

## 🔗 Links

- **Project**: Web1CAD Advanced 2D CAD System
- **Developer**: Oleh Korobkov
- **Version**: 0.250808
- **Release Date**: August 4, 2025
- **Features**: Vector PDF Export, Layer Management, Command Interface
