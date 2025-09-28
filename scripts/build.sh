#!/bin/bash

# Build script for the personal page site
# Processes templates and copies static files to build directory

set -e  # Exit on any error

echo "Building site..."

# Create the dist directory
mkdir -p ./dist

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required for the build process"
    exit 1
fi

# Generate index.html from template and presentations data
echo "Generating index.html from template..."
python3 ./scripts/generate_html_simple.py ./src/presentations.yaml ./src/index.html.template ./dist/index.html

# Copy all other files (excluding template and yaml files)
echo "Copying static files..."
for file in ./src/*; do
    filename=$(basename "$file")
    # Skip template and yaml files
    if [[ "$filename" != "index.html.template" && "$filename" != "presentations.yaml" && "$filename" != "index.html" ]]; then
        if [ -d "$file" ]; then
            cp -r "$file" ./dist/
        else
            cp "$file" ./dist/
        fi
    fi
done

echo "Build completed successfully! Output is in ./dist/"