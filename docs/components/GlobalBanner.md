# GlobalBanner Component Documentation

## Overview

The `GlobalBanner` component provides prominent, real-time retirement status feedback displayed directly under the page title in the Australian FIRE Calculator. This component was introduced in T-010 as part of the DWZ-only mode transformation to give users immediate visibility into their retirement viability.

## Location

`src/components/GlobalBanner.jsx`

## Purpose

- Display retirement viability status prominently to users
- Show sustainable spending calculations based on Die-With-Zero methodology  
- Provide mode-specific messaging for earliest vs pinned planning approaches
- Give immediate feedback on whether retirement goals are achievable

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `decision` | `Object` | Yes | Decision object from `decisionFromState` selector |
| `dwzPlanningMode` | `String` | Yes | Planning mode: `'earliest'` or `'pinned'` |

### Decision Object Structure

The `decision` prop should contain:

```javascript
{
  canRetireAtTarget: boolean,     // Whether retirement at target age is viable
  targetAge: number,              // Target retirement age based on planning mode  
  earliestFireAge: number,        // Earliest possible FIRE age (if achievable)
  kpis: {
    S_pre: number,                // Sustainable spending before super access
    S_post: number,               // Sustainable spending after super access
    planSpend: number,            // Overall planned spending amount
    constraint: {                 // T-021: Binding constraint analysis
      type: string,               // 'bridge' or 'horizon'
      atAge: number,              // Age where constraint binds (60 for bridge, lifeExpectancy for horizon)
      sBridgeMax: number,         // Maximum bridge-sustainable spending
      sTotalMax: number,          // Maximum total-sustainable spending  
      epsilon: number             // Tolerance for constraint classification
    },
    bridgeAssessment: {           // T-021: Unified bridge assessment
      neededPV: number,           // Present value of bridge spending needed
      havePV: number,             // Present value of outside wealth available
      years: number,              // Bridge period length (preservationAge - targetAge)
      covered: boolean            // Whether bridge period is funded
    }
  },
  dwzPlanningMode: string         // Planning mode from decision logic
}
```

## Usage

```jsx
import { GlobalBanner } from './components/GlobalBanner.jsx';

// In your main component
<GlobalBanner 
  decision={decision} 
  dwzPlanningMode={dwzPlanningMode} 
/>
```

## Display Logic

### Earliest Planning Mode

When `dwzPlanningMode === 'earliest'`:

**Viable Retirement:**
- ✅ Message: "🎯 You can retire at age {targetAge} with Die-With-Zero"
- Shows sustainable spending (stepped if pre/post-super differ by >$1000)

**Non-Viable Retirement:**
- ❌ Message: "Cannot achieve retirement with current settings"
- Suggests adjustments or shows earliest achievable age if available

### Pinned Planning Mode  

When `dwzPlanningMode === 'pinned'`:

**On Track:**
- ✅ Message: "On track to retire at age {targetAge}"
- Shows years saved if earliest age is significantly earlier than target

**Behind Track:**
- ❌ Message: "Cannot retire at age {targetAge}"
- Shows earliest possible age if achievable

## Styling

The component uses inline styles with:

- **Success State**: Green background (`#dcfce7`), green border (`#16a34a`), dark green text (`#166534`)
- **Warning State**: Yellow background (`#fef3c7`), orange border (`#f59e0b`), dark orange text (`#92400e`)
- **Typography**: 16px main message, 14px detail message
- **Spacing**: 16px padding, 20px margin-bottom, 8px border radius

## Integration

The GlobalBanner integrates with:

1. **Decision Selector** (`src/selectors/decision.js`) - Provides unified decision object with bridge assessment
2. **Age-Band Solver** (`src/core/dwz_age_band.js`) - Uses constraint classification for display logic  
3. **Main Calculator** (`src/AustralianFireCalculator.jsx`) - Supplies planning mode state
4. **Bridge Engine** (`src/core/bridge.js`) - Accesses unified bridge assessment for constraint messaging

## T-021: Bridge Constraint Display

The GlobalBanner now shows constraint-specific messaging based on the unified bridge assessment:

### Bridge-Limited Display
```
🎯 You can retire at age 45 with Die-With-Zero
Earliest age is bridge-limited: outside savings are the bottleneck until super unlock at age 60.
```

### Horizon-Limited Display  
```
🎯 You can retire at age 45 with Die-With-Zero
Earliest age is horizon-limited: total horizon/bequest is the bottleneck (life expectancy 85).
```

This ensures the banner and bridge chip show consistent information - no more contradictory "horizon-limited" banner with "Short" bridge chip.

## Examples

### Earliest Mode - Viable
```
🎯 You can retire at age 45 with Die-With-Zero
Sustainable spending: $65,000/yr before super, $72,000/yr after
```

### Pinned Mode - Behind Track
```  
❌ Cannot retire at age 50
Earliest possible today: Age 52
```

### Stepped vs Uniform Spending

The component intelligently displays spending information:

- **Stepped**: Shows separate pre/post-super amounts if they differ by >$1000
- **Uniform**: Shows single sustainable spending amount if phases are similar

## Testing

The component handles:
- Null decision objects gracefully (returns null)
- Missing KPI data with fallback values  
- Both earliest and pinned planning modes
- Various retirement viability scenarios

## Future Enhancements

Potential improvements:
- Animation transitions between states
- Progress indicators for goals  
- Customizable styling themes
- Accessibility improvements (ARIA labels, screen reader support)