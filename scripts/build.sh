#!/bin/bash

# Build script for the personal page site
# Uses Node.js to process templates and copy static files

set -e  # Exit on any error

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required for the build process"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the Node.js build script
node ./scripts/build.js