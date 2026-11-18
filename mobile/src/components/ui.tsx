import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native'
import { colors, font, radius, spacing, type } from '../theme'

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>
}

export function Body({ children, muted = true, style }: { children: ReactNode; muted?: boolean; style?: any }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>
}

export function Money({
  amount,
  size = 20,
  tone,
}: {
  amount: string
  size?: number
  tone?: 'ink' | 'credit' | 'debit' | 'muted'
}) {
  return (
    <Text
      style={{
        fontFamily: font.medium,
        fontSize: size,
        letterSpacing: -0.6,
        color: colors[tone ?? 'ink'],
        fontVariant: ['tabular-nums'],
      }}
    >
      {amount}
    </Text>
  )
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  )
}

export function Divider({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.divider, style]} />
}

export function Button({
  title,
  onPress,
  variant = 'ink',
  loading = false,
  disabled = false,
}: {
  title: string
  onPress?: () => void
  variant?: 'ink' | 'outline' | 'quiet' | 'accent'
  loading?: boolean
  disabled?: boolean
}) {
  const palette = {
    ink: { backgroundColor: colors.ink, borderColor: colors.ink, color: colors.white },
    accent: { backgroundColor: colors.accent, borderColor: colors.accent, color: colors.white },
    outline: { backgroundColor: colors.surface, borderColor: colors.ruleStrong, color: colors.ink },
    quiet: { backgroundColor: 'transparent', borderColor: 'transparent', color: colors.muted },
  }[variant]

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.99 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: palette.color }]}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

export function Input(props: TextInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      onFocus={(e) => {
        setFocused(true)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        props.onBlur?.(e)
      }}
      style={[
        styles.input,
        focused && { borderColor: colors.accent, backgroundColor: colors.paper },
        props.style as any,
      ]}
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'ink' | 'credit' | 'warn' | 'debit' | 'outline' | 'accent'
}) {
  const palette = {
    neutral: { backgroundColor: colors.paper2, color: colors.ink2, borderColor: 'transparent' },
    ink: { backgroundColor: colors.ink, color: colors.white, borderColor: colors.ink },
    accent: { backgroundColor: colors.accentWash, color: colors.accent, borderColor: colors.accent },
    credit: { backgroundColor: colors.creditWash, color: colors.credit, borderColor: colors.credit },
    warn: { backgroundColor: colors.warnWash, color: colors.warn, borderColor: colors.warn },
    debit: { backgroundColor: colors.debitWash, color: colors.debit, borderColor: colors.debit },
    outline: { backgroundColor: 'transparent', color: colors.muted, borderColor: colors.ruleStrong },
  }[tone]

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{children}</Text>
    </View>
  )
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.h2}>{title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>
    </View>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.segmentedWrap}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: font.medium,
    fontSize: type.micro.fontSize,
    letterSpacing: type.micro.letterSpacing,
    textTransform: 'uppercase',
    color: colors.faint,
  },
  h1: {
    fontFamily: font.semibold,
    fontSize: type.h1.fontSize,
    letterSpacing: type.h1.letterSpacing,
    lineHeight: type.h1.lineHeight,
    color: colors.ink,
  },
  h2: {
    fontFamily: font.semibold,
    fontSize: type.h2.fontSize,
    letterSpacing: type.h2.letterSpacing,
    lineHeight: type.h2.lineHeight,
    color: colors.ink,
  },
  body: {
    fontFamily: font.regular,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.ink,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    fontFamily: font.semibold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: colors.ink,
  },
  hint: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.faint,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.debit,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ruleStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: {
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ruleStrong,
    borderRadius: radius.md,
    backgroundColor: colors.paper2,
  },
  segmentedWrap: {
    flexDirection: 'row',
    backgroundColor: colors.paper2,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.rule,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.white,
  },
})
