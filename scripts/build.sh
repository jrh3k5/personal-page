#!/bin/bash

# Build script for the personal page site
# This script replicates the build steps from .github/workflows/build.yml

set -e  # Exit on any error

echo "Building site..."

# Create the dist directory
mkdir -p ./dist

# Copy source files to dist
cp ./src/* ./dist

echo "Build completed successfully! Output is in ./dist/"