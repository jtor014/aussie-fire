# Changelog

All notable changes to the Australian FIRE Calculator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2025-08-23

### Major Changes - T-021: Bridge Math Consistency Fix
- **BREAKING**: Fixed bridge calculation inconsistency where GlobalBanner and BridgeChip used different math
- **Bridge Unification**: Both components now use unified bridge assessment from age-band solver

### Added
- **Unified Bridge System**: Created single source of truth for bridge calculations
- **Enhanced Bridge Logic**: Added `buildSpendingSchedule()` and `computeBridgeRequirement()` functions
- **Preservation Age Consistency**: Proper age-specific preservation age lookup across all components
- **Comprehensive Testing**: Added 25+ bridge consistency tests and golden scenario validation

### Changed
- **GlobalBanner**: Now reads constraint type from unified age-band engine
- **BridgeChip**: Now uses unified bridge assessment instead of legacy kpis calculation
- **Decision Selector**: Enhanced with unified bridge assessment from solver
- **Age-Band Solver**: Now computes and returns bridge data using age-banded spending

### Fixed
- **Bridge Calculation Bug**: Fixed loop condition causing incorrect bridge spending calculations
- **Inconsistent Messaging**: Eliminated contradictory "horizon-limited" banner + "Short" chip displays
- **Preservation Age Sources**: Unified preservation age lookup to prevent calculation discrepancies

### Technical
- Enhanced `src/core/dwz_age_band.js` with unified bridge computation
- Added `src/core/age_bands.js` buildSpendingSchedule function  
- Fixed `src/core/bridge.js` computeBridgeRequirement loop logic
- Updated `src/selectors/decision.js` with proper preservation age handling
- Created comprehensive test suites: `tests/bridge-consistency-*.test.js`

## [0.4.0] - 2025-08-23

### Major Changes - T-016: DWZ-Only Polish
- **Age-Band Spending**: Implemented sophisticated age-band aware spending patterns (go-go/slow-go/no-go phases)
- **Enhanced Depletion Charts**: Charts now show realistic spending transitions at ages 60 and 75
- **Improved Formatting**: Added thousand separators to bridge funding displays
- **Unified UI**: Removed legacy couple-specific results panels

### Added
- **Age-Band Multipliers**: Go-go (1.10×), slow-go (1.00×), and no-go (0.85×) spending multipliers
- **Age-Band Transition Markers**: Chart markers at ages 60 (slow-go) and 75 (no-go) 
- **Comprehensive Test Suite**: 25+ new tests for age-band depletion paths and bequest functionality
- **Bridge Chip Formatting**: Proper thousand separator formatting (e.g., "1,250k" instead of "1250k")

### Changed
- **Depletion Path Generator**: Now uses age-band multipliers instead of simple pre/post spending
- **GlobalBanner**: Shows single sustainable spending amount instead of stepped amounts
- **Chart Annotations**: Enhanced with age-band transition indicators and spending level changes
- **Test Structure**: Updated decision logic tests for DWZ-only mode

### Technical
- Created `src/core/age_bands.js` with age-band spending system
- Enhanced `src/selectors/depletion.js` with backward compatibility for legacy parameters
- Added comprehensive test files: `tests/age-band-depletion.test.js`, `tests/chart-markers.test.js`, `tests/bequest-target.test.js`
- Improved age-band boundary logic to handle overlapping ranges correctly

## [0.3.0] - 2025-08-23

### Major Changes - T-015: DWZ-Only UX
- **BREAKING**: Completely removed legacy target-age flow - DWZ methodology is now the only retirement planning mode
- **BREAKING**: Removed pinned retirement age controls and DWZ planning mode toggles

### Added
- **Earliest FIRE Focus**: UI now centers around earliest possible retirement age
- **Simplified State Management**: Removed dwzPlanningMode and pinnedRetirementAge from application state
- **Enhanced Chart Markers**: Shows only Earliest FIRE, Super unlock, and Life Expectancy markers
- **Backward Compatibility**: URL shims handle legacy dwzPlanningMode parameters

