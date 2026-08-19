import type { ReactElement, ReactNode } from "react";
import { cx } from "./cx";
import styles from "./DisplayTitle.module.scss";

type DisplayTitleAs = "h1" | "h2";
type DisplayTitleTone = "logo" | "heading" | "section";

interface DisplayTitleProps {
  as?: DisplayTitleAs;
  tone?: DisplayTitleTone;
  className?: string;
  children: ReactNode;
}

export function DisplayTitle({
  as: Tag = "h1",
  tone = "heading",
  className,
  children,
}: DisplayTitleProps): ReactElement {
  return <Tag className={cx(styles[tone], className)}>{children}</Tag>;
}
