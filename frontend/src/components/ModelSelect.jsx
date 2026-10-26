import { useId } from "react";

export function ModelSelect({
  models,
  value,
  onChange,
  label = "Model",
  readyOnly = false,
  disabled = false,
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {models.map((model) => (
          <option
            key={model.id}
            value={model.id}
            disabled={readyOnly && !model.ready}
          >
            {model.name} · {model.variant}
            {readyOnly && !model.ready ? " (belum siap)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
