#!/bin/bash

# Build script for Web1CAD - Production Version
# © 2025 Oleh Korobkov. All rights reserved.

echo "🔧 Building Web1CAD Production Version..."

# Create build directory
mkdir -p build
mkdir -p build/js
mkdir -p build/css

echo "📁 Copying files..."

# Copy HTML and CSS without changes
cp index.html build/
cp css/style.css build/css/

echo "🔒 Securing JavaScript files..."

# Simple obfuscation function (можна замінити на професійні инструменти)
obfuscate_js() {
    local input_file=$1
    local output_file=$2
    
    # Basic obfuscation: remove comments, minimize whitespace, rename variables
    sed '/^[[:space:]]*\/\//d' "$input_file" | \
    sed '/^[[:space:]]*\/\*/,/\*\//d' | \
    tr -d '\n' | \
    sed 's/[[:space:]]\+/ /g' | \
    sed 's/function /func_/g' | \
    sed 's/const /c_/g' | \
    sed 's/let /l_/g' | \
    sed 's/var /v_/g' > "$output_file"
    
    # Add watermark
    echo "/* Obfuscated Web1CAD © 2025 Oleh Korobkov */" > temp_file
    cat "$output_file" >> temp_file
    mv temp_file "$output_file"
}

# Obfuscate all JS files
obfuscate_js "js/secure-core.js" "build/js/secure-core.js"
obfuscate_js "js/geometry-utils.js" "build/js/geometry-utils.js"
obfuscate_js "js/shape-renderer.js" "build/js/shape-renderer.js"
obfuscate_js "js/command-system.js" "build/js/command-system.js"
obfuscate_js "js/cad.js" "build/js/cad.js"

echo "🔐 Adding domain lock..."

# Add domain lock to main file
cat >> build/js/cad.js << 'EOF'

// Domain lock
(function(){
    const allowed=['localhost','127.0.0.1','yourusername.github.io'];
    if(!allowed.includes(location.hostname)){
        document.body.innerHTML='<h1 style="color:red;text-align:center;">UNAUTHORIZED DOMAIN</h1>';
        throw new Error('Domain not authorized');
    }
})();
EOF

echo "📊 Creating integrity checks..."

# Create checksums for all files
find build -name "*.js" -exec md5sum {} \; > build/checksums.txt

echo "✅ Build complete! Production files are in 'build' directory."
echo "🚀 Deploy the 'build' directory to GitHub Pages."

# Optional: Create compressed version
if command -v zip &> /dev/null; then
    echo "📦 Creating deployment package..."
    cd build
    zip -r "../web1cad-production.zip" .
    cd ..
    echo "📦 Package created: web1cad-production.zip"
fi
