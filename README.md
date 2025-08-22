# 🇦🇺 Australian FIRE Calculator

A comprehensive React-based calculator for Australians pursuing Financial Independence, Retire Early (FIRE) using the **Die-With-Zero methodology**. This tool helps you optimize retirement planning with accurate Australian tax calculations, superannuation modeling, and sustainable spending calculations that aim to spend all wealth by your life expectancy.

![Screenshot Placeholder](./screenshot.png)

## Features

### Core Calculator
- **Global Results Banner**: Real-time retirement viability displayed prominently under page title
- **Australian Tax Calculations**: Uses 2024-25 tax brackets including Medicare Levy and Surcharge
- **HECS/HELP Debt**: Comprehensive repayment calculation with 2024-25 thresholds
- **Superannuation Modeling**: 12% employer super contributions with $260,280 cap
- **Die-With-Zero Engine**: Sophisticated sustainable spending calculations with stepped pre/post-super phases
- **Planning Modes**: Choose between earliest retirement age or pin target age planning

### Investment Assumptions
- **Expected Returns**: Adjustable 4-12% with helpful tooltips (ASX200 ~10%, Global ~8%)
- **Investment Fees**: 0-2% range (ETFs ~0.2%, Industry Super ~0.8%, Retail ~1.5%)
- **Die-With-Zero Methodology**: Replaces traditional safe withdrawal rate with dynamic sustainable spending
- **Inflation Adjustment**: Toggle real vs nominal returns with today's purchasing power
- **Preset Scenarios**: Optimistic, Balanced, Pessimistic, and GFC Stress test scenarios

### Advanced Super Strategy
- **Salary Sacrifice**: Calculate tax benefits and net cost of additional super contributions
- **Concessional Cap**: Track $30,000 annual limit with overflow warnings
- **Insurance Impact**: Model cost of life, TPD, and income protection premiums in super
- **Bridge Period Analysis**: Validate accessible funds for early retirement before age 60
- **Optimization Insights**: Personalized recommendations based on your tax situation
- **Visual Comparisons**: Side-by-side strategy impact charts

### Enhanced Features  
- **Save & Share**: Save settings locally and generate shareable URLs with all parameters
- **Interactive Charts**: Wealth projection with dynamic reference lines and tooltips
- **Tax Complexity**: Private health insurance impact and effective tax rate display
- **Edge Case Handling**: Smart handling for negative savings, early retirement, etc.
- **Real-time Confidence**: Shows assumptions basis for all calculations
- **Advanced Super Strategy**: Collapsible section with salary sacrifice optimization and insurance analysis

### Die-With-Zero (DWZ) Engine - Primary Planning Method
- **Robust Mathematical Solver**: Uses bisection algorithm to find maximum sustainable spend
- **Global Results Banner**: Prominent display of retirement viability and sustainable spending
- **Dynamic Chart Markers**: Shows earliest FIRE age or target age based on planning mode
- **Bridge Period Validation**: Enforces outside-super-only constraint before preservation age (60)
- **Couples Mode Support**: Handles two-partner scenarios with different preservation ages
- **Earliest FIRE Age**: Binary search to find minimum retirement age for target spending
- **Stepped Spending Phases**: Different sustainable spending before and after super access
- **Real Dollar Consistency**: All calculations in inflation-adjusted terms

## How to Run Locally

1. Clone the repository
```bash
git clone https://github.com/jto014/aussie-fire.git
cd aussie-fire
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173` (or the port shown in terminal)

## Tech Stack

- **React** - Frontend framework with hooks for state management
- **Vite** - Fast build tool and development server
- **Recharts** - Interactive charting library for wealth projections
- **Decimal.js-light** - Precision decimal arithmetic for financial calculations
- **Modern CSS** - Inline styles with gradient design elements

## Money Maths

All financial calculations use `decimal.js-light` (v2.5.1) to ensure precision and eliminate floating-point rounding errors common with JavaScript's native `Number` type.

- **Rounding Mode**: ROUND_HALF_EVEN (banker's rounding) - ensures fairness over many transactions
- **When to Round**: Only at presentation/display edges, never during intermediate calculations  
- **Precision**: Full precision maintained during calculations, rounded to cents for display
- **Performance**: Negligible impact (<1ms per calculation) for typical FIRE planning workloads
- **Conversion**: `toNumber()` only used at UI boundaries; all core calculations remain in Decimal

## Input Parameters

- Current age (20-60)
- Retirement target age (30-70)  
- Current savings outside super
- Annual pre-tax income
- Annual expenses
- Current super balance

## Calculations

### Tax Calculations
- **Income Tax**: Australian progressive brackets (0% to 45%)  
- **Medicare Levy**: 2% on income above $29,207
- **Medicare Levy Surcharge**: 1% if no private health and income > $97,000
- **HECS/HELP**: Progressive rates from 1% to 10% based on 2024-25 thresholds
- **Effective Tax Rate**: Real-time display of total tax burden

### Investment Projections
- **Returns**: User-configurable (4-12%) with fee deduction
- **Real Returns**: Inflation-adjusted if enabled
- **Wealth Growth**: Compound interest with annual contributions
- **Super Contributions**: 12% of pre-tax income (capped at $260,280)

### Retirement Planning - Die-With-Zero Methodology
- **Sustainable Spending**: Dynamic calculations based on wealth depletion to life expectancy
- **Stepped Phases**: Different spending rates before and after superannuation access (age 60)
- **Global Banner Display**: Immediate feedback on retirement viability and spending capacity
- **Planning Mode Integration**: Earliest retirement vs target age planning with appropriate chart markers
- **Super Access**: Preservation age rules (can't access before 60) built into calculations

## Known Issues & Development Status

### DWZ Engine Status ✅ 
- **Global Banner Integration**: ✅ Complete - Real-time retirement status prominently displayed
- **UI Consistency**: ✅ Complete - All interface elements use DWZ-only methodology 
- **Planning Modes**: ✅ Complete - Earliest vs target age with dynamic chart markers
- **Bridge Constraint Solver**: ✅ Working - Enforces outside-money-only constraint during bridge period
- **Couples Mode**: ✅ Working - Basic two-partner DWZ calculations implemented  
- **Test Coverage**: ✅ 23/23 tests passing, including bridge constraint validation tests

### Future Enhancements

- [x] ~~Multiple investment return scenarios~~ ✅ (Preset scenarios implemented)
- [x] ~~Inflation adjustment options~~ ✅ (Real vs nominal returns)  
- [x] ~~Die-with-Zero engine~~ ✅ (Core implementation complete and integrated)
- [x] ~~Global results banner~~ ✅ (T-010 - Prominent retirement status display)
- [x] ~~DWZ-only mode~~ ✅ (T-010 - Removed SWR toggle, DWZ is primary methodology)
- [x] ~~Save/load scenarios~~ ✅ (localStorage + URL sharing)
- [ ] Three-segment couples preservation age handling
- [ ] Capital gains tax considerations
- [ ] Franking credits modeling  
- [ ] Part-time work transition planning
- [ ] Healthcare and insurance cost planning
- [ ] Export results to PDF
- [ ] Monte Carlo simulation for success probability
- [ ] Geographic cost-of-living adjustments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
