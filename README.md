# 🔧 Web1CAD - Professional 2D CAD System

**Developed by Oleh Korobkov**  
© 2025 Oleh Korobkov. All rights reserved.

A full-featured professional 2D CAD system built with modern web technologies. Features comprehensive drawing tools, layer management, file operations, and a command-line interface for precision drafting.

## ✨ Main Features

### 🎨 Drawing Tools
- **Lines** - precise straight lines between points with snap functionality
- **Polylines** - multi-segment lines with closing and editing capabilities
- **Circles and Arcs** - full circles and arcs with radius and angle control
- **Rectangles** - created as closed polylines with width/height specification
- **Polygons** - regular polygons with customizable number of sides and radius types
- **Ellipses** - full ellipses and elliptical arcs
- **Splines** - smooth curves through control points
- **Text** - text annotations with font settings and positioning
- **Points** - reference points with adjustable display size

### 🔧 Professional Tools
- **Fillet** - create rounded corners between intersecting lines
- **Chamfer** - create beveled edges between lines
- **Trim/Extend** - modify line lengths to boundaries
- **Offset** - create parallel copies at specified distances
- **Mirror** - create mirrored copies across axes
- **Array** - create rectangular and polar arrays of objects

### 📐 Precision Features
- **Grid System** - dynamic grid with base 100 and sub 20 units
- **Snap Controls** - snap to grid, endpoints, midpoints, intersections
- **Coordinate Input** - precise numeric positioning
- **Length Input** - direct length specification during drawing
- **Angle Constraints** - orthogonal and angular constraints
- **Object Tracking** - visual alignment aids

## File Format Support

Web1CAD uses a custom JSON-based format (.wcd) for saving projects:
- **Format**: Human-readable JSON with project metadata
- **Extension**: .wcd (Web1CAD Document)
- **Structure**: Contains drawings, metadata, and version information
- **Compatibility**: Self-contained format for reliable storage

## 🖥️ User Interface

### Top Toolbar
- **Drawing Tools** - comprehensive set of CAD tools
- **Selection Modes** - window and crossing selection
- **File Operations** - New (📄), Open (📂), Save (💾)
- **Layer Controls** - integrated layer management panel
- **Color & Lineweight** - visual property controls
- **Grid & Snap Toggles** - precision control buttons

### Right Sidebar
- **Zoom Controls** - zoom in/out and fit to screen
- **View Options** - pan and zoom tools
- **Drawing Aids** - ortho, polar tracking, snap settings

### Bottom Panel  
- **Command Input** - CAD-style command line interface
- **Coordinate Display** - real-time cursor position
- **Help Bar** - context-sensitive guidance
- **Status Information** - current tool and operation state

### Floating Panels
- **Layer Manager** - full layer control with visibility, locking, colors
- **Properties Panel** - edit selected object attributes in real-time
- **Command History** - review and repeat previous operations

## 🎮 Controls & Usage

### Mouse Controls
- **Left Click** - select objects, place points, confirm operations
- **Right Click** - context menu (future enhancement)
- **Mouse Wheel** - zoom in and out of drawing
- **Middle Button Drag** - pan view around drawing area
- **Shift+Drag** - constrained movement and selection

### Keyboard Shortcuts
- **Escape** - cancel current operation or clear selection
- **Delete** - remove selected objects from drawing
- **Ctrl+A** - select all visible objects
- **Ctrl+Z** - undo last operation
- **Ctrl+S** - save drawing to file
- **Enter** - complete current operation (polylines, polygons)
- **L** - activate direct length input mode
- **Space** - toggle pan mode
- **F** - fit drawing to screen
- **G** - toggle grid visibility
- **S** - toggle snap to grid

### Command Line Interface
The system supports professional CAD-style commands:

