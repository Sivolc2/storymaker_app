#!/bin/bash

# Parse command line arguments
FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-f|--force]"
            echo "  -f, --force    Overwrite existing .env files"
            exit 1
            ;;
    esac
done

echo "Setting up environment files..."

# Check if example_env_file.sh exists
EXAMPLE_ENV_FILE="example_env_file.sh"
if [ ! -f "$EXAMPLE_ENV_FILE" ]; then
    echo "Error: ${EXAMPLE_ENV_FILE} not found in project root."
    echo "Please ensure the example environment file exists."
    exit 1
fi

# Define backend .env directory and file
BACKEND_ENV_DIR="repo_src/backend"
BACKEND_ENV_FILE="${BACKEND_ENV_DIR}/.env"

# Define frontend .env directory and file
FRONTEND_ENV_DIR="repo_src/frontend"
FRONTEND_ENV_FILE="${FRONTEND_ENV_DIR}/.env"

# Create backend .env file
if [ ! -f "$BACKEND_ENV_FILE" ] || [ "$FORCE" = true ]; then
    if [ "$FORCE" = true ] && [ -f "$BACKEND_ENV_FILE" ]; then
        echo "Force flag detected. Overwriting ${BACKEND_ENV_FILE}..."
    else
        echo "Creating ${BACKEND_ENV_FILE} with environment variables from ${EXAMPLE_ENV_FILE}..."
    fi
    
    # Convert export statements to simple variable assignments and copy to backend
    sed 's/^export //' "$EXAMPLE_ENV_FILE" | grep -v '^#!/bin/bash' | grep -v '^#.*Copy this to' > "$BACKEND_ENV_FILE"
    
    echo "${BACKEND_ENV_FILE} created/updated."
else
    echo "${BACKEND_ENV_FILE} already exists. Use -f to overwrite."
fi

# Create frontend .env file
if [ ! -f "$FRONTEND_ENV_FILE" ] || [ "$FORCE" = true ]; then
    if [ "$FORCE" = true ] && [ -f "$FRONTEND_ENV_FILE" ]; then
        echo "Force flag detected. Overwriting ${FRONTEND_ENV_FILE}..."
    else
        echo "Creating ${FRONTEND_ENV_FILE} with environment variables from ${EXAMPLE_ENV_FILE}..."
    fi
    
    # Convert export statements to simple variable assignments and copy to frontend
    sed 's/^export //' "$EXAMPLE_ENV_FILE" | grep -v '^#!/bin/bash' | grep -v '^#.*Copy this to' > "$FRONTEND_ENV_FILE"
    
    echo "${FRONTEND_ENV_FILE} created/updated."
else
    echo "${FRONTEND_ENV_FILE} already exists. Use -f to overwrite."
fi

echo "Environment file setup complete."
echo "Please review the .env files in ${BACKEND_ENV_DIR} and ${FRONTEND_ENV_DIR} and customize if necessary."
echo "Note: Sensitive values like API keys from ${EXAMPLE_ENV_FILE} have been copied - please update them with your actual credentials." 