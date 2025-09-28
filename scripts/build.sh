#!/bin/bash

# Build script for the personal page site
# Processes templates and copies static files to build directory

set -e  # Exit on any error

echo "Building site..."

# Remove existing dist directory and create fresh one
rm -rf ./dist
mkdir -p ./dist

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required for the build process"
    exit 1
fi

# Generate index.html from template and presentations data
echo "Generating index.html from template..."
python3 ./scripts/generate_main_page.py ./src/templates/presentations.yaml ./src/templates/index.html.template ./dist/index.html

# Process blog content if it exists
if [ -d "./src/blog" ] && [ "$(find ./src/blog -name '*.md' | wc -l)" -gt 0 ]; then
    echo "Processing blog content..."
    python3 ./scripts/process_blog.py ./src/templates/blog-post.html.template ./src/templates/blog-index.html.template ./dist/
else
    echo "No blog content found, skipping blog processing..."
fi

# Copy static files (much simpler now!)
echo "Copying static files..."
cp -r ./src/static/* ./dist/

echo "Build completed successfully! Output is in ./dist/"