# Post-Merge Guardrails for PR #19

## Immediate (before T-R2)

### 1. Feature Flag v2
```bash
# Route-based access while v1 stays live
# v1: http://localhost:5173/
# v2: http://localhost:5173/v2
```

### 2. Add Reset & URL Params
```javascript
// apps/dwz-v2/src/App.tsx
const resetToDefaults = () => {
  // Reset all inputs to baseline scenario
};

const shareableURL = useMemo(() => {
  // Generate URL with current input parameters
}, [inputs]);
```

### 3. Performance Monitoring
```javascript
// packages/dwz-core/src/solver.ts
console.debug(`DWZ solver: ${retireAge} in ${Date.now() - start}ms`);
```

## Quality Gates

### 4. Add Snapshot Tests
```javascript
// packages/dwz-core/tests/snapshots.test.ts
const canonicalScenarios = [
  { name: "Young couple", inputs: {...}, expected: {...} },
  { name: "Late starter", inputs: {...}, expected: {...} },
];
```

### 5. Binary Search Optimization
```javascript
// Replace O(n) linear search with O(log n) binary search
export function solveEarliestAge(inputs) {
  let lo = inputs.currentAge;
  let hi = inputs.lifeExp - 1;
  // Binary search for earliest viable age
}
```

### 6. Input Validation & Safety
```javascript
// Guard against NaN/Infinity
if (!isFinite(inputs.outside0) || inputs.outside0 < 0) {
  throw new Error("Invalid outside balance");
}
```

## Documentation Alignment

### 7. Update README Claims
- ✅ "True DWZ solver" - verified with terminal wealth = $0
- ✅ "Couples-first design" - preservation age = min() confirmed  
- ✅ "Bridge analysis" - PV-based calculations working
- ✅ "Path continuity" - fixed discontinuities validated

### 8. Add Performance Benchmarks
```bash
# Document typical performance expectations
# Simple scenario: <100ms
# Complex scenario: <500ms  
# Stress test (high savings): <1s
```

## Ready for T-R2 Split Optimizer

The architecture is solid and ready for the savings split optimizer with:
- ✅ Monorepo structure supports new optimization modules
- ✅ Worker pattern scales to more intensive calculations
- ✅ Type system ready for tax-aware optimization
- ✅ Test framework established for financial accuracy

**Recommendation: Merge PR #19 and proceed directly to T-R2**