"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { AddressSuggestion } from "@/lib/property/types";

interface AddressAutocompleteInputProps {
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  className?: string;
}

interface AutocompletePayload {
  suggestions: AddressSuggestion[];
  googleEnabled: boolean;
}

export function AddressAutocompleteInput({
  id,
  value,
  placeholder,
  onChange,
  onSelect,
  className,
}: AddressAutocompleteInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setHighlightIndex(-1);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      closeSuggestions();
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/address-autocomplete?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;

        const payload = (await response.json()) as AutocompletePayload;
        setSuggestions(payload.suggestions);
        setGoogleEnabled(payload.googleEnabled);
        setIsOpen(payload.suggestions.length > 0);
        setHighlightIndex(payload.suggestions.length > 0 ? 0 : -1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        closeSuggestions();
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, closeSuggestions]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeSuggestions();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeSuggestions]);

  const chooseSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.address);
    onSelect(suggestion);
    closeSuggestions();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[highlightIndex]);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightIndex >= 0
              ? `${listboxId}-option-${highlightIndex}`
              : undefined
          }
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={className}
        />
        {isLoading && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              className="h-4 w-4 animate-spin text-mercurius-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={highlightIndex === index}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
              className={[
                "cursor-pointer px-3.5 py-2.5 text-sm transition-colors",
                highlightIndex === index
                  ? "bg-mercurius-50 text-mercurius-900"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="font-medium">{suggestion.label}</div>
              {suggestion.secondaryText && (
                <div className="mt-0.5 text-xs text-slate-500">
                  {suggestion.secondaryText}
                </div>
              )}
            </li>
          ))}
          <li className="border-t border-slate-100 px-3.5 py-2 text-[10px] uppercase tracking-wide text-slate-400">
            {googleEnabled ? "Powered by Google Places" : "SWFL demo suggestions"}
          </li>
        </ul>
      )}
    </div>
  );
}