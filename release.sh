#!/bin/bash

# Web1CAD Version Release Script
# © 2025 Oleh Korobkov. All rights reserved.

# Get current date in YYMMDD format
CURRENT_DATE=$(date '+%y%m%d')
NEW_VERSION="0.$CURRENT_DATE"

echo "🚀 Web1CAD Version Release Creator"
echo "=================================="
echo "Current Date: $(date '+%Y-%m-%d')"
echo "New Version: $NEW_VERSION"
echo ""

# Check if we're in the project directory
if [ ! -f "cad.html" ] || [ ! -f "js/cad.js" ]; then
    echo "❌ Error: Please run this script from the Web1CAD project directory"
    exit 1
fi

echo "📋 Creating new release version $NEW_VERSION..."

# Update version in files
echo "📝 Updating version numbers..."

# Update index.html title
if [ -f "index.html" ]; then
    TITLE_DATE=$(date '+%y.%m.%d')
    sed -i "s/Beta Version [0-9][0-9]\.[0-9][0-9]\.[0-9][0-9]/Beta Version $TITLE_DATE/g" index.html
    echo "  ✅ Updated index.html"
fi

# Update cad.js version info
if [ -f "js/cad.js" ]; then
    sed -i "s/Version [0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]/Version $NEW_VERSION/g" js/cad.js
    sed -i "s/version: '[0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]'/version: '$NEW_VERSION'/g" js/cad.js
    sed -i "s/System [0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]/System $NEW_VERSION/g" js/cad.js
    echo "  ✅ Updated js/cad.js"
fi

# Update README.md
if [ -f "README.md" ]; then
    TODAY=$(date '+%B %d, %Y')
    sed -i "s/Version [0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]/Version $NEW_VERSION/g" README.md
    echo "  ✅ Updated README.md"
fi

# Update VERSION.md
if [ -f "VERSION.md" ]; then
    TODAY=$(date '+%B %d, %Y')
    sed -i "s/Current Version: [0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]/Current Version: $NEW_VERSION/g" VERSION.md
    sed -i "s/Release Date:.*$/Release Date:** $TODAY/g" VERSION.md
    echo "  ✅ Updated VERSION.md"
fi

# Update build.sh
if [ -f "build.sh" ]; then
    sed -i "s/VERSION=\"[0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]\"/VERSION=\"$NEW_VERSION\"/g" build.sh
    echo "  ✅ Updated build.sh"
fi

echo ""
echo "✅ Version update complete!"
echo "📦 New version: $NEW_VERSION"
echo ""
echo "🔧 Next steps:"
echo "  1. Review the changes"
echo "  2. Test the application"
echo "  3. Run './build.sh' to create production build"
echo "  4. Commit changes to version control"
echo ""
echo "🏷️  Suggested git commands:"
echo "  git add ."
echo "  git commit -m \"Release version $NEW_VERSION\""
echo "  git tag \"v$NEW_VERSION\""
echo ""
