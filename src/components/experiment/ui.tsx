import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  OptionHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?:
    "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      className={`ui-input ${className}`.trim()}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`ui-label ${className}`.trim()} {...props} />;
}

export function NativeSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span
      data-slot="native-select-wrapper"
      className={`ui-select ${className}`.trim()}
    >
      <select data-slot="native-select" {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

export function NativeSelectOption(
  props: OptionHTMLAttributes<HTMLOptionElement>,
) {
  return <option {...props} />;
}
