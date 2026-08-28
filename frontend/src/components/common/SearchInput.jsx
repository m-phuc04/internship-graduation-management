import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchInput = ({
  value: initialValue = '',
  onChange,
  placeholder = 'Tìm kiếm...',
  debounceTime = 300,
  className = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);
  const lastEmittedValue = useRef(initialValue);

  // Keep latest onChange callback in ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync internal state when initialValue changes from parent
  useEffect(() => {
    setValue(initialValue);
    lastEmittedValue.current = initialValue;
  }, [initialValue]);

  // Debounce only when value changes and differs from last emitted value
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (value === lastEmittedValue.current) {
      return;
    }

    const handler = setTimeout(() => {
      lastEmittedValue.current = value;
      if (onChangeRef.current) {
        onChangeRef.current(value);
      }
    }, debounceTime);

    return () => {
      clearTimeout(handler);
    };
  }, [value, debounceTime]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            lastEmittedValue.current = '';
            if (onChangeRef.current) {
              onChangeRef.current('');
            }
          }}
          className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
