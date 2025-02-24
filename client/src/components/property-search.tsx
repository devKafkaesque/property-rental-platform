import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { PropertyCategory } from "@shared/schema";

interface PropertySearchProps {
  onSearch: (query: string, category: PropertyCategory | "all") => void;
}

export default function PropertySearch({ onSearch }: PropertySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<PropertyCategory | "all">("all");

  const handleSearch = () => {
    onSearch(searchQuery, category);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search by name, address, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <Select value={category} onValueChange={(value: PropertyCategory | "all") => setCategory(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="luxury">Luxury</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="budget">Budget</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
