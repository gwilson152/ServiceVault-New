"use client";

import React, { useState, useMemo, ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Filter, X, TreePine } from "lucide-react";

// Base interface for hierarchical items
export interface HierarchicalItem {
  id: string;
  name: string;
  parentId?: string | null;
}

// Extended interface with computed hierarchical properties
export interface HierarchicalItemWithMeta<T extends HierarchicalItem> extends T {
  depth: number;
  children: HierarchicalItemWithMeta<T>[];
  path: string;
  displayName: string;
}

// Configuration interfaces
export interface ItemDisplayConfig<T extends HierarchicalItem> {
  getIcon?: (item: T) => ReactNode;
  getBadge?: (item: T) => { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  getGroup?: (item: T) => string;
  getSearchableText?: (item: T) => string[];
}

export interface FilterConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  getValue: (item: HierarchicalItem) => string;
}

export interface HierarchicalSelectorProps<T extends HierarchicalItem> {
  items: T[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  displayConfig?: ItemDisplayConfig<T>;
  filterConfigs?: FilterConfig[];
  enableGrouping?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function HierarchicalSelector<T extends HierarchicalItem>({
  items,
  value,
  onValueChange,
  placeholder = "Select an item",
  displayConfig = {},
  filterConfigs = [],
  enableGrouping = true,
  enableSearch = true,
  enableFilters = false,
  allowClear = false,
  searchPlaceholder = "Search items...",
  emptyMessage = "No items found",
  className = ""
}: HierarchicalSelectorProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Default display configuration
  const {
    getIcon = () => null,
    getBadge = () => ({ text: "", variant: "default" as const }),
    getGroup = (item) => item.constructor.name,
    getSearchableText = (item) => [item.name]
  } = displayConfig;

  // Build hierarchical structure
  const itemHierarchy = useMemo(() => {
    const rootItems = items.filter(item => !item.parentId);
    
    const buildTree = (item: T, depth = 0): HierarchicalItemWithMeta<T> => {
      const children = items.filter(child => child.parentId === item.id);
      return {
        ...item,
        depth,
        children: children.map(child => buildTree(child, depth + 1)),
        path: "", // Will be set in flattening
        displayName: item.name
      };
    };

    return rootItems.map(item => buildTree(item));
  }, [items]);

  // Flatten hierarchy for display with proper paths
  const flattenedItems = useMemo(() => {
    const flattened: HierarchicalItemWithMeta<T>[] = [];
    
    const flatten = (items: HierarchicalItemWithMeta<T>[], parentPath = "") => {
      items.forEach(item => {
        const path = parentPath ? `${parentPath} > ${item.name}` : item.name;
        const itemWithPath = {
          ...item,
          path,
          displayName: item.name,
        };
        flattened.push(itemWithPath);
        
        if (item.children && item.children.length > 0) {
          flatten(item.children, path);
        }
      });
    };
    
    flatten(itemHierarchy);
    return flattened;
  }, [itemHierarchy]);

  // Filter items based on search query and active filters
  const filteredItems = useMemo(() => {
    let filtered = flattenedItems;
    
    // Apply search query filter
    if (enableSearch && searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableTexts = getSearchableText(item);
        return searchableTexts.some(text => 
          text.toLowerCase().includes(query)
        ) || item.path.toLowerCase().includes(query);
      });
    }
    
    // Apply active filters
    if (enableFilters && activeFilters.size > 0) {
      filtered = filtered.filter(item => {
        return filterConfigs.some(config => {
          const filterValue = config.getValue(item);
          return activeFilters.has(`${config.key}:${filterValue}`);
        });
      });
    }
    
    return filtered;
  }, [flattenedItems, searchQuery, activeFilters, enableSearch, enableFilters, getSearchableText, filterConfigs]);

