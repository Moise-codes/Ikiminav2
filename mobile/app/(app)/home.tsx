import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, type Group, type GroupSummary } from '../../src/lib/api'
import { useAsync } from '../../src/lib/data'
import { useSession } from '../../src/lib/session'
import { useI18n } from '../../src/lib/i18nContext'
import { contributionDayLabel, rwf } from '../../src/lib/format'
import { Body, Card, Divider, Empty, Label, H1, Money, Screen, Badge } from '../../src/components/ui'
import { colors, font, radius, spacing } from '../../src/theme'

interface Portfolio {
  group: Group
  summary: GroupSummary | null
}

export default function Home() {
  const { user } = useSession()
  const { t } = useI18n()

  const state = useAsync<Portfolio[]>(async () => {
    const groups = await api.groups()
    const summaries = await Promise.all(
      groups.items.map((group) => api.summary(group.id).catch(() => null)),
    )
    return groups.items.map((group, index) => ({ group, summary: summaries[index] }))
  }, [])

  const portfolio = state.data ?? []
  const pot = portfolio.reduce((total, entry) => total + (entry.summary?.available_pot_rwf ?? 0), 0)
  const contributed = portfolio.reduce(
    (total, entry) => total + (entry.summary?.total_contributed_rwf ?? 0),
    0,
  )

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting.morning')
    if (hour < 17) return t('home.greeting.afternoon')
    return t('home.greeting.evening')
  })()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={state.loading && portfolio.length > 0}
            onRefresh={state.reload}
            tintColor={colors.accent}
          />
        }
      >
        <Screen style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 28, height: 28, backgroundColor: colors.ink, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.accent }} />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.5, color: colors.ink }}>
                {t('app.name')}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(app)/settings')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}>
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.ink }}>
                {user?.full_name?.split(' ')[0] ?? 'Account'}
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: spacing.xs }}>
            <H1>{`${greeting}, ${user?.full_name?.split(' ')[0] ?? ''}`.trim()}</H1>
            <Body>{t('home.subtitle')}</Body>
          </View>

          <Card style={{ gap: spacing.lg, backgroundColor: colors.ink, borderColor: colors.ink }}>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ fontFamily: font.medium, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9ca38f' }}>{t('home.pot')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: colors.white, fontVariant: ['tabular-nums'] }}>
                    {state.loading ? '—' : rwf(pot)}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 10, color: '#9ca38f' }}>RWF</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ fontFamily: font.medium, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9ca38f' }}>{t('home.contributed')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: '#d9e8d6', fontVariant: ['tabular-nums'] }}>
                    {state.loading ? '—' : rwf(contributed)}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 10, color: '#9ca38f' }}>RWF</Text>
                </View>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: '#c7ccbf' }}>
              {portfolio.length === 1 ? 'One book to keep. Every franc is a whole franc.' : `${portfolio.length} groups, each with its own rules.`}
            </Text>
          </Card>

          <View style={{ gap: spacing.md }}>
            <Label>{t('home.yourGroups')}</Label>

            {state.error ? (
              <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.debit }}>{state.error}</Text>
            ) : null}

            {!state.loading && portfolio.length === 0 ? (
              <Empty title={t('home.noGroups')} body={t('home.noGroupsBody')} />
            ) : null}

            {portfolio.map(({ group, summary }) => (
              <Pressable key={group.id} onPress={() => router.push(`/(app)/group/${group.id}`)}>
                <Card style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.3, color: colors.ink }}>
                        {group.name}
                      </Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }}>
                        {contributionDayLabel(group.frequency, group.contribution_day)} · {rwf(group.default_contribution_rwf)} RWF
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Money amount={rwf(summary?.available_pot_rwf)} size={18} />
                      <Text style={{ fontFamily: font.regular, fontSize: 10, color: colors.faint }}>pot, RWF</Text>
                    </View>
                  </View>
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: colors.faint }}>
                      {group.district ?? '—'}{group.sector ? ` / ${group.sector}` : ''}
                    </Text>
                    <Badge tone="accent">{group.loan_interest_pct}% / mo</Badge>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
