# Feature Specifications

## 1. COUPLES MODE (Critical - Most Users Have Partners)

### Why Critical:
- Single person FIRE is rare - most have partners/families
- Tax optimization completely changes with couples
- Super strategies differ significantly
- Expenses don't double (economies of scale)

### Implementation:
```javascript
// Add to state
const [coupleMode, setCoupleMode] = useState(false);
const [partnerIncome, setPartnerIncome] = useState(0);
const [partnerSuper, setPartnerSuper] = useState(0);
const [partnerAge, setPartnerAge] = useState(30);
const [sharedExpenses, setSharedExpenses] = useState(true);

// Key calculations
- Combined tax optimization
- Spousal super contribution benefits
- Age Pension for couples ($1,653/fortnight vs $1,096 single)
- Optimal retirement timing for both
```

### UI Changes:
- Toggle: "Planning as a couple"
- When enabled, show partner inputs
- Split vs combined expense options
- Show both partners' retirement ages

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