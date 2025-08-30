# TODO List for Australian FIRE Calculator

## ✅ COMPLETED - Foundation Architecture  
- ✅ **T-022: POST-RETIREMENT INFLOWS INTEGRATION** (Aug 2025) - 🚀 MAJOR FEATURE
  - ✅ **Multi-Entry Future Inflows** - Support multiple inheritances, windfalls, or other income sources
  - ✅ **Post-Retirement Integration** - Inflows during retirement properly increase sustainable spending
  - ✅ **Destination Selection** - Route inflows to outside or super accounts with preservation rules
  - ✅ **Enhanced Solver Logic** - Extracted reusable inflow application for both accumulation and retirement phases
  - ✅ **Comprehensive Testing** - 19+ tests covering various post-retirement scenarios and edge cases
  - ✅ **Cache Invalidation Fix** - Fixed React useMemo to properly invalidate when futureInflows change
- ✅ **T-021: BRIDGE MATH CONSISTENCY FIX** (Aug 2025) - 🔧 CRITICAL FIX
  - ✅ **Unified Bridge Assessment** - Single source of truth for bridge calculations
  - ✅ **Consistent UI Components** - GlobalBanner and BridgeChip now use same math
  - ✅ **Enhanced Age-Band Solver** - Integrated bridge computation with age-banded spending
  - ✅ **Preservation Age Consistency** - Proper age-specific lookup across all components
  - ✅ **Comprehensive Testing** - 25+ bridge consistency and golden scenario tests
  - ✅ **Bug Fixes** - Fixed bridge calculation loop causing incorrect spending calculations
- ✅ **T-010: DWZ-ONLY MODE TRANSFORMATION** (Aug 2025) - 🚀 MAJOR UPDATE
  - ✅ **Global Results Banner** - Real-time retirement status under page title
  - ✅ **DWZ Always On** - Removed SWR toggle, DWZ settings permanently visible
  - ✅ **Dynamic Chart Markers** - Conditional markers based on planning mode
  - ✅ **SWR Cleanup** - Removed all Safe Withdrawal Rate references and calculations
  - ✅ **Planning Mode Integration** - Earliest vs target age with appropriate feedback
  - ✅ **Migration Compatibility** - Shims for existing dwzEnabled parameters
- ✅ **STRANGLER-FIG REFACTOR** - Extracted logic from UI
  - ✅ Created `/core`, `/data`, `/models` folders  
  - ✅ Moved hard-coded rules to `au_rules.json`
  - ✅ Extracted pure functions: `tax.js`, `super.js`, `bridge.js`, `household.js`
  - ✅ Added comprehensive Vitest test suite (23 tests)
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
  
- [x] ~~**Lump Sum Events**~~ ✅ (T-022: Future Inflows implemented)
  - ✅ Windfall/inheritance input with trigger age
  - ✅ Multi-entry support for multiple events
  - ✅ Destination selection (outside vs super)
  - ✅ Impact on retirement timeline and sustainable spending
  - [ ] Property sale proceeds with CGT calculation (future enhancement)
  - [ ] Tax optimization strategies for lump sums (future enhancement)

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
- ✅ **T-022: Post-Retirement Inflows Integration** (Aug 2025) 🚀
  - **NEW**: Multi-entry future inflows panel with add/remove functionality
  - **ENHANCED**: Post-retirement inflows now properly increase sustainable spending calculations
  - **FIXED**: React cache invalidation issue causing inflows to appear ineffective
  - **IMPROVED**: Comprehensive test coverage with 19+ scenarios including edge cases
  - **TECHNICAL**: Extracted reusable inflow logic for both accumulation and retirement phases
- ✅ **T-010: DWZ-Only Mode Transformation** (Aug 2025) 🚀
  - **BREAKING**: Removed Safe Withdrawal Rate toggle - Die-With-Zero is now primary planning approach
  - **NEW**: GlobalBanner component displays real-time retirement status prominently
  - **ENHANCED**: Dynamic chart markers based on planning mode (earliest FIRE vs target age)
  - **IMPROVED**: DWZ settings always visible without toggle for streamlined UX
  - **MIGRATION**: Backward compatibility shims for existing dwzEnabled parameters
- ✅ **Phase 3 Couples Mode Complete** (Dec 2024)
  - Unified PersonSituationCard component for both partners
  - Per-partner super strategy panels with identical controls
  - Clean Tax & Deductions section (removed HECS/PHI duplicates)
  - Partner B defaults to reasonable starting values
  - **FIXED**: Single mode now uses same PartnerSuperPanel (restored insurance in super controls)
  - **IMPROVED**: Context-aware titles ("Super Strategy" vs "You — Super Strategy")
- ✅ **Strangler-Fig Architecture** (Dec 2024)  
  - Complete separation of UI and business logic
  - Pure calculation functions with comprehensive test coverage
  - Australian tax rules externalized to JSON configuration
  - Zero regressions - all existing functionality preserved
- ✅ **Foundation UI Improvements** (Nov 2024)
  - PayCalculator-style professional layout
  - Consistent spacing system and collapsible sections
  - Enhanced Basic Details and Current Wealth sections