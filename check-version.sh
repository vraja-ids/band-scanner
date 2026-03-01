#!/bin/bash
echo "=== BUILD CONFIGURATION ==="
echo "App Name: $(grep '"name"' app.json | head -1 | cut -d'"' -f4)"
echo "Version: $(grep '"version"' app.json | head -1 | cut -d'"' -f4)"
echo "iOS Build Number: $(grep '"buildNumber"' app.json | cut -d':' -f2 | cut -d'"' -f2 | tr -d ' ,')"
echo "Bundle ID: $(grep '"bundleIdentifier"' app.json | head -1 | cut -d'"' -f4)"
echo "Owner: $(grep '"owner"' app.json | cut -d'"' -f4)"
echo ""
echo "This build will be submitted as: $(grep '"version"' app.json | head -1 | cut -d'"' -f4) ($(grep '"buildNumber"' app.json | cut -d':' -f2 | cut -d'"' -f2 | tr -d ' ,'))"
