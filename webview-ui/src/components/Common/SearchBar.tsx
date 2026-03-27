import React, { useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
      <input
        type="text"
        className="input-field w-full pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          onClick={() => onChange('')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
