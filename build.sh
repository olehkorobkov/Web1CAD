#!/bin/bash

# Build script for Web1CAD Professional - Version 250512 Beta
# © 2024 Web1CAD Professional - Advanced 2D CAD Technology

VERSION="250512"
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "🔧 Building Web1CAD Professional Version $VERSION Beta..."
echo "📅 Build Date: $BUILD_DATE"

# Create build directory
mkdir -p build
mkdir -p build/js
mkdir -p build/css

echo "📁 Copying files..."

# Copy HTML files
cp index.html build/
cp cad.html build/

# Copy CSS
cp css/style.css build/css/

# Copy JavaScript files
cp js/cad.js build/js/
cp js/command-system.js build/js/
cp js/debug-system.js build/js/
cp js/geometry-utils.js build/js/
cp js/jspdf.min.js build/js/
cp js/shape-handler-unified.js build/js/
cp js/shape-renderer.js build/js/
cp js/web1cad-optimizations.js build/js/

# Copy documentation
cp README.md build/
cp LICENSE build/
cp VERSION.md build/
cp CHANGELOG.md build/
cp SYSTEM_REQUIREMENTS.md build/

echo "📊 Creating build info..."

# Create build info file
cat > build/BUILD_INFO.md << EOF
# Web1CAD Professional Build Information

## Version Details
- **Version**: $VERSION Beta
- **Build Date**: $BUILD_DATE
- **Build Type**: Production Ready

## Included Files
### Core Application
- \`index.html\` - Landing page with feature overview
- \`cad.html\` - Main CAD application interface

### Stylesheets
- \`css/style.css\` - Complete styling for CAD interface

### JavaScript Modules
- \`js/cad.js\` - Main CAD application logic with PDF export
- \`js/command-system.js\` - Command processing system
- \`js/debug-system.js\` - Debug and development tools
- \`js/geometry-utils.js\` - Geometric calculation utilities
- \`js/jspdf.min.js\` - PDF generation library
- \`js/shape-handler-unified.js\` - Shape handling and manipulation
- \`js/shape-renderer.js\` - Canvas rendering engine
- \`js/web1cad-optimizations.js\` - Performance optimizations

### Documentation
- \`README.md\` - Project documentation
- \`LICENSE\` - Software license
- \`VERSION.md\` - Version history and changelog
- \`CHANGELOG.md\` - Detailed change log

## Features
- Professional 2D CAD drawing tools
- Vector PDF export with area selection
- Real-time precision measurements
- Advanced geometric utilities
- Cross-platform browser compatibility
- Professional interface design
- HTML5 Canvas rendering
- Zero installation required

## Deployment
This build is ready for deployment to any web server or hosting platform.
All dependencies are included and the application is self-contained.

---
© 2024 Web1CAD Professional - Advanced 2D CAD Technology
EOF

# Create checksums for integrity verification
echo "🔐 Creating integrity checksums..."
find build -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.md" \) -exec md5sum {} \; > build/CHECKSUMS.md

# Format checksums file
cat > temp_checksums << EOF
# File Integrity Checksums - Web1CAD Professional $VERSION Beta

## Purpose
These checksums can be used to verify the integrity of the Web1CAD Professional files.

## Generated
- **Date**: $BUILD_DATE
- **Version**: $VERSION Beta

## Checksums
\`\`\`
EOF

cat build/CHECKSUMS.md >> temp_checksums
echo '```' >> temp_checksums
mv temp_checksums build/CHECKSUMS.md

echo "✅ Build complete! Web1CAD Professional $VERSION Beta files are in 'build' directory."

# Create deployment package if zip is available
if command -v zip &> /dev/null; then
    echo "📦 Creating deployment package..."
    cd build
    zip -r "../web1cad-v$VERSION-production.zip" .
    cd ..
    echo "📦 Package created: web1cad-v$VERSION-production.zip"
    echo "🚀 Ready for deployment!"
else
    echo "🚀 Build directory ready for deployment!"
fi

echo ""
echo "📋 Build Summary:"
echo "   Version: $VERSION Beta"
echo "   Files: $(find build -type f | wc -l) files total"
echo "   Size: $(du -sh build | cut -f1)"
echo "   Ready for web deployment"
