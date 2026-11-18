import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  api,
  type Contribution,
  type Group,
  type GroupSummary,
  type Loan,
  type Membership,
} from '../../../src/lib/api'
import { useAsync } from '../../../src/lib/data'
import { useSession } from '../../../src/lib/session'
import { useI18n } from '../../../src/lib/i18nContext'
import { contributionDayLabel, dateLabel, periodLabel, rwf, rwfSigned } from '../../../src/lib/format'
import { Badge, Body, Button, Card, Divider, Empty, Field, H1, Input, Label, Money, Screen } from '../../../src/components/ui'
import { colors, font, radius, spacing } from '../../../src/theme'

interface GroupData {
  group: Group
  summary: GroupSummary
  members: Membership[]
  contributions: Contribution[]
  loans: Loan[]
}

const STATUS_TONE: Record<string, 'neutral' | 'ink' | 'credit' | 'warn' | 'debit' | 'outline' | 'accent'> = {
  payment: 'neutral',
  penalty: 'warn',
  reversal: 'debit',
  requested: 'warn',
  approved: 'credit',
  repaid: 'credit',
  rejected: 'debit',
  overdue: 'debit',
  active: 'accent',
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const { t } = useI18n()
  const [tab, setTab] = useState<'ledger' | 'loans'>('ledger')
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState('3')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const groupId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''

  const state = useAsync<GroupData | null>(async () => {
    if (!groupId) return null
    const [group, summary, members, contributions, loans] = await Promise.all([
      api.group(groupId),
      api.summary(groupId),
      api.members(groupId),
      api.contributions(groupId),
      api.loans(groupId),
    ])
    return { group, summary, members: members.items, contributions: contributions.items, loans: loans.items }
  }, [groupId])

  const data = state.data
  const myMembership = useMemo(
    () => data?.members.find((member) => member.user_id === user?.id) ?? null,
    [data?.members, user?.id],
  )
  const memberById = useMemo(
    () => new Map((data?.members ?? []).map((member) => [member.id, member])),
    [data?.members],
  )

  function memberLabel(membershipId: string): string {
    const member = memberById.get(membershipId)
    if (!member) return 'Member'
    if (member.user_id === user?.id) return 'You'
    if (member.invited_phone) return member.invited_phone
    return 'Member'
  }

  async function requestLoan() {
    if (!groupId) return
    setFormError(null)
    const principal = Number(amount)
    const term = Number(months)
    if (!Number.isFinite(principal) || principal < 1000) {
      setFormError('Enter at least 1,000 RWF.')
      return
    }
    if (!Number.isFinite(term) || term < 1 || term > 36) {
      setFormError('Choose a term between 1 and 36 months.')
      return
    }
    setSubmitting(true)
    try {
      await api.requestLoan(groupId, { principal_rwf: principal, term_months: term })
      setAmount('')
      state.reload()
    } catch {
      setFormError('Could not send the request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Screen style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
          <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: colors.muted }}>← {t('group.allGroups')}</Text>
          </Pressable>

          {state.error ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.debit }}>{state.error}</Text>
          ) : null}

          {data ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <Label>{[data.group.district, data.group.sector].filter(Boolean).join(' / ') || t('app.name')}</Label>
                <H1>{data.group.name}</H1>
                <Body>
                  {contributionDayLabel(data.group.frequency, data.group.contribution_day)} · {rwf(data.group.default_contribution_rwf)} RWF
                </Body>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                  <Badge tone="ink">{myMembership?.role ?? 'member'}</Badge>
                  <Badge tone={STATUS_TONE[data.group.status] ?? 'outline'}>{data.group.status}</Badge>
                  <Badge tone="outline">Rules v{data.group.rules_version}</Badge>
                </View>
              </View>

              <Card style={{ gap: spacing.lg, backgroundColor: colors.ink, borderColor: colors.ink }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9ca38f' }}>{t('group.potBalance')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 30, letterSpacing: -0.8, color: colors.white, fontVariant: ['tabular-nums'] }}>
                      {rwf(data.summary.available_pot_rwf)}
                    </Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 10, color: '#9ca38f' }}>RWF</Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: font.regular, fontSize: 11, color: '#9ca38f' }}>{t('home.contributed')}</Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 15, color: colors.white, fontVariant: ['tabular-nums'] }}>{rwf(data.summary.total_contributed_rwf)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: font.regular, fontSize: 11, color: '#9ca38f' }}>{t('group.outOnLoan')}</Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 15, color: colors.white, fontVariant: ['tabular-nums'] }}>{rwf(data.summary.total_loaned_rwf)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: font.regular, fontSize: 11, color: '#9ca38f' }}>{t('group.interest')}</Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 15, color: colors.white, fontVariant: ['tabular-nums'] }}>{rwf(data.summary.interest_earned_rwf)}</Text>
                  </View>
                </View>
              </Card>

              <View style={{ flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.paper2, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.rule, alignSelf: 'flex-start' }}>
                {(['ledger', 'loans'] as const).map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: radius.pill,
                      backgroundColor: tab === key ? colors.ink : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: tab === key ? colors.white : colors.muted }}>
                      {key === 'ledger' ? t('group.ledger') : t('group.loans')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'ledger' ? (
                <View style={{ gap: spacing.sm }}>
                  {data.contributions.length === 0 ? (
                    <Empty title={t('group.emptyLedger')} body={t('group.emptyLedgerBody')} />
                  ) : (
                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                      {data.contributions.map((entry, idx) => (
                        <View
                          key={entry.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: spacing.md,
                            paddingVertical: 14,
                            paddingHorizontal: spacing.lg,
                            borderBottomWidth: idx === data.contributions.length - 1 ? 0 : 1,
                            borderBottomColor: colors.rule,
                          }}
                        >
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: colors.ink }}>
                              {memberLabel(entry.membership_id)}
                            </Text>
                            <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.muted }}>
                              {periodLabel(entry.period)} · {dateLabel(entry.paid_at)}
                            </Text>
                          </View>
                          <Badge tone={STATUS_TONE[entry.type] ?? 'neutral'}>{entry.type}</Badge>
                          <Money
                            amount={rwfSigned(entry.amount_rwf)}
                            size={15}
                            tone={entry.amount_rwf < 0 ? 'debit' : 'ink'}
                          />
                        </View>
                      ))}
                    </Card>
                  )}
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {myMembership && myMembership.status === 'active' ? (
                    <Card style={{ gap: spacing.md }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.ink }}>{t('group.requestLoan')}</Text>
                      <Field label={t('group.amount')} hint="RWF">
                        <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="50000" />
                      </Field>
                      <Field label={t('group.term')} hint={t('group.months')}>
                        <Input value={months} onChangeText={setMonths} keyboardType="number-pad" />
                      </Field>
                      {formError ? (
                        <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: colors.debit }}>{formError}</Text>
                      ) : null}
                      <Button title={t('group.sendRequest')} onPress={requestLoan} loading={submitting} />
                      <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.faint, lineHeight: 16 }}>
                        {t('group.loanNote')}
                      </Text>
                    </Card>
                  ) : null}

                  {data.loans.length === 0 ? (
                    <Empty title={t('group.emptyLoans')} body={t('group.emptyLoansBody')} />
                  ) : (
                    data.loans.map((loan) => (
                      <Card key={loan.id} style={{ gap: spacing.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                          <View style={{ gap: 2, flex: 1 }}>
                            <Text style={{ fontFamily: font.medium, fontSize: 14, color: colors.ink }}>
                              {memberLabel(loan.membership_id)}
                            </Text>
                            <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.muted }}>
                              {loan.term_months} months · {dateLabel(loan.requested_at)}
                            </Text>
                          </View>
                          <Badge tone={STATUS_TONE[loan.status] ?? 'neutral'}>{loan.status}</Badge>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Money amount={rwf(loan.principal_rwf)} size={16} />
                          <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: colors.muted }}>
                            {loan.outstanding_rwf !== null ? `Outstanding ${rwf(loan.outstanding_rwf)} RWF` : '—'}
                          </Text>
                        </View>
                      </Card>
                    ))
                  )}
                </View>
              )}

              <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: colors.faint, lineHeight: 17 }}>
                {t('group.footerNote')}
              </Text>
            </>
          ) : !state.error ? (
            <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>{t('common.loading')}</Text>
            </View>
          ) : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