### Changed
- **Unified Results Display**: Single results panel for both single and couple modes
- **Simplified KPI Calculations**: Always use earliest age logic instead of slider-based retirement age
- **Chart Simplification**: Removed confusing "Retirement" and "Target" markers
- **GlobalBanner Updates**: Always shows earliest retirement age with sustainable spending

### Removed
- DWZ Planning Mode radio buttons (Earliest FIRE vs Pin Age)
- Pin age slider controls in PersonSituationCard
- Red "Cannot retire at earliest target" warning panels
- Legacy retirement age sliders and target-based calculations
- Mode-switching logic throughout the application

### Technical
- Updated `src/selectors/decision.js` to always use earliest age calculation
- Simplified `src/selectors/kpis.js` by removing mode-dependent logic
- Created comprehensive test suite in `tests/ux-dwz-only.test.js`
- Enhanced chart marker generation with age-band transition support

## [0.2.0] - 2025-08-22

### Major Changes - T-010: DWZ-Only Mode
- **BREAKING**: Removed Safe Withdrawal Rate (SWR) methodology - Die-With-Zero is now the primary planning approach
- **BREAKING**: Removed DWZ enable/disable toggle - DWZ settings are now always visible

### Added
- **Global Results Banner**: Prominent retirement status display directly under page title
- **Dynamic Chart Markers**: Conditional markers based on planning mode (earliest FIRE vs target age)
- **GlobalBanner Component**: New React component for real-time retirement feedback
- **Migration Compatibility**: Shims for existing dwzEnabled parameters in URLs and saved settings

### Changed
- **UI Transformation**: DWZ settings section always visible without toggle
- **Chart Integration**: ReferenceLine markers now respond to planning mode selection
- **Calculations**: All KPIs and displays use Die-With-Zero sustainable spending exclusively
- **Planning Modes**: Enhanced earliest vs pinned age modes with appropriate visual feedback

### Removed
- Safe Withdrawal Rate (SWR) toggle and all related UI elements
- FireNumber calculations based on fixed withdrawal rates
- SWR percentage displays in results sections
- DWZ enable/disable checkbox throughout the interface

### Fixed
- Syntax errors in useMemo hook structure
- Missing dieWithZeroMode state variable declaration
- Remaining safeWithdrawalRate references in dependency arrays

### Technical
- Created `src/components/GlobalBanner.jsx` with comprehensive planning mode support
- Updated `src/selectors/kpis.js` to remove SWR-dependent calculations
- Simplified state management by removing flags and toggle remnants

## [0.1.1] - 2025-08-18

### Added
- Edge case handling for users already at/past retirement age
- Special retirement status message when current age >= retirement age
- Current wealth assessment using 4% withdrawal rule
- Improved user experience for immediate retirement scenarios

### Fixed
- Calculation logic now handles current age >= retirement age properly
- Results section displays appropriate messages for current vs projected wealth
- Chart data calculations work correctly for edge cases

## [0.1.0] - 2025-08-18

### Added
- Initial release of Australian FIRE Calculator
- React-based calculator interface with modern card design
- Australian tax bracket calculations for 2024-25 financial year
- Superannuation modeling with 11.5% employer contributions
- Interactive wealth projection chart using Recharts
- Three-line chart showing Outside Super, Super Balance, and Total Wealth
- 4% withdrawal rule validation for retirement feasibility
- Real-time calculations updating on parameter changes
- Responsive design with inline styling
- Input validation and currency formatting in AUD
- Visual markers for retirement age and FIRE number
- Custom tooltips with formatted currency values
- Savings rate calculation and color-coded feedback
- Warning messages for negative savings scenarios

### Features
- Current age slider (20-60 years)
- Retirement target age slider (30-70 years)
- Current savings input (outside super)
- Annual pre-tax income input
- Annual expenses input
- Current super balance input
- Wealth projection from current age to 90
- 7% annual return assumption
- Progressive tax calculation
- Compound interest calculations for wealth growth

### Technical
- Built with React 18 and modern hooks
- Vite build system for fast development
- Recharts for interactive data visualization
- ESLint configuration for code quality
- Responsive container for mobile compatibility