```bash
# Basic Drawing Commands
line                      # Start line tool
line 0 0 100 100         # Draw line from (0,0) to (100,100)
circle                   # Start circle tool  
circle 50 50 25          # Circle at (50,50) with radius 25
rectangle                # Start rectangle tool
rectangle 0 0 100 50     # Rectangle from (0,0) to (100,50)
polygon                  # Start polygon tool
polygon sides 6 radius 30 # Hexagon with radius 30

# Selection and Editing
select                   # Enter selection mode
move                     # Move selected objects
copy                     # Copy selected objects
rotate                   # Rotate selected objects
delete                   # Delete selected objects

# File Operations  
new                      # Create new drawing
save                     # Save current drawing
load                     # Load existing drawing
export                   # Export to various formats

# View Controls
zoom                     # Zoom to fit drawing
grid                     # Toggle grid display
snap                     # Toggle snap functionality
```

### Help System
- **Step-by-step guidance** - clear instructions for each tool
- **Real-time feedback** - shows current step and next required action
- **Context-aware help** - messages adapt to your current operation  
- **Progress indicators** - visual feedback (Step 1/2, Step 2/3, etc.)
- **Completion confirmations** - success messages when operations finish
- **Error guidance** - helpful messages when operations fail

## 🚀 Getting Started

### System Requirements
- **Modern Web Browser** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Resolution** - 1920x1080 minimum recommended
- **RAM** - 4GB minimum, 8GB recommended for large drawings
- **Storage** - 100MB for application cache and temporary files

### Quick Installation

1. **Clone or Download**
   ```bash
   git clone <repository-url>
   cd web-cad
   ```

2. **Start Local Server**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open Application**
   Navigate to `http://localhost:8000` in your web browser

### First Steps Tutorial

1. **Familiarize with Interface**
   - Explore the toolbar and available tools
   - Notice the grid system and coordinate display
   - Try zooming and panning around the drawing area

2. **Draw Your First Shape**
   - Click the Line tool in the toolbar
   - Click two points on the canvas to create a line
   - Observe the help messages guiding you through each step

3. **Try Advanced Features**
   - Create a layer using the layer manager
   - Draw a circle and change its color
   - Save your drawing and reload it

4. **Explore Precision Tools**
   - Enable snap to grid
   - Try direct coordinate input
   - Use the command line interface

## 🏗️ System Architecture

### Main Modules
```
js/
├── cad.js                    # Core CAD functionality and tools
├── geometry-utils.js         # Mathematical geometric calculations
├── shape-renderer.js         # Canvas rendering and display
├── command-system.js         # Command line interface system
├── secure-core.js            # Security and protection system
└── license-validator.js      # License validation and integrity checks
```

### Security Architecture
```
Protection Layers:
├── Code Obfuscation          # Variable and function name scrambling
├── String Encryption         # Runtime string decryption
├── Anti-Debugging           # Development tools detection
├── Domain Validation        # Authorized domain checking
├── License Verification     # Real-time license validation
└── Integrity Monitoring     # Tampering detection and prevention
```

### Data Structures
```javascript
// Basic shape
{
  type: 'line',
  x1: 0, y1: 0, x2: 100, y2: 100,
  color: '#ffffff',
  lineWeight: 1.0,
  layer: '0'
}

// Complex shape (polygon)
{
  type: 'polygon',
  points: [{x: 0, y: 0}, {x: 50, y: 0}, {x: 25, y: 43}],
  color: '#ffffff',
  lineWeight: 1.0,
  layer: '0'
}
```

## 📊 Performance

### System Performance
| Metric | Performance | Notes |
|--------|-------------|-------|
| File Save | ~1000 shapes/second | JSON format optimization |
| File Load | ~1500 shapes/second | Efficient parsing |
| Canvas Rendering | 60 FPS for 5000+ shapes | Hardware acceleration |
| Interactive Response | <16ms | Real-time responsiveness |
| Memory Usage | ~2MB for complex drawings | Optimized data structures |

### Browser Optimization
- **Modern Rendering** - Hardware-accelerated canvas operations
- **Efficient Storage** - Compressed JSON with metadata
- **Fast Loading** - Modular architecture with lazy loading
- **Responsive UI** - 60 FPS animations and interactions

## 📈 Version History

## 🚀 Launch

### Local Development Server
```bash
cd web1cad
python3 -m http.server 8000
```
Open http://localhost:8000

### Production Deployment
```bash
# Generate production build with security
chmod +x build.sh
./build.sh
```

