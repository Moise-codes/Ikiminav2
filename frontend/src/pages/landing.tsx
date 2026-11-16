import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle, Users, TrendingUp, Shield, Smartphone, Globe } from 'lucide-react'

export function LandingPage() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Users,
      title: t('landing.feature1Title'),
      description: t('landing.feature1Desc'),
    },
    {
      icon: TrendingUp,
      title: t('landing.feature2Title'),
      description: t('landing.feature2Desc'),
    },
    {
      icon: Shield,
      title: t('landing.feature3Title'),
      description: t('landing.feature3Desc'),
    },
    {
      icon: Smartphone,
      title: t('landing.feature4Title'),
      description: t('landing.feature4Desc'),
    },
    {
      icon: Globe,
      title: t('landing.feature5Title'),
      description: t('landing.feature5Desc'),
    },
    {
      icon: CheckCircle,
      title: t('landing.feature6Title'),
      description: t('landing.feature6Desc'),
    },
  ]

  const stats = [
    { value: '10,000+', label: t('landing.stat1Label') },
    { value: '500+', label: t('landing.stat2Label') },
    { value: 'RWF 1B+', label: t('landing.stat3Label') },
    { value: '99.9%', label: t('landing.stat4Label') },
  ]

  const testimonials = [
    {
      name: 'Jean Pierre',
      role: 'Group President',
      location: 'Kigali',
      content: t('landing.testimonial1'),
      avatar: 'JP',
    },
    {
      name: 'Marie Claire',
      role: 'Group Treasurer',
      location: 'Butare',
      content: t('landing.testimonial2'),
      avatar: 'MC',
    },
    {
      name: 'Emmanuel',
      role: 'Group Member',
      location: 'Gisenyi',
      content: t('landing.testimonial3'),
      avatar: 'EM',
    },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 lg:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
                <Badge variant="secondary" className="mr-2">New</Badge>
                {t('landing.badge')}
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {t('landing.heroTitle')}
                <span className="text-primary"> {t('landing.heroTitleHighlight')}</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl">
                {t('landing.heroDescription')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('landing.ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('landing.ctaSecondary')}
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('landing.trust1')}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('landing.trust2')}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('landing.trust3')}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-3xl" />
              <Card className="relative border-2">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('landing.totalSavings')}</p>
                        <p className="text-3xl font-bold">RWF 12,450,000</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('landing.monthlyContribution')}</span>
                        <span className="font-medium">RWF 2,500,000</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('landing.activeLoans')}</span>
                        <span className="font-medium">RWF 850,000</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('landing.availablePot')}</span>
                        <span className="font-medium text-green-600">RWF 11,600,000</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                            >
                              {String.fromCharCode(64 + i)}
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('landing.activeMembers', { count: 247 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.featuresTitle')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.featuresDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.howItWorksTitle')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.howItWorksDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: t('landing.step1Title'),
                description: t('landing.step1Desc'),
              },
              {
                step: '2',
                title: t('landing.step2Title'),
                description: t('landing.step2Desc'),
              },
              {
                step: '3',
                title: t('landing.step3Title'),
                description: t('landing.step3Desc'),
              },
            ].map((item, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.testimonialsTitle')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.testimonialsDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.location}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            {t('landing.ctaDescription')}
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary">
              {t('landing.ctaButton')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
