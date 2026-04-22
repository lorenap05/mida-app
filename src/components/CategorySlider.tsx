import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Pencil, Check } from "lucide-react";

interface CategorySliderProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

const CategorySlider = ({ label, value, max, onChange }: CategorySliderProps) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(String(value));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing]);

  const commitEdit = () => {
    const num = parseInt(editValue.replace(/\D/g, ""), 10);
    if (!isNaN(num) && num >= 0) {
      onChange(Math.min(num, max));
    }
    setEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="h-7 w-24 text-sm text-right tabular-nums"
                inputMode="numeric"
              />
              <button
                onClick={commitEdit}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                ${value.toLocaleString("en-US")}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        max={max}
        step={50}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
};

export default CategorySlider;
