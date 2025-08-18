# Changelog

All notable changes to the Australian FIRE Calculator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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