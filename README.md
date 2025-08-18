# 🇦🇺 Australian FIRE Calculator

A comprehensive React-based calculator for Australians pursuing Financial Independence, Retire Early (FIRE). This tool helps you determine if you can retire at your target age using accurate Australian tax calculations and superannuation modeling.

![Screenshot Placeholder](./screenshot.png)

## Features

### Core Calculator
- **Australian Tax Calculations**: Uses 2024-25 tax brackets including Medicare Levy and Surcharge
- **HECS/HELP Debt**: Comprehensive repayment calculation with 2024-25 thresholds
- **Superannuation Modeling**: 12% employer super contributions with $260,280 cap
- **Advanced Assumptions Panel**: Customizable returns, fees, withdrawal rates, and inflation
- **Die with Zero Mode**: Compare conservative 4% rule vs spend-to-zero strategies

### Investment Assumptions
- **Expected Returns**: Adjustable 4-12% with helpful tooltips (ASX200 ~10%, Global ~8%)
- **Investment Fees**: 0-2% range (ETFs ~0.2%, Industry Super ~0.8%, Retail ~1.5%)
- **Withdrawal Rates**: 2.5-5% safe withdrawal rate (Trinity Study guidance)
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
- **Modern CSS** - Inline styles with gradient design elements

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

### Retirement Planning
- **FIRE Number**: Annual expenses × (100 ÷ withdrawal rate)
- **Withdrawal Strategy**: User-configurable safe withdrawal rate (2.5-5%)
- **Die with Zero**: Annuity calculation to spend all wealth by life expectancy
- **Super Access**: Preservation age rules (can't access before 60)

## Future Enhancements

- [x] ~~Multiple investment return scenarios~~ ✅ (Preset scenarios implemented)
- [x] ~~Inflation adjustment options~~ ✅ (Real vs nominal returns)
- [x] ~~Different withdrawal rate strategies~~ ✅ (2.5-5% configurable)
- [x] ~~Save/load scenarios~~ ✅ (localStorage + URL sharing)
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
