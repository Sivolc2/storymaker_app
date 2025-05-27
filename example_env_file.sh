#!/bin/bash
# Example environment file for SystemaWriter with OpenRouter
# Copy this to .env and fill in your actual values

# Database configuration
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app"

# JWT and security
export JWT_SECRET="dev_secret_key_change_in_production"

# Server configuration
export LOG_LEVEL="INFO"
export PORT="8000"
export CORS_ORIGINS="http://localhost:5173"

# OpenRouter configuration for SystemaWriter
export OPENROUTER_API_KEY="your_openrouter_api_key_here"  # https://openrouter.ai/keys
export OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"  # Example: "mistralai/mistral-7b-instruct", "openai/gpt-3.5-turbo"
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
export YOUR_SITE_URL="http://localhost:5173"  # Optional: For OpenRouter HTTP-Referer
export YOUR_APP_NAME="SystemaWriter"  # Optional: For OpenRouter X-Title 