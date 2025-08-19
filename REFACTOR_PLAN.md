# Refactoring Plan: Strangler-Fig Approach

## WHY: Keep the Value, Fix the Architecture

### ✅ What's Already Great:
- Polished PayCalculator-style UI
- Working share links & localStorage 
- Professional results display & charts
- Complete Australian tax calculations
- Complex bridge period logic working
- 2000+ lines of battle-tested math

### 🚨 What Needs Fixing:
- All logic mixed into one 2000+ line component
- Hard-coded tax brackets, caps, rules
- No tests = hidden bugs waiting
- Can't add couples without major rewrite
- Monte Carlo would block UI thread

## THE PLAN: 4-Week Strangler-Fig Refactor

### Week 1: Extract Logic (Don't Break Anything)
1. **Create folder structure**:
   ```
   src/
     core/           # Pure calculation functions
     data/           # Rules and constants  
     models/         # TypeScript types
     workers/        # Future Monte Carlo
     components/     # Keep existing UI
   ```

2. **Move hard-coded rules to JSON**:
   - Tax brackets → `data/au_rules.json`
   - Concessional caps, Medicare thresholds
   - Preservation age table (not hard-coded 60!)

3. **Extract pure functions**:
   - `core/tax.ts` - `calcIncomeTax(income, rules, opts)`
   - `core/super.ts` - `calcContributions(income, extra, rules)`
   - `core/deterministic.ts` - `projectSingle(inputs, assumptions)`
   - `core/bridge.ts` - bridge-to-preservation logic

4. **Add TypeScript types**:
   - `models/types.ts` with `Partner`, `Household`, `Year`
   - Type all pure functions
   - This will flush hidden bugs immediately

### Week 2: Test & Validate
1. **Add Vitest testing**:
   ```bash
   npm install -D vitest
   ```
   
2. **Test core functions**:
   - `tax.test.ts` - golden cases for $50k, $100k, $200k income
   - `super.test.ts` - contribution limits, preservation age
   - `bridge.test.ts` - early retirement scenarios

3. **Swap component to use core**:
   - Component becomes thin shell calling `/core/*`
   - **Results must be identical** to current

### Week 3: Add Couples Support
1. **Extend UI with household tabs**:
   ```tsx
   const [mode, setMode] = useState<'single' | 'couple'>('single');
   
   {mode === 'single' ? (
     <SinglePersonInputs />
   ) : (
     <CoupleInputs />
   )}
   ```

2. **Per-partner calculations**:
   ```typescript
   // Calculate each partner separately
   const p1Results = projectSingle(partner1, assumptions, rules);
   const p2Results = projectSingle(partner2, assumptions, rules);
   
   // Combine household cashflow
   const household = combinePartners(p1Results, p2Results);
   ```

3. **Keep same chart**:
   - Reuse existing chart component
   - Add Partner A + Partner B stacked lines
   - Same bridge logic but combined liquid assets

### Week 4: Add Monte Carlo
1. **Web worker for performance**:
   ```typescript
   // workers/monteCarlo.worker.ts
   export function runSimulation(
     inputs: Inputs,
     assumptions: Assumptions,
     iterations: number
   ): SimulationResults
   ```

2. **Overlay on existing chart**:
   - Keep deterministic as base line
   - Add percentile bands (10th, 50th, 90th)
   - Same UI, enhanced with risk bands

## Key Principles:

### ✅ DO:
- Keep existing UI completely intact during refactor
- Extract logic to pure, testable functions
- Move rules to config files
- Add types to catch bugs
- Test golden cases before swapping
- Add couples by extending types, not rewriting

### ❌ DON'T:
- Rewrite the UI - it's already great
- Break existing functionality
- Change calculation results during refactor
- Add features before extracting logic
- Skip tests - they'll catch regressions

## Success Metrics:
1. **Phase 1**: Pure functions return identical results to current
2. **Phase 2**: 100% test coverage on core functions
3. **Phase 3**: Couples mode working with same UI patterns
4. **Phase 4**: Monte Carlo without UI blocking

## Risk Mitigation:
- Keep backup component during refactor
- Validate results match at every step
- Users see no difference until couples feature ships
- Can rollback any phase if issues found

This approach preserves all the hard work while making the codebase ready for couples, Monte Carlo, and future features. Smart refactoring beats rewriting every time!