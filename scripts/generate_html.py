#!/usr/bin/env python3

import yaml
import sys
import os

def generate_presentation_html(presentations):
    """Generate HTML for presentations from YAML data."""
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
        print("Usage: generate_html.py <presentations.yaml> <template.html> <output.html>")
        sys.exit(1)

    yaml_file = sys.argv[1]
    template_file = sys.argv[2]
    output_file = sys.argv[3]

    # Read YAML data
    try:
        with open(yaml_file, 'r') as f:
            data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: YAML file '{yaml_file}' not found")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML: {e}")
        sys.exit(1)

    # Read template
    try:
        with open(template_file, 'r') as f:
            template = f.read()
    except FileNotFoundError:
        print(f"Error: Template file '{template_file}' not found")
        sys.exit(1)

    # Generate presentations HTML
    presentations_html = generate_presentation_html(data['presentations'])

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