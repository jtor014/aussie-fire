# ✅ COMPLETED: Strangler-Fig Refactor + Couples Mode

## ✅ Architecture Success: Clean Separation Achieved

### What We Built:
- ✅ **Robust Foundation**: `/src/core/` pure functions, `/src/data/` config, `/src/models/` types
- ✅ **Comprehensive Testing**: 17 unit tests covering all calculation logic
- ✅ **Couples Mode**: Full per-partner support with unified components
- ✅ **Zero Regressions**: All existing functionality preserved exactly
- ✅ **Clean UI**: PersonSituationCard, optimized Tax & Deductions section

### Current Architecture:
```
src/
├── core/           # ✅ Pure calculation functions
│   ├── tax.js      # Income tax, Medicare Levy, HECS calculations
│   ├── super.js    # Superannuation contributions and caps
│   ├── bridge.js   # Early retirement bridge period analysis
│   └── household.js # Couples cashflow combination logic
├── data/           # ✅ Configuration files
│   └── au_rules.json # Australian tax brackets, super caps, etc
├── models/         # ✅ Data shape factories
│   └── shapes.js   # mkPartner(), mkHousehold() functions
├── tests/          # ✅ Comprehensive test coverage
│   ├── tax.test.js     # 5 tax calculation tests
│   ├── super.test.js   # 5 super contribution tests  
│   ├── bridge.test.js  # 5 bridge period tests
│   └── household.test.js # 2 couples cashflow tests
└── AustralianFireCalculator.jsx # ✅ Clean UI component
```

## ✅ COMPLETED PHASES

### ✅ Phase 1: Logic Extraction (DONE)

### 1.1 Create Folder Structure
```
src/
  core/           # Pure calculation functions
  data/           # Rules and constants
  models/         # TypeScript types
  workers/        # Web workers for Monte Carlo
  components/     # Keep existing UI
```

### 1.2 Move Rules to Config
```json
// /data/au_rules.json
{
  "tax_years": {
    "2025_26": [
      {"min": 0, "max": 18200, "rate": 0},
      {"min": 18201, "max": 45000, "rate": 0.19},
      {"min": 45001, "max": 120000, "rate": 0.325},
      {"min": 120001, "max": 180000, "rate": 0.37},
      {"min": 180001, "max": null, "rate": 0.45}
    ]
  },
  "medicare": {"rate": 0.02, "threshold": 29207},
  "concessional_cap": 30000,
  "sg_max_base": 260280,
  "preservation_age_table": [
    {"born_before":"1960-07-01","age":55},
    {"born_before":"1964-07-01","age":59},
    {"born_before":"1965-07-01","age":60}
  ]
}
```

### 1.3 Add TypeScript Types
```typescript
// /models/types.ts
export interface Partner {
  name: string;
  dob: string;
  currentAge: number;
  retireAge: number;
  income: number;
  extraContrib: number;
  superStart: number;
  liquidStart: number;
  hasPrivateHealth: boolean;
  hecsBalance: number;
}

export interface Household {
  partners: [Partner, Partner?];
  annualExpenses: number;
}

export interface Year {
  age: number;
  liquidWealth: number;
  superWealth: number;
  totalWealth: number;
}
```

### 1.4 Extract Pure Functions
```typescript
// /core/tax.ts
export function calcIncomeTax(
  income: number,
  rules: Rules,
  opts: { hasPrivateHealth: boolean; hecsBalance: number }
): number

// /core/super.ts
export function calcContributions(
  income: number,
  extra: number,
  rules: Rules
): { employer: number; additional: number; total: number }

// /core/deterministic.ts
export function projectSingle(
  inputs: Inputs,
  assumptions: Assumptions,
  rules: Rules
): { years: Year[]; summary: ProjectionSummary }
```

## Phase 2: Add Tests & Validate (Week 2)

### 2.1 Add Vitest Testing
```bash
npm install -D vitest
```

### 2.2 Test Core Functions
```typescript
// /tests/tax.test.ts
describe('calcIncomeTax', () => {
  it('calculates $100k income correctly', () => {
    expect(calcIncomeTax(100000, rules, {...})).toBe(22967);
  });
});
```

### 2.3 Swap Component to Use Core
- Component becomes thin shell calling `/core/*`
- Results should be **identical** to current

## Phase 3: Add Couples Support (Week 3)

### 3.1 Extend UI with Tabs
```jsx
const [householdMode, setHouseholdMode] = useState('single');

{householdMode === 'single' ? (
  <SinglePersonInputs />
) : (
  <CoupleInputs />
)}
```

### 3.2 Per-Partner Calculations
```typescript
// Calculate tax and super per partner
const partner1Results = projectSingle(partner1Inputs, assumptions, rules);
const partner2Results = projectSingle(partner2Inputs, assumptions, rules);

// Combine cashflows for household
const householdResults = combinePartners(partner1Results, partner2Results);
```

