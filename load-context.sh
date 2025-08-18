#!/bin/bash

# Create a context file for Claude
echo "Creating context file for Claude..."

cat > claude-context.md << 'EOF'
# Australian FIRE Calculator - Project Context

## Project Overview
This is a comprehensive Australian FIRE (Financial Independence, Retire Early) calculator built with React.
It handles Australian-specific features like superannuation preservation age, HECS debt, and franking credits.

## Current File Structure
EOF

# Add file structure
echo '```' >> claude-context.md
tree -I 'node_modules|dist|.git' -L 2 >> claude-context.md 2>/dev/null || ls -la >> claude-context.md
echo '```' >> claude-context.md

# Add key source files
cat >> claude-context.md << 'EOF'

## Main Component (Current Implementation)
```javascript
EOF

# Include the main calculator file
cat src/AustralianFireCalculator.jsx >> claude-context.md

echo '```' >> claude-context.md

# Add package.json for dependencies
cat >> claude-context.md << 'EOF'

## Dependencies (package.json)
```json
EOF

cat package.json >> claude-context.md

echo '```' >> claude-context.md

# Add current git status
cat >> claude-context.md << 'EOF'

## Current Git Status
```
EOF

git status >> claude-context.md
echo '```' >> claude-context.md

# Add recent commits
cat >> claude-context.md << 'EOF'

## Recent Git History
```
EOF

git log --oneline -10 >> claude-context.md
echo '```' >> claude-context.md

# Add any test results if they exist
if [ -f "test-results.md" ]; then
    cat >> claude-context.md << 'EOF'

## Latest Test Results
EOF
    cat test-results.md >> claude-context.md
fi

# Add TODO list if exists
if [ -f "TODO.md" ]; then
    cat >> claude-context.md << 'EOF'

## Current TODO List
EOF
    cat TODO.md >> claude-context.md
fi

# Add a summary of what Claude should know
cat >> claude-context.md << 'EOF'

## Key Features Implemented
- ✅ Australian tax calculations (2025-26)
- ✅ Superannuation with 12% guarantee rate
- ✅ Preservation age (60) bridge validation
- ✅ HECS/HELP debt repayment
- ✅ Die with Zero mode
- ✅ Advanced super strategy (salary sacrifice, insurance)
- ✅ URL sharing with all parameters
- ✅ LocalStorage save/load
- ✅ Market assumptions panel (collapsed by default)
- ✅ Mobile responsive design

## Known Issues to Address
- Results section could be cleaner
- Monte Carlo simulation not yet implemented
- No couples mode yet
- No property integration

## Tech Stack
- React with Vite
- Recharts for visualizations
- No backend (all client-side)
- Deployed to: [not yet deployed]

## How to Run
```bash
npm install
npm run dev
```

## Next Session Priority
1. Fix any calculation bugs found in testing
2. Clean up results display
3. Consider adding Monte Carlo simulation
4. Deploy to GitHub Pages or Vercel
5. Get feedback from r/fiaustralia

## Working Directory
/home/jtor014/dev/aussie-fire

EOF

echo "✅ Context file created: claude-context.md"
echo "📋 File size: $(wc -c < claude-context.md) bytes"
echo ""
echo "To use in next Claude session, just paste this prompt:"
echo "---"
echo "I'm continuing work on an Australian FIRE calculator. Here's the full context:"
echo "[Then paste contents of claude-context.md]"
echo "---"