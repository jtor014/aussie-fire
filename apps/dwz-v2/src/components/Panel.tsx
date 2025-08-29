import React from 'react';
import InfoChips from './InfoChips';
import InfoTip from './InfoTip';

export default function Panel({
  title,
  subtitle,
  definition,
  chips,
  help,
  children,
  className = '',
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional muted definition/help block shown below subtitle */
  definition?: React.ReactNode;
  /** Compact badges shown under the header */
  chips?: string[];
  /** Extra help content rendered in a tiny disclosure ("Learn more") */
  help?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const sectionStyle: React.CSSProperties = {
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
    padding: 16,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: '1px solid #F3F4F6',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
    letterSpacing: '0.025em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  };

  const definitionStyle: React.CSSProperties = {
    marginTop: 8,
    fontSize: 12,
    color: '#374151',
    background: 'rgba(249, 250, 251, 0.8)',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    padding: '6px 8px',
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  };

  return (
    <section style={{ ...sectionStyle, ...className }} className={typeof className === 'string' ? className : ''}>
      <header style={headerStyle}>
        <div style={titleStyle}>{title}</div>
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
        {definition && (
          <div style={definitionStyle}>
            {definition}
          </div>
        )}
        {chips && chips.length > 0 && <InfoChips items={chips} />}
        {help && <InfoTip>{help}</InfoTip>}
      </header>
      <div style={contentStyle}>
        {children}
      </div>
    </section>
  );
}