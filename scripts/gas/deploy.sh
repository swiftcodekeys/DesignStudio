#!/bin/bash
set -e

echo "=== Grandview Fence — Apps Script Deploy ==="
echo ""

# Check clasp is installed
if ! command -v clasp &> /dev/null; then
    echo "Installing @google/clasp..."
    npm install -g @google/clasp
fi

# Check if logged in
if ! clasp login --status 2>/dev/null | grep -q "You are logged in"; then
    echo "Logging into Google (browser will open)..."
    clasp login
fi

cd "$(dirname "$0")"

# Create project if .clasp.json has placeholder
if grep -q "PLACEHOLDER" .clasp.json; then
    echo "Creating Apps Script project..."
    clasp create --type webapp --title "Grandview Fence — Quote Handler"
    echo "Project created. .clasp.json updated with scriptId."
else
    echo "Using existing project from .clasp.json"
fi

echo "Pushing code..."
clasp push --force

echo "Deploying as web app..."
DEPLOY_OUTPUT=$(clasp deploy --description "Grandview quote + contact handler")
echo "$DEPLOY_OUTPUT"

echo ""
echo "=== Done ==="
echo ""
echo "Copy the web app URL above and add it to your .env file:"
echo "GAS_ENDPOINT=https://script.google.com/macros/s/.../exec"
echo ""
echo "Then in Google Apps Script dashboard (script.google.com):"
echo "  1. Open the project"
echo "  2. Go to Project Settings → Script Properties"
echo "  3. Add property: GAS_SHEET_ID = (your Google Sheet ID)"
echo "     (A sheet will be auto-created on first submission if not set)"
