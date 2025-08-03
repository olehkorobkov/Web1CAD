# Web1CAD - Advanced 2D CAD System

**Version 0.250803** | **Release Date**: August 3, 2025

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

**Current Version**: 0.250803 (August 3, 2025)
- Advanced vector PDF export with area selection
- Multiple paper format support (A0-A4, Letter, Legal, Tabloid)
- Enhanced layer management system
- Improved command interface
- Cross-platform browser compatibility
- Real-time precision tools and measurements

## 📄 License

© 2025 Oleh Korobkov. All rights reserved.

This software is proprietary and confidential. Unauthorized use, reproduction, or distribution is strictly prohibited.

## 🔗 Links

- **Project**: Web1CAD Advanced 2D CAD System
- **Developer**: Oleh Korobkov
- **Version**: 0.250803
- **Release Date**: August 3, 2025
- **Features**: Vector PDF Export, Layer Management, Command Interface