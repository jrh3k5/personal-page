# Personal Page

A simple static website showcasing presentations and providing links to social profiles. The site features presentations on privacy, decentralization, and "hacker tools" for non-technical audiences.

## Project Structure

```
├── src/                           # Source files for the website
│   ├── static/                   # Static assets (copied as-is)
│   │   ├── styles.css            # CSS styling
│   │   └── images/               # Images and icons
│   │       └── *.png             # PNG image files
│   ├── templates/                # Templates and configuration
│   │   ├── index.html.template   # HTML template with placeholders
│   │   ├── blog-post.html.template
│   │   ├── blog-index.html.template
│   │   └── presentations.yaml    # Presentation data in YAML format
│   └── blog/                     # Blog content (Markdown files)
├── scripts/                      # Build and deployment scripts
│   ├── build.sh                 # Main build script (calls Node.js)
│   ├── build.js                 # Node.js build orchestrator
│   ├── process-blog.js          # Blog processing (Markdown to HTML)
│   └── generate-main-page.js    # Main page generation
├── .github/workflows/           # GitHub Actions workflows
├── dist/                        # Built website output
└── README.md                   # This file
```

## Building the Site

### Prerequisites

- Bash shell
- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Build Instructions

```bash
./scripts/build.sh
```

The build process:
1. Installs dependencies automatically if needed (`npm install`)
2. Processes the HTML template (`index.html.template`) with presentation data from `presentations.yaml`
3. Converts Markdown blog posts to HTML with full metadata support
4. Generates blog index pages with thumbnails and social media metadata
5. Creates the final `index.html` and blog pages in the `dist/` directory
6. Copies all static assets (CSS, images) to `dist/`

### Build Output

After building, the `dist/` directory will contain:
- `index.html` - The main website page
- `styles.css` - Styling for the website
- Image files (PNG icons and presentation thumbnails)
- Blog content (if present)

## Development

The site uses a template-based build system for maintainability:

### Adding/Editing Presentations

1. Edit `src/templates/presentations.yaml` to add or modify presentation data
2. Run `./scripts/build.sh` to regenerate the site

### Adding/Editing Blog Posts

1. Create Markdown files in `src/blog/` following the directory structure `YYYY/MM/DD/post-name.md`
2. Write your blog post in Markdown format
3. Run `./scripts/build.sh` to convert Markdown to HTML and update the blog index
4. Blog posts are automatically sorted by date (newest first) on the index page

Blog posts support:
- Headers (# ## ###)
- Links [text](url)
- Bold **text** and italic *text*
- Code blocks ``` and inline `code`
- Bullet point lists

### Modifying the Layout

1. Edit `src/templates/index.html.template` to change the HTML structure
2. Use `{{PRESENTATIONS}}` as a placeholder where presentation content should be inserted
3. Run `./scripts/build.sh` to regenerate the site

### Other Changes

1. Edit CSS in `src/static/styles.css`
2. Add/modify images in `src/static/images/`
3. Edit blog content in `src/blog/`
4. Run `./scripts/build.sh` to update `dist/`
5. Serve the `dist/` directory with any static web server for testing

## Deployment

The site uses GitHub Actions for automated deployment. See `.github/workflows/` for the deployment pipeline configuration.