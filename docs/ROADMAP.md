# Roadmap - DWZ v2

## Completed ✅

### T-R1: True DWZ Solver
**Status**: ✅ Complete  
**Description**: Core mathematical engine that solves sustainable spending to deplete wealth at life expectancy.

**Key Achievements**:
- Bisection search for S_base targeting terminal wealth ≈ bequest
- Pre-retirement accumulation + post-retirement spend-down simulation
- Bridge viability gating with PV-based calculations
- Path continuity fixes (unified end-of-year FV convention)
- Full lifecycle visualization (accumulation → bridge → retirement)

### T-R1b: Path Continuity & Visualization
**Status**: ✅ Complete  
**Description**: Fixed discontinuities and improved chart visualization.

**Key Achievements**:
- Eliminated jumps at retirement boundary
- Bridge shading properly aligned with spending period
- Enhanced tooltips with lifecycle phase indicators
- Continuous lines with phase-based styling

## In Development 🔄

### T-R2: Savings Split Optimizer
**Status**: 🔄 Ready to Start  
**Priority**: High  
**Timeline**: Next sprint

**Scope**:
- Optimize super vs outside contribution split
- Respect concessional caps ($30k/year in Australia)
- Tax-aware recommendations based on marginal rates
- Per-person split recommendations for couples

**Technical Approach**:
```typescript
type SplitOptimization = {
  recommended: {
    p1: { salary_sacrifice: number; outside: number };
    p2: { salary_sacrifice: number; outside: number };
  };
  constraints: {
    concessional_cap_utilization: number;
    tax_savings_annual: number;
  };
  rationale: string;
};
```

**Success Criteria**:
- Earlier viable retirement age through optimized contributions
- Clear explanation of tax benefits
- Respect for Australian super rules and caps

## Planned 📋

### T-R3: Advanced Couples Features
**Status**: 📋 Planned  
**Priority**: Medium  
**Dependencies**: T-R2

**Scope**:
- Individual preservation ages (currently uses min of both)
- Separate income streams and tax situations
- Configurable drawdown strategies (outside-first vs proportional)
- Individual insurance premium tracking

### T-R4: Tax Engine Enhancement
**Status**: 📋 Planned  
**Priority**: Medium

**Scope**:
- Current Australian tax brackets (2024-25)
- Medicare levy and surcharge calculations
- HECS/HELP debt repayments
- Franking credits modeling (advanced)

### T-R5: Monte Carlo Analysis
**Status**: 📋 Planned  
**Priority**: Low
**Dependencies**: T-R2, T-R3

**Scope**:
- Success probability calculation
- Return sequence risk modeling
- Confidence intervals for retirement dates
- Scenario stress testing

### T-R6: Advanced UI/UX
**Status**: 📋 Planned  
**Priority**: Medium

**Scope**:
- Preset scenario management (Conservative/Balanced/Aggressive)
- Export capabilities (PDF reports, shareable links)
- Mobile-responsive design improvements
- Accessibility enhancements (WCAG 2.1 AA)

## Future Considerations 💡

### Performance & Scalability
- WebAssembly for intensive calculations
- Service worker for offline functionality  
- Result caching and memoization
- Bulk scenario analysis

### Advanced Features
- Part-time work transition modeling
- Healthcare cost projections
- Geographic cost-of-living adjustments
- Estate planning integration

### Integration Opportunities  
- Superannuation fund API integration
- Tax office data import
- Financial advisor tools export
- Third-party portfolio tracking

## Success Metrics

### Core Functionality
- [ ] Chart shows smooth depletion to ~$0 at life expectancy
- [ ] Banner/bridge/chart show consistent results  
- [ ] No mathematical contradictions or discontinuities
- [ ] Scale-invariant calculations (10x balances → expected behavior)

### User Experience
- [ ] Calculation time < 500ms for typical inputs
- [ ] No UI blocking during intensive computations
- [ ] Clear explanation of DWZ methodology and assumptions
- [ ] Actionable recommendations with rationale

### Code Quality
- [ ] >90% test coverage on math engine
- [ ] TypeScript strict mode with zero any types
- [ ] Documentation covers all public APIs
- [ ] CI/CD pipeline with automated testing

## Migration Strategy

The v2 architecture is designed to coexist with the existing v1 calculator:

1. **Parallel Development**: v2 developed as separate app (`/v2` route)
2. **Feature Parity**: Achieve equivalent functionality to v1
3. **User Testing**: Validate calculations match v1 for equivalent inputs
4. **Gradual Migration**: Redirect traffic to v2 when mature
5. **Sunset v1**: Remove legacy code after successful migration

This approach minimizes risk while allowing rapid iteration on the new architecture.