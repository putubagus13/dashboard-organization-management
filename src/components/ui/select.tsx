import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface IOptions {
  label: string;
  value: string;
}

interface IProps {
  label?: string;
  options: IOptions[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  clearLabel?: boolean;
  error?: string;
  disable?: boolean;
}

const Select = ({
  label,
  options,
  value,
  onChange,
  className,
  placeholder,
  error,
  clearLabel = false,
  disable = false,
}: IProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownUp, setIsDropdownUp] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // CLOSE OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // AUTO POSITION
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      const spaceBelow = window.innerHeight - rect.bottom;

      const spaceAbove = rect.top;

      setIsDropdownUp(spaceBelow < 220 && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  const handleSelect = (option: IOptions) => {
    onChange?.(option.value);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onChange?.('');
  };

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder || 'Select option';

  return (
    <div className={`relative w-full ${className || ''}`} ref={dropdownRef}>
      {/* LABEL */}
      {label && <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>}

      {/* BUTTON */}
      <button
        type="button"
        ref={buttonRef}
        disabled={disable}
        onClick={() => !disable && setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-[10px] text-left transition-all duration-200 ${
          disable
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'cursor-pointer hover:border-blue-400 hover:shadow-sm'
        } ${error ? 'border-red-400' : 'border-gray-200'} ${
          isOpen && !disable ? 'border-blue-500 ring-4 ring-blue-100' : ''
        }`}
      >
        {/* TEXT */}
        <span className={`truncate pr-10 text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>{selectedLabel}</span>

        {/* ACTION */}
        <div className="absolute right-4 flex items-center gap-2">
          {clearLabel && value && !disable && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-red-100 hover:text-red-500"
            >
              <X size={12} />
            </button>
          )}

          {!disable && (
            <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* ERROR */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* DROPDOWN */}
      {!disable && isOpen && (
        <div
          className={`absolute z-50 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${
            isDropdownUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* EMPTY */}
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Search size={20} />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-600">No options found</p>

                <p className="mt-1 text-xs text-gray-400">There is no data available right now</p>
              </div>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-2">
              {options.map((option) => {
                const isSelected = value === option.value;

                return (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={`mx-2 flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                      isSelected ? 'bg-blue-50 font-semibold text-secondary' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
