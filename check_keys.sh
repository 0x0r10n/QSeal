#!/usr/bin/env bash
GROQ=$(grep '^GROQ_API_KEY=' /opt/qrouter/backend/.env | cut -d= -f2- | tr -d ' "' | tr -d "'")
OR=$(grep '^OPENROUTER_API_KEY=' /opt/qrouter/backend/.env | cut -d= -f2- | tr -d ' "' | tr -d "'")

echo "Checking Groq..."
curl -s -o /dev/null -w "Groq HTTP Status: %{http_code}\n" -H "Authorization: Bearer $GROQ" https://api.groq.com/openai/v1/models

echo "Checking OpenRouter..."
curl -s -o /dev/null -w "OpenRouter HTTP Status: %{http_code}\n" -H "Authorization: Bearer $OR" https://openrouter.ai/api/v1/models
