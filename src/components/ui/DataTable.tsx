"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Search, Filter, MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Dropdown } from "./Dropdown";
import { Checkbox } from "./Checkbox";
import { EnhancedSkeleton, TableSkeleton } from "./Skeleton";

export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: keyof T | ((row: T) => any);
  cell?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
  compact?: boolean;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  className,
  searchable = true,
  searchPlaceholder = "Search...",
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  onRowClick,
  emptyMessage = "No data available",
  stickyHeader = false,
  compact = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Process data with search, sort, and filter
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && searchable) {
      result = result.filter((row) =>
        columns.some((column) => {
          const value = getColumnValue(row, column);
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    if (filterable) {
      Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
        if (filterValue) {
          result = result.filter((row) => {
            const column = columns.find((col) => col.key === columnKey);
            if (column) {
              const value = getColumnValue(row, column);
              return String(value).toLowerCase().includes(filterValue.toLowerCase());
            }
            return true;
          });
        }
      });
    }

    // Apply sorting
    if (sortColumn && sortDirection && sortable) {
      result.sort((a, b) => {
        const column = columns.find((col) => col.key === sortColumn);
        if (!column) return 0;

        const aValue = getColumnValue(a, column);
        const bValue = getColumnValue(b, column);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection, columnFilters, columns, searchable, sortable, filterable]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = pagination ? processedData.slice(startIndex, endIndex) : processedData;

  const getColumnValue = (row: T, column: Column<T>) => {
    if (column.accessor) {
      return typeof column.accessor === "function" ? column.accessor(row) : row[column.accessor];
    }
    return (row as any)[column.key];
  };

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(paginatedData.map((_, index) => startIndex + index));
      setSelectedRows(allIndices);
      onSelectionChange?.(paginatedData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    const globalIndex = startIndex + index;
    
    if (checked) {
      newSelected.add(globalIndex);
    } else {
      newSelected.delete(globalIndex);
    }
    
    setSelectedRows(newSelected);
    
    const selectedData = data.filter((_, i) => newSelected.has(i));
    onSelectionChange?.(selectedData);
  };

  const isAllSelected = paginatedData.length > 0 && paginatedData.every((_, index) => selectedRows.has(startIndex + index));
  const isIndeterminate = paginatedData.some((_, index) => selectedRows.has(startIndex + index)) && !isAllSelected;

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const renderCell = (row: T, column: Column<T>, rowIndex: number) => {
    const value = getColumnValue(row, column);
    
    if (column.cell) {
      return column.cell(value, row, rowIndex);
    }
    
    return String(value || "");
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {searchable && <EnhancedSkeleton height={40} />}
        <TableSkeleton rows={pageSize} columns={columns.length + (selectable ? 1 : 0)} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {filterable && (
            <div className="flex gap-2">
              {columns
                .filter((column) => column.filterable)
                .map((column) => (
                  <div key={column.key} className="min-w-[150px]">
                    <Input
                      placeholder={`Filter ${column.header}`}
                      value={columnFilters[column.key] || ""}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [column.key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-auto border rounded-lg">
        <table className="w-full">
          <thead className={cn("bg-muted/50", stickyHeader && "sticky top-0 z-10")}>
            <tr>
              {selectable && (
                <th className={cn("w-12 px-4 py-3", compact && "py-2")}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-sm",
                    compact && "py-2",
                    column.sortable && sortable && "cursor-pointer hover:bg-muted transition-colors",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && sortable && (
                      <div className="h-4 w-4 flex items-center justify-center">
                        {getSortIcon(column.key) || (
                          <div className="opacity-0 group-hover:opacity-50">
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-t hover:bg-muted/30 transition-colors",
                    onRowClick && "cursor-pointer",
                    selectedRows.has(startIndex + index) && "bg-muted/50"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selectable && (
                    <td className={cn("px-4 py-3", compact && "py-2")}>
                      <Checkbox
                        checked={selectedRows.has(startIndex + index)}
                        onChange={(checked) => handleSelectRow(index, checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm",
                        compact && "py-2",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                    >
                      {renderCell(row, column, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, processedData.length)} of{" "}
            {processedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNumber = currentPage <= 3 
                  ? i + 1 
                  : currentPage >= totalPages - 2
                    ? totalPages - 4 + i
                    : currentPage - 2 + i;
                    
                if (pageNumber < 1 || pageNumber > totalPages) return null;
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
