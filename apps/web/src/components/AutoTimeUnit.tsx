import { FormatNumber, type FormatNumberProps } from "@yamada-ui/react";

type RejectAll<T> = { [P in keyof T]?: never };
type OnlyOneOf<T> = {
  [P in keyof T]: RejectAll<Omit<T, P>> & Required<Pick<T, P>>;
}[keyof T];

//TODO: いつか実装する const timeUnit = ["millisecond", "second", "minute", "hour", "day", "week", "month", "year"] as const;
const timeUnit = ["millisecond"];

export type TimeUnit = (typeof timeUnit)[number];

export type AutoTimeUnitProps = {
  /**
   * いつか実装する
   * @default year
   */
  maxTimeUnit?: TimeUnit;
  /**
   * いつか実装する
   * @default millisecond
   */
  minTimeUnit?: TimeUnit;
} & Omit<FormatNumberProps, "value"> &
  OnlyOneOf<Record<TimeUnit, number>>;

export default function AutoTimeUnit({
  maxTimeUnit = "year",
  minTimeUnit = "millisecond",
  ...props
}: AutoTimeUnitProps) {
  const units = [
    { value: 1, unit: "millisecond" },
    { value: 1000, unit: "second" },
    { value: 60, unit: "minute" },
    { value: 60, unit: "hour" },
    { value: 24, unit: "day" },
    { value: 30, unit: "month" },
    { value: 12, unit: "year" },
  ];

  let value = props.millisecond;
  let unit = "millisecond";

  for (const { value: unitValue, unit: unitLabel } of units) {
    if (value < unitValue) {
      break;
    }
    value /= unitValue;
    unit = unitLabel;
  }

  return <FormatNumber {...props} value={value} style="unit" unit={unit} />;
}
