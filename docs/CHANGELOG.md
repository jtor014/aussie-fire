# Changelog - DWZ v2

All notable changes to the DWZ v2 calculator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation framework (ARCHITECTURE.md, ROADMAP.md, TICKETS.md)
- Pull request template for contribution guidelines

## [0.1.0] - 2025-08-24

### Added
- **True DWZ Solver**: Core mathematical engine that solves sustainable spending to deplete wealth at life expectancy
- **Monorepo Architecture**: Separated math engine (`packages/dwz-core`) and UI (`apps/dwz-v2`)
- **Web Worker Integration**: Non-blocking calculations using web workers
- **Full Lifecycle Visualization**: Chart showing accumulation → bridge → retirement phases
- **Bridge Analysis**: PV-based bridge calculations with viability gating
- **Couples-First Design**: Combined household balances and unified preservation ages
- **Path Continuity**: Fixed discontinuities at retirement boundary with end-of-year FV convention

### Technical
- TypeScript throughout with strict type checking
- Recharts for interactive wealth visualization
- npm workspaces for package management
- Comprehensive test suite for mathematical accuracy

### Algorithms
- **Bisection Search**: S_base solver targeting terminal wealth ≈ bequest (±$200 tolerance)
- **Linear Search**: Earliest viable retirement age with bridge viability gating
- **Present Value Calculations**: Bridge funding requirements using actual investment returns
- **Age-Band Multipliers**: Go-go (1.10x), slow-go (1.00x), no-go (0.85x) spending patterns

### User Interface
- Removed manual "target spend" input - now solver-driven
- Shows "Sustainable spending (DWZ): $X/yr" from mathematical optimization
- Optional spending cap in Advanced section with under-spending warnings
- Bridge status with PV requirements and coverage analysis
- Enhanced chart tooltips showing lifecycle phases

### Fixes
- Path continuity at retirement boundary (no more jumps)
- Bridge shading properly aligned with spending period ages  
- Banner/bridge/chart mathematical consistency (single source of truth)
- Chart properly depletes to ~$0 at life expectancy
- Scale-invariant calculations (10x balance changes work correctly)

### Performance
- Calculations complete in <200ms for typical inputs
- Web workers prevent UI blocking during intensive computations
- Continuity assertions warn if path discontinuities >$1k detected

## [0.0.1] - 2025-08-24

### Added
- Initial v2 scaffold with monorepo structure
- Basic DWZ solver framework
- React application shell with Web Worker setup
- TypeScript configuration and build system

---

## Legacy v1 Calculator

The original Australian FIRE calculator (v1) includes the following completed features:

### Core Features
- Die-With-Zero methodology with age-band spending multipliers
- Australian tax calculations (2024-25 brackets, Medicare levy, HECS/HELP)
- Superannuation modeling with concessional caps
- Bridge period analysis for early retirement
- Interactive wealth projection charts
- Save/share functionality with URL parameters

### Technical Achievements  
- 280+ comprehensive test cases
- Decimal.js precision arithmetic
- Real vs nominal return toggle
- Preset investment scenarios
- Advanced superannuation strategy recommendations

The v2 calculator builds upon this foundation with a cleaner architecture and true mathematical optimization.