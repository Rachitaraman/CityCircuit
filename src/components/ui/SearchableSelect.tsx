import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const searchableSelectVariants = cva(
  'flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-secondary-500 focus:border-secondary-500 focus:ring-secondary-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof searchableSelectVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SearchableSelectOption[];
  onSelect: (option: SearchableSelectOption | null) => void;
  selectedValue?: string;
  leftIcon?: React.ReactNode;
}

const SearchableSelect = React.forwardRef<HTMLInputElement, SearchableSelectProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    error,
    helperText,
    options,
    onSelect,
    selectedValue,
    leftIcon,
    placeholder = "Search...",
    id,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayValue, setDisplayValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const selectId = id || `searchable-select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const selectVariant = hasError ? 'error' : variant;

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.subtitle && option.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Update display value when selectedValue changes
    useEffect(() => {
      if (selectedValue) {
        const selectedOption = options.find(option => option.value === selectedValue);
        if (selectedOption) {
          setDisplayValue(selectedOption.label);
          setSearchTerm(selectedOption.label);
        }
      } else {
        setDisplayValue('');
        setSearchTerm('');
      }
    }, [selectedValue, options]);

    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          // Reset search term to display value when closing
          setSearchTerm(displayValue);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [displayValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      setIsOpen(true);
      
      // If input is cleared, clear selection
      if (!value) {
        setDisplayValue('');
        onSelect(null);
      }
    };

    const handleOptionSelect = (option: SearchableSelectOption) => {
      setDisplayValue(option.label);
      setSearchTerm(option.label);
      setIsOpen(false);
      onSelect(option);
      inputRef.current?.blur();
    };

    const handleInputFocus = () => {
      setIsOpen(true);
      // Clear search term when focusing to allow easy searching
      if (searchTerm === displayValue) {
        setSearchTerm('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm(displayValue);
        inputRef.current?.blur();
      } else if (e.key === 'Enter' && filteredOptions.length === 1) {
        e.preventDefault();
        handleOptionSelect(filteredOptions[0]);
      }
    };

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <div className="relative">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {leftIcon}
              </div>
            )}
            <input
              ref={inputRef}
              id={selectId}
              type="text"
              className={searchableSelectVariants({ 
                variant: selectVariant, 
                size, 
                className: `${leftIcon ? 'pl-10' : ''} pr-8 ${className || ''}` 
              })}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-invalid={hasError}
              aria-describedby={
                error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
              }
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls={`${selectId}-listbox`}
              role="combobox"
              {...props}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className={`h-4 w-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          
          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">
                  No options found
                </div>
              ) : (
                <ul id={`${selectId}-listbox`} role="listbox" className="py-1">
                  {filteredOptions.map((option) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={option.value === selectedValue}
                      className={`px-3 py-2 cursor-pointer hover:bg-primary-50 hover:text-primary-700 ${
                        option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        option.value === selectedValue ? 'bg-primary-100 text-primary-700' : 'text-neutral-900'
                      }`}
                      onClick={() => !option.disabled && handleOptionSelect(option)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{option.label}</span>
                        {option.subtitle && (
                          <span className="text-xs text-neutral-500">{option.subtitle}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-neutral-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';

export { SearchableSelect, searchableSelectVariants };