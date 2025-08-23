# 🇦🇺 Australian FIRE Calculator

A comprehensive React-based calculator for Australians pursuing Financial Independence, Retire Early (FIRE) using the **Die-With-Zero methodology with age-band spending**. This tool helps you optimize retirement planning with accurate Australian tax calculations, superannuation modeling, and sophisticated age-aware sustainable spending that accounts for changing lifestyle needs throughout retirement.

![Screenshot Placeholder](./screenshot.png)

## Features

### Core Calculator
- **Global Results Banner**: Real-time retirement viability with earliest retirement age focus
- **Age-Band Spending**: Go-go (1.10×), slow-go (1.00×), and no-go (0.85×) spending multipliers
- **Australian Tax Calculations**: Uses 2024-25 tax brackets including Medicare Levy and Surcharge
- **HECS/HELP Debt**: Comprehensive repayment calculation with 2024-25 thresholds
- **Superannuation Modeling**: 12% employer super contributions with $260,280 cap
- **Die-With-Zero Engine**: Sophisticated sustainable spending with realistic age-based patterns
- **Earliest FIRE Focus**: Simplified UI centered on earliest possible retirement

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

### Die-With-Zero (DWZ) Engine with Age-Band Spending - Primary Planning Method
- **Age-Band Multipliers**: Go-go years (R-60): 110%, slow-go years (60-75): 100%, no-go years (75+): 85%
- **Realistic Spending Patterns**: Accounts for declining spending capacity as you age
- **Enhanced Chart Visualization**: Age-band transition markers at 60 and 75 with spending annotations
- **Global Results Banner**: Prominent display of earliest retirement age and base sustainable spending
- **Bridge Period Validation**: Enforces outside-super-only constraint before preservation age (60)
- **Unified Interface**: Simplified DWZ-only mode without confusing target-age flows
- **Earliest FIRE Focus**: Binary search to find minimum retirement age for target spending
- **Bequest Planning**: Comprehensive bequest target support with life expectancy calculations
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

### Retirement Planning - Die-With-Zero with Age-Band Methodology
- **Age-Band Spending**: Realistic spending patterns across go-go (110%), slow-go (100%), and no-go (85%) phases
- **Dynamic Chart Markers**: Visual indicators for age-band transitions at 60 and 75 with spending annotations
- **Earliest FIRE Focus**: UI simplified to focus on earliest possible retirement age
- **Global Banner Display**: Shows base sustainable spending with age-band adjustments
- **Super Access**: Preservation age rules (can't access before 60) built into calculations
- **Bequest Integration**: Comprehensive bequest target planning with life expectancy considerations

## Known Issues & Development Status

### DWZ Engine Status ✅ 
- **Age-Band Spending**: ✅ Complete - Go-go/slow-go/no-go spending multipliers fully implemented
- **Enhanced Chart Visualization**: ✅ Complete - Age-band transition markers and spending annotations
- **DWZ-Only Interface**: ✅ Complete - Simplified UI with earliest FIRE focus, removed legacy target flows
- **Global Banner Integration**: ✅ Complete - Shows base sustainable spending with age-band context
- **Bridge Constraint Solver**: ✅ Working - Enforces outside-money-only constraint during bridge period
- **Bequest Planning**: ✅ Complete - Comprehensive bequest target support across all scenarios
- **Test Coverage**: ✅ 200+ tests passing, including age-band depletion and chart marker validation

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
