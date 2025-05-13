import os
import re
import sys

def convert_markdown_bold_in_file(filepath):
    """
    Reads an HTML file, replaces Markdown-style bold with <strong> tags,
    and overwrites the file.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()

        # Regex to find **text** and replace it with <strong>text</strong>
        # It handles cases where ** is at the beginning/end of a line or surrounded by spaces.
        # It's non-greedy (.*?) to handle multiple bolds on one line correctly.
        # We also ensure we are not inside an existing HTML tag attribute or script/style block.
        # A more robust solution for complex HTML might involve an HTML parser,
        # but for this specific case, a careful regex should work for typical content.

        # Simple regex for direct replacement within content:
        new_content, num_replacements = re.subn(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
        # \1 refers to the first captured group (the text between **)

        if num_replacements > 0:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"Processed '{filepath}': {num_replacements} replacements made.")
        else:
            print(f"No changes needed for '{filepath}'.")
        return True
    except FileNotFoundError:
        print(f"Error: File not found at '{filepath}'.")
        return False
    except Exception as e:
        print(f"Error processing file '{filepath}': {e}")
        return False

def process_directory(directory_path):
    """
    Walks through a directory and processes all .html files.
    """
    processed_files_count = 0
    failed_files_count = 0
    for root, _, files in os.walk(directory_path):
        for filename in files:
            if filename.lower().endswith((".html", ".htm")):
                filepath = os.path.join(root, filename)
                if convert_markdown_bold_in_file(filepath):
                    processed_files_count +=1
                else:
                    failed_files_count +=1
    print(f"\n--- Summary ---")
    print(f"Successfully processed files: {processed_files_count}")
    if failed_files_count > 0:
        print(f"Failed to process files: {failed_files_count}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        path_to_process = sys.argv[1]
        if os.path.isdir(path_to_process):
            print(f"Processing all .html files in directory: {path_to_process}")
            process_directory(path_to_process)
        elif os.path.isfile(path_to_process) and path_to_process.lower().endswith((".html", ".htm")):
            print(f"Processing single file: {path_to_process}")
            convert_markdown_bold_in_file(path_to_process)
        else:
            print("Error: The provided path is not a valid directory or .html file.")
            print("Usage: python convert_bold.py <directory_path_or_html_file_path>")
    else:
        print("Please provide the path to the directory containing your HTML files or a single HTML file.")
        print("Usage: python convert_bold.py <directory_path_or_html_file_path>")