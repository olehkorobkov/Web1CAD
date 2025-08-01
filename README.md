# Web1CAD - Professional 2D CAD System

**Version 0.250801** | **Release Date**: August 1, 2025

A powerful browser-based 2D CAD system developed by Oleh Korobkov.

## 🚀 Features

### Core CAD Functionality
- **Drawing Tools**: Line, Circle, Arc, Rectangle, Polygon, Polyline, Ellipse, Spline, Hatch, Point, Text
- **Coordinate System**: Precise coordinate-based object creation
- **Command Interface**: Advanced command system with batch processing
- **Layer Management**: Professional layer system with visibility and locking
- **Selection Tools**: Multi-select, select all, and advanced selection operations

### Advanced Features
- **Coordinate Commands**: Create objects with precise coordinates
  - `line 0,0 100,100` - Create line from point to point
  - `circle 50,50 25` - Create circle at center with radius
  - `arc 0,0 100,100 90` - Create arc with two points and sweep angle
- **Batch Processing**: Execute multiple commands in sequence
- **Focus Management**: Seamless command input with auto-blur
- **Error Handling**: Comprehensive validation and error reporting

### Technical Highlights
- **Optimized Codebase**: 67% reduction in code duplication
- **Regex-based Parsing**: Efficient command validation
- **Unified Architecture**: COMMAND_CONFIGS object for maintainable code
- **Security Features**: Code protection and validation systems

## 🛠️ Installation & Usage

### Quick Start
1. Open `index.html` in a web browser for project information
2. Click "Launch Web1CAD Beta" or open `cad.html` directly
3. Use toolbar buttons for drawing tools
4. Type commands in the command input field
5. Use coordinate format: `tool x,y parameters`

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
Web1CAD ver.0.250801/
├── index.html           # Landing page
├── cad.html            # Main CAD application
├── css/style.css       # Application styling
├── js/
│   ├── cad.js          # Core CAD engine
│   ├── command-system.js # Optimized command processor
│   ├── geometry-utils.js # Geometric calculations
│   ├── shape-renderer.js # Shape rendering engine
│   └── [other modules] # Additional functionality
├── build.sh            # Build script
├── release.sh          # Release packaging
└── build/              # Production build output
```

## 🔧 Development

### Architecture
- **Modular Design**: Separate files for different functionality
- **Event-driven**: Canvas-based interaction system
- **Command Pattern**: Unified command processing
- **Error Handling**: Comprehensive validation throughout

### Code Quality
- **Optimized**: Reduced from 780+ lines to 263 lines in command system
- **Maintainable**: Unified configuration objects
- **Secure**: Protected against common vulnerabilities
- **Tested**: Comprehensive error checking and validation

## 📋 Version Information

**Current Version**: 0.250801 (August 1, 2025)
- Major optimization release
- Coordinate command system
- Advanced arc creation
- Focus management improvements
- Code deduplication and optimization

## 📄 License

© 2025 Oleh Korobkov. All rights reserved.

This software is proprietary and confidential. Unauthorized use, reproduction, or distribution is strictly prohibited.

## 🔗 Links

- **Project**: Web1CAD Professional 2D CAD System
- **Developer**: Oleh Korobkov
- **Release**: Version 0.250801
- **Date**: August 1, 2025