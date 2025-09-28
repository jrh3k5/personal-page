#!/usr/bin/env python3

import sys
import re

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

def main():
    if len(sys.argv) != 4:
        print("Usage: generate_html_simple.py <presentations.yaml> <template.html> <output.html>")
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

    # Replace placeholder in template
    output_html = template.replace('{{PRESENTATIONS}}', presentations_html)

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