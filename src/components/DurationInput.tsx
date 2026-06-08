interface DurationInputProps {
  id: string;
  label: string;
  value: number | null;
  autoLabel?: string;
  onChange: (value: number | null) => void;
}

const DurationInput = ({ id, label, value, autoLabel = 'Auto', onChange }: DurationInputProps) => (
  <label className="field" htmlFor={id}>
    <span>{label}</span>
    <div className="duration-input">
      <input
        id={id}
        min="1"
        type="number"
        value={value ?? ''}
        placeholder={autoLabel}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      />
      <button type="button" className="ghost" onClick={() => onChange(null)}>
        Auto
      </button>
    </div>
  </label>
);

export default DurationInput;
