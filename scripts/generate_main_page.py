#!/usr/bin/env python3

import sys
import os
import re
from datetime import datetime

def parse_simple_yaml(content):
    """Parse a simple YAML structure for presentations."""
    presentations = []
    current_presentation = {}

    lines = content.strip().split('\n')

    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        if line.startswith('- title:'):
            if current_presentation:
                presentations.append(current_presentation)
            current_presentation = {}
            current_presentation['title'] = line.split('title:', 1)[1].strip().strip('"')
        elif line.startswith('thumbnail:'):
            current_presentation['thumbnail'] = line.split('thumbnail:', 1)[1].strip().strip('"')
        elif line.startswith('thumbnail_alt:'):
            current_presentation['thumbnail_alt'] = line.split('thumbnail_alt:', 1)[1].strip().strip('"')
        elif line.startswith('summary:'):
            current_presentation['summary'] = line.split('summary:', 1)[1].strip().strip('"')
        elif line.startswith('download_url:'):
            current_presentation['download_url'] = line.split('download_url:', 1)[1].strip().strip('"')
        elif line.startswith('download_format:'):
            current_presentation['download_format'] = line.split('download_format:', 1)[1].strip().strip('"')

    if current_presentation:
        presentations.append(current_presentation)

    return presentations

def extract_blog_metadata(content):
    """Extract title and other metadata from markdown content."""
    lines = content.split('\n')
    title = None
    summary = None

    # Extract title from first H1
    for line in lines:
        if line.startswith('# '):
            title = line[2:].strip()
            break

    # Extract summary from first paragraph
    for line in lines:
        if line.strip() and not line.startswith('#'):
            # Clean up markdown formatting for summary
            clean_line = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_line)
            clean_line = re.sub(r'\*(.*?)\*', r'\1', clean_line)
            summary = clean_line.strip()[:150] + '...' if len(clean_line) > 150 else clean_line.strip()
            break

    return {
        'title': title or 'Untitled',
        'summary': summary or 'No summary available.'
    }

def get_recent_blog_posts(limit=5):
    """Get the most recent blog posts."""
    posts = []

    if not os.path.exists('src/blog'):
        return posts

    for root, dirs, files in os.walk('src/blog'):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, 'src/blog')

                # Extract date from path (YYYY/MM/DD format)
                path_parts = rel_path.split('/')
                if len(path_parts) >= 3:
                    try:
                        year, month, day = path_parts[0], path_parts[1], path_parts[2]
                        date_str = f"{year}-{month}-{day}"
                        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    except:
                        date_obj = datetime.now()
                else:
                    date_obj = datetime.now()

                # Read file content to extract metadata
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    metadata = extract_blog_metadata(content)

                    posts.append({
                        'title': metadata['title'],
                        'summary': metadata['summary'],
                        'url': f"blog/{rel_path.replace('.md', '.html')}",
                        'date': date_obj.strftime('%Y-%m-%d'),
                        'date_display': date_obj.strftime('%B %d, %Y'),
                        'date_obj': date_obj
                    })
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    # Sort by date (newest first) and limit
    posts.sort(key=lambda x: x['date_obj'], reverse=True)
    return posts[:limit]

def generate_presentation_html(presentations):
    """Generate HTML for presentations."""
    html_parts = []

    for presentation in presentations:
        html = f'''      <div class="presentation">
        <div class="thumbnail">
          <img src="{presentation['thumbnail']}" alt="{presentation['thumbnail_alt']}" />
        </div>
        <div class="description">
          <h1>{presentation['title']}</h1>
          <div class="summary">
            {presentation['summary']}
          </div>
          <div class="download-link">
            <a href="{presentation['download_url']}">Download</a> ({presentation['download_format']})
          </div>
        </div>
      </div>'''
        html_parts.append(html)

    return '\n'.join(html_parts)

def generate_recent_blogs_html(posts):
    """Generate HTML for recent blog posts."""
    if not posts:
        return '<p class="no-blogs">No blog posts yet.</p>'

    html_parts = []
    for post in posts:
        html = f'''      <div class="recent-blog-post">
        <h3><a href="{post['url']}">{post['title']}</a></h3>
        <p class="blog-date">{post['date_display']}</p>
        <p class="blog-summary">{post['summary']}</p>
      </div>'''
        html_parts.append(html)

    return '\n'.join(html_parts)

def main():
    if len(sys.argv) != 4:
        print("Usage: generate_main_page.py <presentations.yaml> <template.html> <output.html>")
        sys.exit(1)

    yaml_file = sys.argv[1]
    template_file = sys.argv[2]
    output_file = sys.argv[3]

    # Read YAML data
    try:
        with open(yaml_file, 'r') as f:
            yaml_content = f.read()
    except FileNotFoundError:
        print(f"Error: YAML file '{yaml_file}' not found")
        sys.exit(1)

    # Read template
    try:
        with open(template_file, 'r') as f:
            template = f.read()
    except FileNotFoundError:
        print(f"Error: Template file '{template_file}' not found")
        sys.exit(1)

    # Parse YAML and generate presentations HTML
    presentations = parse_simple_yaml(yaml_content)
    presentations_html = generate_presentation_html(presentations)

    # Get recent blog posts and generate HTML
    recent_posts = get_recent_blog_posts(5)
    recent_blogs_html = generate_recent_blogs_html(recent_posts)

    # Replace placeholders in template
    output_html = template.replace('{{PRESENTATIONS}}', presentations_html)
    output_html = output_html.replace('{{RECENT_BLOGS}}', recent_blogs_html)

    # Write output
    try:
        with open(output_file, 'w') as f:
            f.write(output_html)
        print(f"Generated {output_file} successfully")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()