### 3.3 Keep Same Chart
- Reuse existing chart component
- Add stacked lines for Partner A + Partner B
- Same bridge period logic but for combined liquid assets

## Phase 4: Add Monte Carlo (Week 4)

### 4.1 Web Worker for Performance
```typescript
// /workers/monteCarlo.worker.ts
export function runSimulation(
  baseInputs: Inputs,
  assumptions: Assumptions,
  iterations: number
): SimulationResults
```

### 4.2 Overlay on Existing Chart
- Keep deterministic projection as base
- Add percentile bands (10th, 50th, 90th)
- Same UI, enhanced with risk analysis

---

## 🚀 NEXT DEVELOPMENT PHASES

### Phase 4: Risk Analysis & Monte Carlo (High Priority)
- Add Monte Carlo simulations with market volatility
- Show success probability bands (10th, 50th, 90th percentiles)
- Web Worker implementation for performance
- Sequence of returns risk analysis

### Phase 5: Advanced Tax Optimization (High Value)
- Salary sacrifice optimization beyond super
- Franking credit calculations for dividends
- CGT strategies and timing
- Tax-loss harvesting recommendations

### Phase 6: Real Estate Integration (Most Requested)
- Primary residence vs investment property analysis
- Mortgage vs invest-in-shares comparison
- Negative gearing impact calculations
- Property growth regional variations

### Phase 7: Enhanced Government Benefits
- Precise Age Pension asset/income test calculations
- Commonwealth Seniors Health Card eligibility
- Rent Assistance integration
- Healthcare cost modeling

---

## ✅ COMPLETED: Couples Mode Implementation

### Current State → Target State:
```typescript
// Current: Single person
const inputs = { age, retireAge, income, expenses, ... };

// Target: Household with 1-2 partners
const household = {
  partners: [
    { name: "You", age: 30, income: 100000, ... },
    { name: "Partner", age: 28, income: 80000, ... }
  ],
  annualExpenses: 60000  // Shared
};
```

### Tax Optimization:
- Calculate `calcIncomeTax()` **per partner**
- Combine household cashflow
- Spousal super contribution strategies
- Age Pension optimization ($1,653/fortnight couple vs $1,096 single)

---

## 2. ENHANCED DIE WITH ZERO

### Current: Die with $0
### Enhancement: "Leave a Legacy" Options

```javascript
const [leaveForKids, setLeaveForKids] = useState(false);
const [inheritanceTarget, setInheritanceTarget] = useState(0);
const [numberOfKids, setNumberOfKids] = useState(2);

// Calculations
- Adjust spend-down to preserve inheritance
- No inheritance tax in Australia (but CGT implications)
- Show impact: "Leaving $500k means working 2 more years"
- Per-child amount display
```

### UI:
```
Die with Zero Mode:
[ ] Spend it all
[ ] Leave inheritance: $______
    Split between ___ beneficiaries
    = $XXX each
    Cost: X extra years of work
```

---

## 3. LUMP SUM WINDFALLS

### Common Scenarios:
1. **Inheritance** (tax-free in Australia)
2. **Property Sale** (CGT implications)
3. **Redundancy** (tax concessions)
4. **Business Sale** (CGT discount)

### Implementation:
```javascript
const [lumpSumEvents, setLumpSumEvents] = useState([
  {
    type: 'inheritance',  // or 'property', 'redundancy', 'business'
    amount: 0,
    age: 45,  // When it happens
    taxable: false,
    cgtDiscount: false
  }
]);

// Calculate impact
- Immediate retirement possibility
- Optimal investment strategy
- Super contribution strategies
- Tax minimization
```

### UI:
```
+ Add Lump Sum Event
Type: [Dropdown]
Amount: $______
Your age when received: ___
[Calculate Tax Impact]

Impact: Retirement moves from age 50 → 45
```

---

## 4. PROPERTY INTEGRATION

### Why Important:
- Most Australians' wealth is in property
- PPOR is tax-free
- Downsizing contributions at 60+
- Rental income for FIRE

### Features:
- PPOR equity tracking
- Investment property P&L
- Rent vs mortgage in retirement
- Downsizing strategy optimizer

---

## PRIORITY RATIONALE

1. **Couples Mode** - HIGHEST
   - 80% of FIRE planners have partners
   - Completely changes the math
   - Current calculator is unrealistic for most

2. **Lump Sums** - HIGH
   - Very common (inheritance, property)
   - Can dramatically accelerate FIRE
   - Tax planning critical

3. **Enhanced Die with Zero** - HIGH
   - Many want to leave something
   - Parents need this feature
   - Shows true cost of inheritance

4. **Property** - MEDIUM
   - Complex but important
   - Could be its own calculator