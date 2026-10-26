import { className } from "../api.js";

export function Label({ value }) {
  return <span className={`class-label ${value}`}>{className(value)}</span>;
}
