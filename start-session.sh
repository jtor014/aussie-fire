#!/bin/bash

# Generate fresh context
./load-context.sh

# Create a prompt file for Claude
cat > claude-prompt.txt << 'EOF'
I'm continuing work on an Australian FIRE calculator React app. 

The project is at: /home/jtor014/dev/aussie-fire

Key files:
- src/AustralianFireCalculator.jsx (main component, 1600+ lines)
- All logic is client-side, no backend
- Uses Recharts for visualizations
- Has comprehensive Australian tax, super, and HECS calculations

Please load and review the context, then I'll tell you what I want to work on.

Current working directory: /home/jtor014/dev/aussie-fire

Ready to continue development!
EOF

echo "✅ Ready for new session!"
echo ""
echo "1. Copy contents of claude-prompt.txt"
echo "2. Attach or paste claude-context.md"
echo "3. Start working!"
echo ""
echo "📁 Files created:"
echo "   - claude-context.md (full project context)"
echo "   - claude-prompt.txt (session starter)"