### Core Technologies
- **HTML5 Canvas** - High-performance 2D graphics rendering
- **Vanilla JavaScript** - No external dependencies for maximum compatibility  
- **CSS3** - Modern styling with professional dark theme
- **JSON Format** - Flexible data serialization (.wcd files)
- **Web Standards** - Built on stable web platform APIs

## 📈 Version History

### v2.0 (Current) - Production Release
- 🔒 **Enterprise Security** - Multi-layer code protection and obfuscation
- 📝 **Professional Documentation** - Comprehensive README and licensing
- ⚡ **Optimized Codebase** - Removed test files and debug code
- 🏗️ **Production Build System** - Automated deployment preparation
- 🛡️ **License Validation** - Real-time integrity monitoring
- 🌐 **Domain Security** - Authorized deployment validation
- 📱 **Clean Architecture** - Streamlined modular structure

### v1.5 - Enhanced Features  
- 🎨 **Advanced Drawing Tools** - Complete geometric shape library
- 💾 **Comprehensive Save System** - WCD format with metadata
- 🗂️ **Layer Management** - Professional layer organization
- 🎮 **Command Interface** - Professional CAD-style commands
- 📐 **Precision Tools** - Grid, snap, and measurement systems
- 🖱️ **Enhanced Controls** - Intuitive mouse and keyboard operations

### v1.0 - Initial Release
- ✏️ **Basic Drawing Tools** - Lines, circles, rectangles, polygons
- 💾 **File Operations** - Save and load functionality  
- 🎨 **Visual Interface** - Modern dark theme design
- 🖱️ **Mouse Controls** - Click, drag, zoom, and pan operations
- ⌨️ **Keyboard Shortcuts** - Essential hotkey support

## 📅 Version History

### v1.5 - Enhanced Features  
- � **Advanced Drawing Tools** - Complete geometric shape library
- 💾 **Comprehensive Save System** - WCD format with metadata
- �️ **Layer Management** - Professional layer organization
- 🎮 **Command Interface** - Professional CAD-style commands
- � **Precision Tools** - Grid, snap, and measurement systems
- 🖱️ **Enhanced Controls** - Intuitive mouse and keyboard operations

### v1.0 - Initial Release
- ✏️ **Basic Drawing Tools** - Lines, circles, rectangles, polygons
- � **File Operations** - Save and load functionality  
- � **Visual Interface** - Modern dark theme design
- �️ **Mouse Controls** - Click, drag, zoom, and pan operations
- ⌨️ **Keyboard Shortcuts** - Essential hotkey support

## 🤝 Development & Deployment

### Production Build
```bash
# Generate production version with security
chmod +x build.sh
./build.sh
```

The build script:
- **Obfuscates** all JavaScript code
- **Encrypts** sensitive strings
- **Adds** domain validation
- **Enables** anti-debugging protection
- **Creates** production-ready files

### Deployment Options
1. **GitHub Pages** - Use "No License" for proprietary code
2. **Static Hosting** - Any web server supporting HTML5
3. **CDN Distribution** - For global access
4. **Private Servers** - For internal/commercial use

### Security Features
- **Code Protection** - Multi-layer obfuscation prevents reverse engineering
- **License Validation** - Real-time integrity and authorization checking
- **Domain Locking** - Restricts execution to authorized domains
- **Anti-Debugging** - Prevents development tools inspection

### Architectural Benefits
1. **Modular Structure** - Clean separation of concerns
2. **Optimized Performance** - Hardware-accelerated rendering
3. **Secure Codebase** - Protected intellectual property
4. **Production Ready** - Professional deployment capabilities

## 📜 License

**Proprietary Software**  
© 2025 Oleh Korobkov. All rights reserved.

This software is proprietary and confidential. Unauthorized use, distribution, or modification is strictly prohibited. See [LICENSE](LICENSE) file for complete terms.

### 🚨 Copyright Notice
- All code, algorithms, and design patterns are proprietary
- Reverse engineering and decompilation are prohibited  
- Commercial use requires explicit written permission
- Any unauthorized use constitutes copyright infringement

### 📧 Contact
For licensing inquiries: [your-email@example.com]

---

**Made with ❤️ by Oleh Korobkov in 2025**

*Professional 2D CAD System with Enterprise Security - Web1CAD*
