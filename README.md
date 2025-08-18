# 🇦🇺 Australian FIRE Calculator

A comprehensive React-based calculator for Australians pursuing Financial Independence, Retire Early (FIRE). This tool helps you determine if you can retire at your target age using accurate Australian tax calculations and superannuation modeling.

![Screenshot Placeholder](./screenshot.png)

## Features

- **Australian Tax Calculations**: Uses 2024-25 tax brackets for accurate after-tax income projections
- **Superannuation Modeling**: Includes 11.5% employer super contributions and separate growth tracking
- **Wealth Projection**: Interactive chart showing wealth growth from current age to 90
- **4% Rule Validation**: Checks if your projected wealth supports your retirement expenses
- **Real-time Updates**: All calculations update instantly as you adjust parameters
- **Visual Analytics**: Three-line chart showing Outside Super, Super Balance, and Total Wealth
- **Retirement Markers**: Visual indicators for retirement age and FIRE number targets

## How to Run Locally

1. Clone the repository
```bash
git clone <repository-url>
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

- **Savings Rate**: (After-tax income - Expenses) / After-tax income
- **Tax Calculation**: Australian progressive tax brackets 2024-25
- **Wealth Growth**: 7% annual return assumption
- **Super Contributions**: 11.5% of pre-tax income
- **FIRE Number**: Annual expenses × 25 (4% withdrawal rule)

## Future Enhancements

- [ ] Multiple investment return scenarios
- [ ] Inflation adjustment options
- [ ] Different withdrawal rate strategies
- [ ] Capital gains tax considerations
- [ ] Franking credits modeling
- [ ] Part-time work transition planning
- [ ] Healthcare and insurance cost planning
- [ ] Export results to PDF
- [ ] Save/load scenarios
- [ ] Comparison with different retirement ages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
