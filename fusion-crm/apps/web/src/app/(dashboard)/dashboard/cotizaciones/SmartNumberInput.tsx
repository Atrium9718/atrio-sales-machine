import * as React from "react";

export function SmartNumberInput({ value, onChange, className, prefix = "", min }: { value: number, onChange: (val: string) => void, className?: string, prefix?: string, min?: string }) {
  const [localVal, setLocalVal] = React.useState((value || value === 0) ? value.toLocaleString("es-CO") : "");
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) setLocalVal((value || value === 0) ? value.toLocaleString("es-CO") : "");
  }, [value, isFocused]);

  return (
    <div className="relative group w-full h-full">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{prefix}</span>}
      <input
        type="text"
        value={localVal}
        min={min}
        onChange={(e) => {
          setLocalVal(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setLocalVal((value || value === 0) ? value.toLocaleString("es-CO") : "");
        }}
        className={`${className} ${prefix ? "pl-8" : "px-3"}`}
      />
    </div>
  );
}
