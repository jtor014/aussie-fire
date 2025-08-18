#!/bin/bash

# Create a quick snapshot for mid-session context refreshes
echo "Creating quick snapshot..."

cat > QUICK_CONTEXT.md << 'EOF'
# Quick Context Refresh

## Project Location
`/home/jtor014/dev/aussie-fire`

## Main File
`src/AustralianFireCalculator.jsx`

## Current State
EOF

echo "- Last modified: $(date)" >> QUICK_CONTEXT.md
echo "- Git branch: $(git branch --show-current)" >> QUICK_CONTEXT.md
echo "- Uncommitted changes: $(git status -s | wc -l) files" >> QUICK_CONTEXT.md

cat >> QUICK_CONTEXT.md << 'EOF'

## Key Functions
- calculateTax(): Australian tax with HECS
- calculations useMemo: Main FIRE calculations
- Bridge period validation: Lines 334-413
- Chart generation: Lines 458-577

## Current Features Working
✅ Basic FIRE calculation
✅ Die with Zero mode
✅ Preservation age bridge
✅ Salary sacrifice optimization
✅ URL sharing
✅ LocalStorage save/load

## Quick Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
git status          # Check changes
git diff            # See changes
```
EOF

echo "✅ Quick snapshot saved to QUICK_CONTEXT.md"