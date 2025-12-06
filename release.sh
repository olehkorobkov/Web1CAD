#!/bin/bash

# Web1CAD Professional Release Script
# © 2024 Web1CAD Professional - Advanced 2D CAD Technology

VERSION="250512"
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚀 Web1CAD Professional Release Manager"
echo "======================================="
echo "Current Version: $VERSION Beta"
echo "Build Date: $BUILD_DATE"
echo ""

# Check if we're in the project directory
if [ ! -f "cad.html" ] || [ ! -f "js/cad.js" ]; then
    echo "❌ Error: Please run this script from the Web1CAD project directory"
    exit 1
fi

echo "📋 Preparing release for Web1CAD Professional $VERSION Beta..."

# Clean previous builds
if [ -d "build" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf build
fi

if [ -f "web1cad-v$VERSION-production.zip" ]; then
    echo "🗑️ Removing previous package..."
    rm -f "web1cad-v$VERSION-production.zip"
fi

# Run build process
echo "🔨 Running build process..."
bash build.sh

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed! No build directory found."
    exit 1
fi

# Verify core files exist
echo "✅ Verifying build integrity..."
REQUIRED_FILES=(
    "build/index.html"
    "build/cad.html"
    "build/css/style.css"
    "build/js/cad.js"
    "build/js/jspdf.min.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ All required files present"

# Create release notes
cat > RELEASE_NOTES.md << EOF
# Web1CAD Professional $VERSION Beta - Release Notes

## Release Information
- **Version**: $VERSION Beta
- **Release Date**: $BUILD_DATE
- **Build Type**: Production Ready

## New Features
### Advanced PDF Export System
- Professional vector PDF export with area selection
- Multiple paper formats (A4, A3, A2, A1) support
- Portrait and landscape orientation control
- High-quality vector graphics preservation
- Precise area selection with visual feedback

### Enhanced User Interface
- Modern landing page with animated background
- Improved visual design and typography
- Professional color scheme consistency
- Responsive design for all devices

### Technical Improvements
- Updated to version $VERSION Beta
- Enhanced code organization and cleanup
- Improved build system with integrity verification
- Comprehensive documentation updates

## Included Files
- Complete CAD application (cad.html)
- Professional landing page (index.html)
- All required JavaScript modules
- CSS styling and assets
- Documentation and license files

## Installation
1. Extract the web1cad-v$VERSION-production.zip file
2. Upload all files to your web server
3. Access index.html in a web browser
4. Click "Launch Web1CAD" to start the application

## Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- All modern browsers with HTML5 Canvas support

## System Requirements
- Modern web browser
- JavaScript enabled
- Minimum 1024x768 screen resolution
- Internet connection for initial load

---
© 2024 Web1CAD Professional - Advanced 2D CAD Technology
EOF

# Display final status
echo ""
echo "🎉 Release $VERSION Beta ready!"
echo "📦 Package: web1cad-v$VERSION-production.zip"
echo "📋 Release Notes: RELEASE_NOTES.md"
echo "📁 Build Directory: build/"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "📊 Package Contents:"
echo "   - HTML files: $(find build -name "*.html" | wc -l)"
echo "   - JavaScript files: $(find build -name "*.js" | wc -l)"
echo "   - CSS files: $(find build -name "*.css" | wc -l)"
echo "   - Documentation: $(find build -name "*.md" | wc -l)"
echo "   - Total size: $(du -sh build | cut -f1)"
echo ""
echo "✅ Release process complete!"
