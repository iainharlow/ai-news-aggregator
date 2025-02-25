#!/bin/bash
#
# export_context.sh
#
# A utility script to output your project’s context in a format that’s easy to
# paste into an LLM chat window (e.g. ChatGPT, Claude, etc.). This updated version
# respects .gitignore rules if the project is a Git repository and can send output
# directly to the clipboard using the --clipboard flag (for macOS).
#
# Options:
#   -s, --structure            Print the project structure (tree view or file list).
#   -f, --file <filepath>      Print the content of the specified file.
#   -d, --dir <directory>      Print the content of all files in the specified directory (recursively).
#   -l, --list <directory>     List file paths in the specified directory (recursively).
#   -c, --clipboard            Send output directly to the clipboard (uses pbcopy on macOS).
#   -h, --help                 Display this help message.
#
# Example usage:
#   # To print the project structure (following .gitignore rules if applicable) and copy to clipboard:
#   ./export_context.sh --structure --clipboard
#
#   # To output a single file:
#   ./export_context.sh --file client/src/App.jsx --clipboard
#

# --- Helper Functions ---

# Print usage instructions.
print_usage() {
    cat <<EOF
Usage: $0 [options]

Options:
  -s, --structure            Print the project structure (tree view or file list).
  -f, --file <filepath>      Print the content of the specified file.
  -d, --dir <directory>      Print the content of all files in the specified directory (recursively).
  -l, --list <directory>     List file paths in the specified directory (recursively).
  -c, --clipboard            Send output directly to the clipboard (macOS pbcopy).
  -h, --help                 Display this help message.
EOF
}

# Given a filename, return a language annotation based on its extension.
get_language_annotation() {
    local filename="$1"
    case "$filename" in
        *.js|*.jsx)   echo "javascript" ;;
        *.ts|*.tsx)   echo "typescript" ;;
        *.py)         echo "python" ;;
        *.java)       echo "java" ;;
        *.sh)         echo "bash" ;;
        *.md)         echo "markdown" ;;
        *.json)       echo "json" ;;
        *.html)       echo "html" ;;
        *.css)        echo "css" ;;
        *)            echo "" ;;
    esac
}

# Print a single file’s content with clear delimiters.
print_file() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "File not found: $file" >&2
        return
    fi
    local lang
    lang=$(get_language_annotation "$file")
    echo "----- File: ${file} -----"
    if [ -n "$lang" ]; then
        echo '```'"$lang"
    else
        echo '```'
    fi
    cat "$file"
    echo '```'
    echo "----- End of ${file} -----"
    echo ""
}

# Print the contents of all files in a directory (recursively), respecting .gitignore if applicable.
print_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo "Directory not found: $dir" >&2
        return
    fi

    if [ -d .git ]; then
        # Use git to list tracked and untracked (but non-ignored) files.
        ( git ls-files "$dir" ; git ls-files --others --exclude-standard "$dir" ) | sort -u | while IFS= read -r file; do
            print_file "$file"
        done
    else
        while IFS= read -r file; do
            print_file "$file"
        done < <(find "$dir" -type f | sort)
    fi
}

# List the files (paths) in a directory (recursively), respecting .gitignore if applicable.
list_files() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo "Directory not found: $dir" >&2
        return
    fi

    echo "Files in $dir (respecting .gitignore):"
    if [ -d .git ]; then
        ( git ls-files "$dir" ; git ls-files --others --exclude-standard "$dir" ) | sort -u
    else
        find "$dir" -type f | sort
    fi
    echo ""
}

# Print the project structure. If this is a Git repository, use git to list files (which follows .gitignore).
print_structure() {
    echo "Project Structure (respecting .gitignore if present):"
    if [ -d .git ]; then
        ( git ls-files ; git ls-files --others --exclude-standard ) | sort -u
    else
        if command -v tree >/dev/null 2>&1; then
            tree -a
        else
            find . -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'
        fi
    fi
    echo ""
}

# --- Main Script ---

# Initialize variables for options.
structureFlag=0
clipboardFlag=0
declare -a files
declare -a dirs
declare -a lists

# If no arguments, show help.
if [ "$#" -eq 0 ]; then
    print_usage
    exit 0
fi

# Parse arguments.
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -s|--structure)
            structureFlag=1
            ;;
        -f|--file)
            if [ -n "$2" ]; then
                files+=("$2")
                shift
            else
                echo "Error: --file requires a filepath argument." >&2
                exit 1
            fi
            ;;
        -d|--dir)
            if [ -n "$2" ]; then
                dirs+=("$2")
                shift
            else
                echo "Error: --dir requires a directory argument." >&2
                exit 1
            fi
            ;;
        -l|--list)
            if [ -n "$2" ]; then
                lists+=("$2")
                shift
            else
                echo "Error: --list requires a directory argument." >&2
                exit 1
            fi
            ;;
        -c|--clipboard)
            clipboardFlag=1
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
    shift
done

# If clipboard flag is set, redirect stdout to pbcopy.
if [ "$clipboardFlag" -eq 1 ]; then
    if command -v pbcopy >/dev/null 2>&1; then
        exec > >(pbcopy)
    else
        echo "Error: pbcopy not found. Clipboard functionality is available only on macOS." >&2
        exit 1
    fi
fi

# Execute the requested options.
if [ "$structureFlag" -eq 1 ]; then
    print_structure
fi

for f in "${files[@]}"; do
    print_file "$f"
done

for d in "${dirs[@]}"; do
    print_dir "$d"
done

for l in "${lists[@]}"; do
    list_files "$l"
done

# If clipboard is used, you can optionally print a confirmation to stderr.
if [ "$clipboardFlag" -eq 1 ]; then
    echo "Output has been copied to the clipboard." >&2
fi