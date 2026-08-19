import type { InputHTMLAttributes, ReactElement } from "react";
import { cx } from "./cx";
import styles from "./UiField.module.scss";

type UiFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function UiField({ className, ...props }: UiFieldProps): ReactElement {
  return <input className={cx(styles.field, className)} {...props} />;
}
