# TODO List for Australian FIRE Calculator

## ✅ COMPLETED - Foundation Architecture
- ✅ **STRANGLER-FIG REFACTOR** - Extracted logic from UI
  - ✅ Created `/core`, `/data`, `/models` folders  
  - ✅ Moved hard-coded rules to `au_rules.json`
  - ✅ Extracted pure functions: `tax.js`, `super.js`, `bridge.js`, `household.js`
  - ✅ Added comprehensive Vitest test suite (17 tests)
  - ✅ UI identical, results match exactly
- ✅ **COUPLES MODE** - Full partner support implemented
  - ✅ Per-partner tax calculations using same pure functions
  - ✅ Combined household cashflow and bridge logic  
  - ✅ Single/Couple mode toggle with unified PersonSituationCard
  - ✅ Per-partner super strategy panels with cap tracking
  - ✅ Tax & Deductions section cleaned up (removed duplicates)

## Next Development Priorities

## High Priority
- [ ] **Enhanced Die with Zero**
  - Add "Leave for kids" toggle with $ amount input
  - Calculate inheritance tax implications
  - Show impact on retirement age
  - "Die with $X" instead of zero
  
- [ ] **Lump Sum Events**
  - Add windfall/inheritance input with date
  - Property sale proceeds with CGT calculation
  - Redundancy payment handling
  - Show impact on retirement timeline
  - Tax optimization strategies for lump sums

- [ ] Monte Carlo simulation for risk analysis
- [ ] Deploy to GitHub Pages or Vercel

## Medium Priority
- [ ] Property Integration
  - PPOR (Principal Place of Residence)
  - Investment property income/expenses
  - Downsizing strategy at 60+
  - Rent vs Buy calculator
  
- [ ] Advanced Tax Strategies
  - Trust structures
  - Negative gearing
  - Franking credit optimization
  
- [ ] Part-time Work Options
  - Semi-retirement modeling
  - Barista FIRE calculations
  - Impact on preservation age access

## Low Priority
- [ ] Dark mode theme
- [ ] Export to PDF report
- [ ] Historical data backtesting
- [ ] International version (NZ, UK)

## Testing Needed
- [ ] Test with $0 expenses
- [ ] Test with retirement age < current age
- [ ] Test with very high incomes ($500k+)
- [ ] Test on mobile devices
- [ ] Test share links work correctly
- [ ] Test couples scenarios
- [ ] Test lump sum impacts

## Documentation
- [ ] Add screenshots to README
- [ ] Create user guide
- [ ] Document all calculations
- [ ] Create video walkthrough

## Recent Major Updates
- ✅ **Phase 3 Couples Mode Complete** (Dec 2024)
  - Unified PersonSituationCard component for both partners
  - Per-partner super strategy panels with identical controls
  - Clean Tax & Deductions section (removed HECS/PHI duplicates)
  - Partner B defaults to reasonable starting values
- ✅ **Strangler-Fig Architecture** (Dec 2024)  
  - Complete separation of UI and business logic
  - Pure calculation functions with comprehensive test coverage
  - Australian tax rules externalized to JSON configuration
  - Zero regressions - all existing functionality preserved
- ✅ **Foundation UI Improvements** (Nov 2024)
  - PayCalculator-style professional layout
  - Consistent spacing system and collapsible sections
  - Enhanced Basic Details and Current Wealth sections