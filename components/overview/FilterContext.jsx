// /contexts/FilterContext.jsx — v2025.10Z
"use client";
import { createContext, useContext, useState } from "react";

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    kategori: [],
    status: [],
    dateStart: null,
    dateEnd: null,
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useGlobalFilter = () => useContext(FilterContext);
