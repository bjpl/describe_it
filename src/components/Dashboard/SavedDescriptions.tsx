"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingOverlay, TextSkeleton } from "@/components/ui/LoadingStates";
import { supabase, DatabaseService } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Search, Heart, Calendar, Image, Filter, Download, Share2 } from "lucide-react";
import type { DescriptionRecord } from "@/types/database";

interface SavedDescriptionsProps {
  className?: string;
  limit?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  userId?: string;
}

interface SavedDescription extends DescriptionRecord {
  isFavorite?: boolean;
  tags?: string[];
}

const DESCRIPTION_STYLES = [
  { value: "narrativo", label: "Narrative", color: "bg-blue-100 text-blue-800" },
  { value: "poetico", label: "Poetic", color: "bg-purple-100 text-purple-800" },
  { value: "academico", label: "Academic", color: "bg-green-100 text-green-800" },
  { value: "conversacional", label: "Conversational", color: "bg-yellow-100 text-yellow-800" },
  { value: "infantil", label: "Child-friendly", color: "bg-pink-100 text-pink-800" },
];

export function SavedDescriptions({
  className,
  limit = 20,
  showSearch = true,
  showFilters = true,
  userId
}: SavedDescriptionsProps) {
  const [descriptions, setDescriptions] = useState<SavedDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "favorites">("newest");

  // Fetch saved descriptions
  useEffect(() => {
    fetchDescriptions();
  }, [userId, limit]);

  const fetchDescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await DatabaseService.getSavedDescriptions(userId, limit);
      
      // Transform data to include additional UI properties
      const transformedData: SavedDescription[] = data.map(desc => ({
        ...desc,
        isFavorite: false, // This would come from your database
        tags: [] // Extract tags from description or metadata
      }));
      
      setDescriptions(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch descriptions";
      setError(errorMessage);
      console.error("Error fetching descriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search descriptions
  const filteredDescriptions = useMemo(() => {
    let filtered = descriptions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(desc => 
        desc.description_english?.toLowerCase().includes(term) ||
        desc.description_spanish?.toLowerCase().includes(term) ||
        desc.description_style?.toLowerCase().includes(term)
      );
    }

    // Style filter
    if (selectedStyle) {
      filtered = filtered.filter(desc => desc.description_style === selectedStyle);
    }

    // Favorites filter
    if (favoriteOnly) {
      filtered = filtered.filter(desc => desc.isFavorite);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "favorites":
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [descriptions, searchTerm, selectedStyle, favoriteOnly, sortBy]);

  const toggleFavorite = async (descriptionId: string) => {
    try {
      const description = descriptions.find(d => d.id === descriptionId);
      if (!description) return;

      const newFavoriteStatus = !description.isFavorite;
      await DatabaseService.toggleFavoriteDescription(descriptionId, newFavoriteStatus);
      
      setDescriptions(prev => prev.map(desc => 
        desc.id === descriptionId 
          ? { ...desc, isFavorite: newFavoriteStatus }
          : desc
      ));
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const exportDescription = (description: SavedDescription) => {
    const content = {
      id: description.id,
      english: description.description_english,
      spanish: description.description_spanish,
      style: description.description_style,
      createdAt: description.created_at,
      imageUrl: description.image_url
    };
    
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `description-${description.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center p-8 border rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive mb-2">Failed to load descriptions</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDescriptions} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={favoriteOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavoriteOnly(!favoriteOnly)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </Button>
              
              {DESCRIPTION_STYLES.map((style) => (
                <Button
                  key={style.value}
                  variant={selectedStyle === style.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStyle(
                    selectedStyle === style.value ? null : style.value
                  )}
                >
                  {style.label}
                </Button>
              ))}
              
              <select
                className="px-3 py-1 text-sm border rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="favorites">Favorites First</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredDescriptions.length} of {descriptions.length} descriptions
      </div>

      {/* Descriptions list */}
      <LoadingOverlay isLoading={loading}>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <TextSkeleton lines={4} />
              </Card>
            ))}
          </div>
        ) : filteredDescriptions.length === 0 ? (
          <div className="text-center p-8 border rounded-lg">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {searchTerm || selectedStyle || favoriteOnly
                ? "No descriptions match your filters"
                : "No saved descriptions yet"
              }
            </p>
            {(searchTerm || selectedStyle || favoriteOnly) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStyle(null);
                  setFavoriteOnly(false);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDescriptions.map((description) => {
              const styleConfig = DESCRIPTION_STYLES.find(s => s.value === description.description_style);
              
              return (
                <Card key={description.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {styleConfig && (
                            <Badge className={cn("text-xs", styleConfig.color)}>
                              {styleConfig.label}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(description.created_at || '').toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(description.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4",
                              description.isFavorite 
                                ? "fill-red-500 text-red-500" 
                                : "text-muted-foreground"
                            )} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportDescription(description)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* English description */}
                      {description.description_english && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">English</h4>
                          <p className="text-sm leading-relaxed">{description.description_english}</p>
                        </div>
                      )}
                      
                      {/* Spanish description */}
                      {description.description_spanish && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Spanish</h4>
                          <p className="text-sm leading-relaxed">{description.description_spanish}</p>
                        </div>
                      )}
                      
                      {/* Image preview */}
                      {description.image_url && (
                        <div className="pt-2">
                          <img
                            src={description.image_url}
                            alt="Description subject"
                            className="w-full h-32 object-cover rounded-md border"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </LoadingOverlay>

      {/* Load more button */}
      {!loading && filteredDescriptions.length >= limit && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => fetchDescriptions()}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

export default SavedDescriptions;
