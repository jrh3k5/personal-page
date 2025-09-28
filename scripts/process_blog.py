#!/usr/bin/env python3

import os
import re
import sys
import json
from datetime import datetime

def markdown_to_html(content):
    """Convert markdown to HTML using simple regex patterns."""

    # First, temporarily replace code blocks with placeholders to avoid processing them
    code_blocks = []
    code_block_pattern = r'```\n(.*?)\n```'

    def replace_code_block(match):
        code_blocks.append(f'<pre><code>{match.group(1)}</code></pre>')
        return f'CODEBLOCK_{len(code_blocks)-1}_PLACEHOLDER'

    content = re.sub(code_block_pattern, replace_code_block, content, flags=re.DOTALL)

    # Convert headers (# ## ### #### ##### ######)
    content = re.sub(r'^###### (.*?)$', r'<h6>\1</h6>', content, flags=re.MULTILINE)
    content = re.sub(r'^##### (.*?)$', r'<h5>\1</h5>', content, flags=re.MULTILINE)
    content = re.sub(r'^#### (.*?)$', r'<h4>\1</h4>', content, flags=re.MULTILINE)
    content = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
    content = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)

    # Convert links [text](url)
    content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)

    # Convert bold **text**
    content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)

    # Convert italic *text*
    content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)

    # Convert inline code `code`
    content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)

    # Convert bullet points and paragraphs
    lines = content.split('\n')
    html_lines = []
    in_list = False

    for line in lines:
        # Skip lines that are code block placeholders
        if 'CODEBLOCK_' in line and '_PLACEHOLDER' in line:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            html_lines.append(line)  # Will be replaced later
        elif line.strip().startswith('* '):
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            html_lines.append(f'<li>{line.strip()[2:]}</li>')
        else:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if line.strip():
                # Don't wrap headers in <p> tags
                if not (line.strip().startswith('<h') and line.strip().endswith('>')):
                    html_lines.append(f'<p>{line}</p>')
                else:
                    html_lines.append(line)
            else:
                html_lines.append('')

    if in_list:
        html_lines.append('</ul>')

    content = '\n'.join(html_lines)

    # Restore code blocks
    for i, code_block in enumerate(code_blocks):
        content = content.replace(f'CODEBLOCK_{i}_PLACEHOLDER', code_block)

    return content

def extract_metadata(content):
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
            summary = clean_line.strip()[:200] + '...' if len(clean_line) > 200 else clean_line.strip()
            break

    return {
        'title': title or 'Untitled',
        'summary': summary or 'No summary available.'
    }

def process_blog_file(file_path, output_dir, blog_template):
    """Process a single blog markdown file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract metadata
    metadata = extract_metadata(content)

    # Convert to HTML
    html_content = markdown_to_html(content)

    # Generate output path
    rel_path = os.path.relpath(file_path, 'src/blog')
    output_path = os.path.join(output_dir, rel_path.replace('.md', '.html'))

    # Create output directory
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Calculate relative path depth for CSS and navigation
    path_depth = len(rel_path.split('/')) - 1  # -1 because filename doesn't count
    css_path = '../' * (path_depth + 1) + 'styles.css'  # +1 to get out of blog dir
    home_path = '../' * (path_depth + 1) + 'index.html'
    blog_index_path = '../' * path_depth + 'index.html' if path_depth > 0 else 'index.html'

    # Generate HTML from template
    final_html = blog_template.replace('{{TITLE}}', metadata['title'])
    final_html = final_html.replace('{{CONTENT}}', html_content)
    final_html = final_html.replace('{{CSS_PATH}}', css_path)
    final_html = final_html.replace('{{HOME_PATH}}', home_path)
    final_html = final_html.replace('{{BLOG_INDEX_PATH}}', blog_index_path)

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)

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

    return {
        'title': metadata['title'],
        'summary': metadata['summary'],
        'url': rel_path.replace('.md', '.html'),
        'date': date_obj.strftime('%Y-%m-%d'),
        'date_display': date_obj.strftime('%B %d, %Y')
    }

def generate_blog_index(posts, index_template, output_path):
    """Generate the blog index page."""
    # Sort posts by date (newest first)
    posts.sort(key=lambda x: x['date'], reverse=True)

    # Generate posts HTML
    posts_html = []
    for post in posts:
        post_html = f'''
        <article class="blog-post-preview">
            <h2><a href="{post['url']}">{post['title']}</a></h2>
            <p class="blog-date">{post['date_display']}</p>
            <p class="blog-summary">{post['summary']}</p>
        </article>'''
        posts_html.append(post_html)

    # Replace placeholder in template
    final_html = index_template.replace('{{BLOG_POSTS}}', '\n'.join(posts_html))

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)

def main():
    if len(sys.argv) != 4:
        print("Usage: process_blog.py <blog_template.html> <index_template.html> <output_dir>")
        sys.exit(1)

    blog_template_path = sys.argv[1]
    index_template_path = sys.argv[2]
    output_dir = sys.argv[3]

    # Read templates
    try:
        with open(blog_template_path, 'r', encoding='utf-8') as f:
            blog_template = f.read()
        with open(index_template_path, 'r', encoding='utf-8') as f:
            index_template = f.read()
    except FileNotFoundError as e:
        print(f"Template file not found: {e}")
        sys.exit(1)

    # Create output directory
    blog_output_dir = os.path.join(output_dir, 'blog')
    os.makedirs(blog_output_dir, exist_ok=True)

    # Process all markdown files
    posts = []
    for root, dirs, files in os.walk('src/blog'):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                print(f"Processing {file_path}...")
                post_info = process_blog_file(file_path, blog_output_dir, blog_template)
                posts.append(post_info)

    # Generate blog index
    if posts:
        index_output_path = os.path.join(blog_output_dir, 'index.html')
        generate_blog_index(posts, index_template, index_output_path)
        print(f"Generated blog index with {len(posts)} posts")
    else:
        print("No blog posts found")

if __name__ == "__main__":
    main()