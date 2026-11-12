"use client";

import { pollinationsImageModels } from "@/lib/pollinations-image-models";

export function ImageModelSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="image-model-selector">
      <label>
        Model
        <select
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {pollinationsImageModels.map((model) => (
            <option key={model.name} value={model.name}>{model.title}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
