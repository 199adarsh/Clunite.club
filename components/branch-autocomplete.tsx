"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { BRANCH_CATEGORIES, ALL_BRANCHES } from "@/lib/branches";
import { Check, BookOpen, ChevronDown } from "lucide-react";

interface BranchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  leftIcon?: React.ReactNode;
  allowPartialOnBlur?: boolean;
}

export function BranchAutocomplete({
  value,
  onChange,
  placeholder = "Select or search your branch / major...",
  className = "",
  required = false,
  id,
  leftIcon,
  allowPartialOnBlur = false,
}: BranchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search query with external value prop
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  const q = searchQuery.toLowerCase().trim();

  // Filter grouped categories and flattened matching list
  const filteredCategories = BRANCH_CATEGORIES.map((cat) => {
    return {
      category: cat.category,
      branches: q
        ? cat.branches.filter((b) => b.toLowerCase().includes(q))
        : cat.branches,
    };
  }).filter((cat) => cat.branches.length > 0);

  const flatBranches = filteredCategories.flatMap((cat) => cat.branches);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleBlurValidation();
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchQuery]);

  const handleBlurValidation = () => {
    if (searchQuery.trim()) {
      const match = ALL_BRANCHES.find(
        (b) => b.toLowerCase() === searchQuery.toLowerCase()
      );
      if (match) {
        onChange(match);
        setSearchQuery(match);
      } else {
        const partial = ALL_BRANCHES.find((b) =>
          b.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (partial) {
          onChange(partial);
          setSearchQuery(partial);
        } else {
          if (allowPartialOnBlur) {
            onChange(searchQuery);
          } else {
            onChange("");
            setSearchQuery("");
          }
        }
      }
    } else {
      onChange("");
    }
  };

  const handleSelect = (branch: string) => {
    onChange(branch);
    setSearchQuery(branch);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) =>
        prev < flatBranches.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < flatBranches.length) {
        e.preventDefault();
        handleSelect(flatBranches[activeIndex]);
      } else {
        handleBlurValidation();
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {leftIcon || (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
            <BookOpen className="h-4 w-4" />
          </div>
        )}
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          required={required}
          className={`${className} pl-10 pr-9`}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && filteredCategories.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto py-1.5 animate-in fade-in-50 zoom-in-95 duration-100">
          {filteredCategories.map((cat) => (
            <div key={cat.category} className="py-1">
              <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 sticky top-0 border-y border-slate-100/80">
                {cat.category}
              </div>
              {cat.branches.map((branch) => {
                const isSelected = value === branch;
                const flatIndex = flatBranches.indexOf(branch);
                const isActive = flatIndex === activeIndex;

                return (
                  <div
                    key={branch}
                    onClick={() => handleSelect(branch)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    className={`flex items-center justify-between px-3.5 py-2 text-xs transition-colors cursor-pointer text-left ${
                      isActive || isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate pr-2">{branch}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isOpen && q && filteredCategories.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center text-xs text-slate-500 animate-in fade-in duration-200">
          No matching branches found. Please pick from the list.
        </div>
      )}
    </div>
  );
}
