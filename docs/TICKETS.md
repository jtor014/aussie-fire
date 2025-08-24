# Tickets - DWZ v2

## Completed Tickets ✅

### T-R1: True DWZ Solver Implementation
**Status**: ✅ Complete  
**Assignee**: Claude  
**Completed**: 2025-08-24

**Description**: Implement core Die-With-Zero mathematical engine that solves for sustainable spending to deplete wealth at life expectancy.

**Requirements**:
- [x] Bisection search for S_base targeting terminal wealth ≈ bequest target
- [x] Pre-retirement accumulation phase with annual savings
- [x] Post-retirement spend-down simulation with age-band multipliers
- [x] Bridge viability gating using PV calculations
- [x] Earliest viable age determination
- [x] Continuous path generation for visualization

**Technical Details**:
- Package: `packages/dwz-core/src/solver.ts`
- Key function: `findEarliestViable(inputs): SolveResult | null`
- Algorithm: Linear search + bisection for each candidate retirement age
- Test coverage: Convergence, continuity, bridge accuracy

**Acceptance Criteria**:
- [x] Terminal wealth within $200 of bequest target
- [x] Bridge calculations use same spending schedule as path
- [x] No mathematical contradictions between banner/bridge/chart
- [x] Path continuity (no jumps >$1k at retirement boundary)

---

### T-R1b: Path Continuity & Visualization Fixes
**Status**: ✅ Complete  
**Assignee**: Claude  
**Completed**: 2025-08-24

**Description**: Fix discontinuities in wealth path visualization and improve chart styling.

**Issues Resolved**:
- [x] Jump/discontinuity at retirement boundary
- [x] Bridge shading misaligned with actual spending period
- [x] PV vs FV mixing in calculations
- [x] Inconsistent end-of-year vs start-of-year conventions

**Technical Changes**:
- Unified end-of-year FV convention throughout
- Fixed spend-then-grow order in retirement simulation
- Separated accumulation/retirement phases in chart styling
- Added continuity assertion with >$1k warning threshold

**Result**: Smooth, continuous wealth path from current age to life expectancy with proper depletion curve.

---

## Active Tickets 🔄

### T-R2: Savings Split Optimizer
**Status**: 🔄 Ready to Start  
**Assignee**: TBD  
**Priority**: High

**Description**: Optimize allocation of annual savings between super contributions (salary sacrifice) and outside investments.

**Requirements**:
- [ ] Tax-aware optimization considering marginal rates
- [ ] Respect Australian concessional caps ($30k/year)
- [ ] Generate per-person recommendations for couples
- [ ] Calculate tax savings from salary sacrifice
- [ ] Earlier viable retirement age through optimized split

**Technical Approach**:
```typescript
interface SplitOptimizer {
  optimize(household: Household, assumptions: Assumptions): {
    recommended: {
      p1: { salarySacrifice: number; outside: number };
      p2: { salarySacrifice: number; outside: number };
    };
    taxSavingsAnnual: number;
    rationale: string;
  };
}
```

**Acceptance Criteria**:
- [ ] Recommendations improve viable retirement age vs current "all outside" approach
- [ ] Clear explanation of tax benefits and constraints
- [ ] Handles edge cases (low income, already at caps, etc.)
- [ ] Integration with existing solver architecture

**Estimated Effort**: 2-3 days  
**Dependencies**: None (T-R1 complete)

---

## Backlog 📋

### T-R3: Advanced Couples Features
**Status**: 📋 Planned  
**Priority**: Medium  
**Dependencies**: T-R2

**Description**: Enhanced couples modeling with individual preservation ages and drawdown strategies.

**Scope**:
- [ ] Individual preservation ages (currently uses min of both)
- [ ] Separate income streams and tax calculations
- [ ] Configurable post-preservation drawdown (outside-first vs proportional)
- [ ] Individual insurance premium tracking
- [ ] Per-person contribution recommendations

**Complexity**: Medium  
**Estimated Effort**: 3-4 days

---

### T-R4: Australian Tax Engine
**Status**: 📋 Planned  
**Priority**: Medium

**Description**: Comprehensive Australian tax calculations for salary sacrifice optimization.

**Scope**:
- [ ] Current tax brackets (2024-25) with inflation indexing
- [ ] Medicare levy (2%) and surcharge (1-1.5%)  
- [ ] HECS/HELP repayment thresholds and rates
- [ ] Effective marginal rate calculations
- [ ] Franking credits modeling (advanced feature)

**Technical Requirements**:
- Tax rules as configuration data (easy to update annually)
- Support for different tax years
- Integration with split optimizer

**Complexity**: Medium  
**Estimated Effort**: 2-3 days

---

### T-R5: Monte Carlo Analysis
**Status**: 📋 Planned  
**Priority**: Low  
**Dependencies**: T-R2, T-R3

**Description**: Probabilistic analysis with return sequence risk modeling.

**Scope**:
- [ ] Success probability for given retirement age/spending
- [ ] Return sequence risk visualization  
- [ ] Confidence intervals for key outcomes
- [ ] Scenario stress testing (GFC, inflation spikes, etc.)

**Technical Challenges**:
- Performance optimization for thousands of simulations
- Statistical analysis and visualization
- User-friendly presentation of probability concepts

**Complexity**: High  
**Estimated Effort**: 5-7 days

---

### T-R6: UI/UX Enhancements
**Status**: 📋 Planned  
**Priority**: Medium

**Description**: Polish and advanced user interface features.

**Scope**:
- [ ] Preset scenario management (Conservative/Balanced/Aggressive)
- [ ] Export capabilities (PDF reports, CSV data)
- [ ] Advanced settings panel with explanatory tooltips
- [ ] Mobile-responsive design improvements
- [ ] Accessibility audit and WCAG 2.1 AA compliance

**Design Requirements**:
- Maintain simplicity while adding power user features
- Progressive disclosure (basic → intermediate → advanced)
- Clear visualization of assumptions and limitations

**Complexity**: Medium  
**Estimated Effort**: 4-5 days

---

## Bug Reports & Issues 🐛

### Open Issues
*No open issues currently*

### Resolved Issues
- [x] **Path Discontinuity**: Fixed jump at retirement boundary (T-R1b)
- [x] **Bridge Alignment**: Bridge shading now matches spending period (T-R1b)  
- [x] **Mathematical Consistency**: Banner/bridge/chart use unified calculations (T-R1)

---

## Technical Debt & Refactoring

### Code Quality
- [ ] Increase test coverage to >90% for math engine
- [ ] Add integration tests for worker communication
- [ ] Performance benchmarking suite
- [ ] API documentation with examples

### Architecture
- [ ] Consider WebAssembly for intensive calculations (if performance becomes issue)
- [ ] Implement result caching/memoization for repeated calculations
- [ ] Service worker for offline functionality

### Developer Experience  
- [ ] GitHub Actions CI/CD pipeline
- [ ] Automated dependency updates
- [ ] Code formatting and linting automation
- [ ] Development environment documentation