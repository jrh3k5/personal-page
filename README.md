# Personal Page

A simple static website showcasing presentations and providing links to social profiles. The site features presentations on privacy, decentralization, and "hacker tools" for non-technical audiences.

## Project Structure

```
├── src/                    # Source files for the website
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styling
│   ├── blog/              # Blog content (Markdown files)
│   └── *.png              # Images and icons
├── scripts/               # Build and deployment scripts
│   └── build.sh          # Main build script
├── .github/workflows/     # GitHub Actions workflows
├── dist/                  # Built website output
└── README.md             # This file
```

## Building the Site

### Prerequisites

- Bash shell
- Basic file system operations (cp, mkdir)

### Build Instructions

1. **Using the build script (recommended):**
   ```bash
   ./scripts/build.sh
   ```

2. **Manual build:**
   ```bash
   mkdir -p ./dist
   cp ./src/* ./dist
   ```

The build process copies all source files from `src/` to the `dist/` directory, which can then be served by any static web server.

### Build Output

After building, the `dist/` directory will contain:
- `index.html` - The main website page
- `styles.css` - Styling for the website
- Image files (PNG icons and presentation thumbnails)
- Blog content (if present)

## Development

The site is a simple static HTML/CSS website. To make changes:

1. Edit files in the `src/` directory
2. Run the build script to update `dist/`
3. Serve the `dist/` directory with any static web server for testing

## Deployment

The site uses GitHub Actions for automated deployment. See `.github/workflows/` for the deployment pipeline configuration.