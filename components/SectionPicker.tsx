// ============================================================
// SectionPicker — Free section selection during loading screen
// Shown while Claude is generating the reading (45-65 sec)
// Users pick 1 additional free section from 6 options
// ============================================================

'use client';

import React, { useState } from 'react';
import { FREE_PICKABLE } from '@/types/reading';
import { SECTION_ICONS } from '@/lib/utils/constants';
import { TR, type Lang } from '@/lib/utils/translations';
import { SECTION_DESCRIPTIONS } from '@/lib/utils/constants';

interface SectionPickerProps {
  language: Lang;
  onSelect: (sectionKey: string) => void;
  disabled?: boolean;
}

export default function SectionPicker({
  language,
  onSelect,
  disabled = false,
}: SectionPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const labels = TR.sectionPicker[language];
  const descriptions = SECTION_DESCRIPTIONS[language];

  const handleConfirm = () => {
    if (selected && !confirmed) {
      setConfirmed(true);
      onSelect(selected);
    }
  };

  if (confirmed) {
    return (
      <div className="section-picker section-picker--confirmed">
        <div className="picker-check">&#10003;</div>
        <p className="picker-confirmed-text">
          {language === 'ka'
            ? `${labels[selected as keyof typeof labels] || selected} — არჩეულია`
            : `${labels[selected as keyof typeof labels] || selected} — selected`}
        </p>
      </div>
    );
  }

  return (
    <div className="section-picker">
      <h3 className="picker-title">{labels.title}</h3>
      <p className="picker-subtitle">{labels.subtitle}</p>

      <div className="picker-grid">
        {FREE_PICKABLE.map((key) => {
          const label = labels[key as keyof typeof labels] || key;
          const desc = descriptions[key as keyof typeof descriptions] || '';
          const isSelected = selected === key;

          return (
            <button
              key={key}
              className={`picker-option ${isSelected ? 'selected' : ''}`}
              onClick={() => !disabled && setSelected(key)}
              disabled={disabled}
              aria-pressed={isSelected}
            >
              <div className="picker-option__header">
                <svg className="picker-option__icon" width="20" height="20">
                  <use href={`#${SECTION_ICONS[key]}`} />
                </svg>
                <span className="picker-option__label">{label}</span>
              </div>
              <p className="picker-option__desc">{desc}</p>
            </button>
          );
        })}
      </div>

      <button
        className="picker-confirm"
        onClick={handleConfirm}
        disabled={!selected || disabled}
      >
        {labels.confirm}
      </button>
    </div>
  );
}
