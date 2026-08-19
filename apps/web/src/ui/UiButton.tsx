import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cx } from "./cx";
import styles from "./UiButton.module.scss";

export type UiButtonVariant = "cta" | "add" | "chip" | "icon";

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UiButtonVariant;
}

export function UiButton({
  variant = "cta",
  className,
  type = "button",
  disabled = false,
  ...props
}: UiButtonProps): ReactElement {
  return (
    <button
      {...props}
      type={type}
      className={cx(styles[variant], className)}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    />
  );
}
