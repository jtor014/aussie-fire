# Changelog

All notable changes to the Australian FIRE Calculator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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