  // Group items by specified grouping function
  const groupedItems = useMemo(() => {
    if (!enableGrouping) {
      return { default: filteredItems };
    }
    
    const groups: Record<string, HierarchicalItemWithMeta<T>[]> = {};
    
    filteredItems.forEach(item => {
      const groupKey = getGroup(item);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return groups;
  }, [filteredItems, enableGrouping, getGroup]);

  const toggleFilter = (filterKey: string, filterValue: string) => {
    const filterIdentifier = `${filterKey}:${filterValue}`;
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterIdentifier)) {
      newFilters.delete(filterIdentifier);
    } else {
      newFilters.add(filterIdentifier);
    }
    setActiveFilters(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters(new Set());
    setSearchQuery("");
  };

  const selectedItem = items.find(item => item.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} open={isOpen} onOpenChange={setIsOpen}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={placeholder}>
          {selectedItem && (
            <div className="flex items-center gap-2">
              {getIcon(selectedItem)}
              <span>{selectedItem.name}</span>
              {selectedItem.parentId && (
                <span className="text-muted-foreground text-xs">
                  ({items.find(p => p.id === selectedItem.parentId)?.name})
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {(enableSearch || enableFilters) && (
          <div className="sticky top-0 bg-background p-2 border-b space-y-2">
            {enableSearch && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-8 h-9 ${(enableFilters || allowClear) ? 'pr-20' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {(enableFilters || allowClear) && (
                  <div className="absolute right-1 top-1 flex gap-1">
                    {enableFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFilters(!showFilters);
                        }}
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    )}
                    {allowClear && value && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onValueChange("");
                        }}
                        title="Clear selection"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {enableFilters && (searchQuery || activeFilters.size > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllFilters();
                        }}
                        title="Clear filters"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {enableFilters && showFilters && (
              <div className="flex flex-wrap gap-1">
                {filterConfigs.map(config => {
                  // Get unique values for this filter
                  const uniqueValues = Array.from(new Set(
                    items.map(item => config.getValue(item))
                  )).filter(Boolean);
                  
                  return uniqueValues.map(filterValue => {
                    const filterIdentifier = `${config.key}:${filterValue}`;
                    return (
                      <Button
                        key={filterIdentifier}
                        variant={activeFilters.has(filterIdentifier) ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFilter(config.key, filterValue);
                        }}
                      >
                        {config.icon}
                        {filterValue}
                      </Button>
                    );
                  });
                })}
              </div>
            )}
            
            {(searchQuery || activeFilters.size > 0) && (
              <div className="text-xs text-muted-foreground">
                {filteredItems.length} of {flattenedItems.length} items
              </div>
            )}
          </div>
        )}
        
        <div className="p-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>{emptyMessage}</div>
              {(searchQuery || activeFilters.size > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : enableGrouping ? (
            Object.entries(groupedItems).map(([groupName, groupItems]) => {
              if (groupItems.length === 0) return null;
              
              return (
                <div key={groupName}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/30 sticky top-0">
                    {groupName} ({groupItems.length})
                  </div>
                  {groupItems.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {/* Hierarchy visualization */}
                        <div className="flex items-center" style={{ marginLeft: `${item.depth * 16}px` }}>
                          {item.depth > 0 && (
                            <div className="flex items-center">
                              {Array.from({ length: item.depth }).map((_, i) => (
                                <div key={i} className="w-4 flex justify-center">
                                  {i === item.depth - 1 ? (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <div className="w-px h-4 bg-border" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {getIcon(item)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.displayName}</div>
                          {item.depth > 0 && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.path.split(' > ').slice(0, -1).join(' > ')}
                            </div>
                          )}
                        </div>
                        
                        {getBadge(item).text && (
                          <Badge variant={getBadge(item).variant} className="text-xs shrink-0">
                            {getBadge(item).text}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                </div>
              );
            })
          ) : (
            filteredItems.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center" style={{ marginLeft: `${item.depth * 16}px` }}>
                    {item.depth > 0 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground mr-1" />
                    )}
                    {getIcon(item)}
                  </div>
                  <span className="flex-1">{item.displayName}</span>
                  {getBadge(item).text && (
                    <Badge variant={getBadge(item).variant} className="text-xs">
                      {getBadge(item).text}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}