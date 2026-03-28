import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32" style={{
        background: 'linear-gradient(135deg, #353535 0%, #284B63 50%, #3C6E71 100%)'
      }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1),transparent)]"></div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid max-w-3xl mx-auto gap-8 text-center lg:grid-cols-2 lg:text-left lg:gap-12">
            <div className="glass-card p-12 rounded-3xl backdrop-blur-xl border border-[#D9D9D9]/40 hover:shadow-3xl transition-all duration-700 hover:scale-[1.02] max-w-lg mx-auto lg:mx-0">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-[#D9D9D9] to-white bg-clip-text text-transparent mb-6 leading-tight">
                Track, Control & 
                <span className="block bg-gradient-to-r from-[#3C6E71] to-[#284B63] bg-clip-text text-transparent mt-2">
                  Optimize Your AI Spending
                </span>
              </h1>
              <p className="text-xl text-[#D9D9D9] mb-10 leading-relaxed max-w-lg">
                Unified dashboard for all your AI providers. Monitor token usage, costs, budgets and 
                get actionable insights across OpenAI, Anthropic, Bedrock, Vertex AI & more.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  href="/dashboard" 
                  className="premium-btn text-lg py-6 px-10 w-full sm:w-auto shadow-2xl hover:shadow-4xl transform hover:-translate-y-2 transition-all duration-500 font-semibold tracking-wide"
                >
                  Get Started Free
                </Link>
                <Link 
                  href="#dashboard" 
                  className="glass-card border-2 border-[#D9D9D9]/50 px-10 py-6 rounded-2xl text-white/80 font-semibold hover:bg-[#284B63]/50 hover:border-[#3C6E71]/70 transition-all duration-300 hover:scale-105"
                >
                  View Dashboard →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-12 lg:mt-0 lg:ml-auto">
              <div className="glass-card p-6 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl transition-all h-32 flex items-center justify-center">
                <div className="text-3xl">🚀</div>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl transition-all h-32 flex items-center justify-center">
                <div className="text-3xl">📊</div>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl transition-all h-32 flex items-center justify-center">
                <div className="text-3xl">⚡</div>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl transition-all h-32 flex items-center justify-center">
                <div className="text-3xl">💰</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-[#353535]/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-[#D9D9D9] bg-clip-text text-transparent mb-6">
              Everything you need to 
              <span className="block bg-gradient-to-r from-[#3C6E71] to-[#284B63]">master AI costs</span>
            </h2>
            <p className="text-xl text-[#D9D9D9] max-w-2xl mx-auto">
              From real-time tracking to intelligent optimization, AI Spend Tracker has you covered.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: '📊',
                title: 'Unified Dashboard',
                desc: 'Single pane of glass for all AI providers. No more spreadsheet chaos.'
              },
              {
                icon: '🔔',
                title: 'Budget Alerts',
                desc: 'Real-time notifications when approaching limits. Never overspend again.'
              },
              {
                icon: '📈',
                title: 'Advanced Analytics',
                desc: 'Token trends, cost forecasting, anomaly detection powered by AI.'
              },
              {
                icon: '🔌',
                title: 'Multi-Provider',
                desc: 'OpenAI, Anthropic, Bedrock, Vertex AI + 10+ more integrations.'
              },
              {
                icon: '👥',
                title: 'Team Management',
                desc: 'Share access, set granular budgets per team member or project.'
              },
              {
                icon: '⚙️',
                title: 'API-First',
                desc: 'Machine-to-machine ingestion. Integrates anywhere with SDK.'
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-10 rounded-3xl border border-[#D9D9D9]/30 hover:shadow-3xl hover:scale-105 transition-all duration-500 hover:border-[#3C6E71]/60 group cursor-pointer">
                <div className="text-4xl group-hover:scale-110 transition-transform mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-[#3C6E71] transition-colors">{feature.title}</h3>
                <p className="text-[#D9D9D9] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-[#D9D9D9] bg-clip-text text-transparent mb-6">
              How it works
            </h2>
            <p className="text-xl text-[#D9D9D9] max-w-2xl mx-auto">
              Three simple steps to total AI cost transparency
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 items-center">
            {[1,2,3].map((step) => (
              <div key={step} className="glass-card p-12 rounded-3xl text-center border border-[#D9D9D9]/30 group hover:shadow-3xl transition-all duration-500 relative">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 glass-card rounded-3xl border-4 border-[#3C6E71] bg-[#3C6E71]/20 text-2xl font-bold flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-300">
                  0{step}
                </div>
                <div className="mt-14">
                  <h3 className="text-2xl font-bold text-white mb-6">{step === 1 ? 'Connect' : step === 2 ? 'Track' : 'Optimize'}</h3>
                  <p className="text-[#D9D9D9] leading-relaxed">
                    {step === 1 && 'Link your API keys from all providers in seconds. Automatic syncing starts immediately.'}
                    {step === 2 && 'Real-time token & cost tracking across all models. Beautiful visualizations.'}
                    {step === 3 && 'AI-powered insights, budget alerts, optimization recommendations.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 bg-gradient-to-b from-[#353535] to-[#284B63]/50">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-[#D9D9D9] bg-clip-text text-transparent mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-[#D9D9D9] max-w-2xl mx-auto">
              Start free, scale with your usage. No surprises.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                users: '1',
                providers: '3',
                popular: false,
                features: ['Basic tracking', '3 providers', '30 days history', 'Email alerts']
              },
              {
                name: 'Pro',
                price: '$29',
                users: 'Unlimited',
                providers: 'Unlimited',
                popular: true,
                features: ['Everything in Free', 'Real-time alerts', 'Full history', 'Team access', 'API access', 'Priority support']
              },
              {
                name: 'Enterprise',
                price: '$99+',
                users: 'Unlimited',
                providers: 'Unlimited',
                popular: false,
                features: ['Everything in Pro', 'Custom integrations', 'SLA & dedicated support', 'Advanced analytics', 'White-label dashboard']
              }
            ].map((plan, i) => (
              <div key={plan.name} className={`glass-card p-10 rounded-3xl border ${plan.popular ? 'border-[#3C6E71] shadow-4xl scale-105 ring-4 ring-[#3C6E71]/20' : 'border-[#D9D9D9]/30 hover:shadow-3xl'} transition-all duration-500 group relative overflow-hidden`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#3C6E71] text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">{plan.name}</h3>
                  <div className="text-5xl font-bold text-white mb-2">{plan.price}</div>
                  <div className="text-[#D9D9D9]">{plan.users} users</div>
                </div>
                <ul className="space-y-4 mb-10 text-[#D9D9D9]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 p-3 glass-card rounded-xl group-hover:bg-[#284B63]/20 transition-all">
                      <div className="w-2 h-2 bg-[#3C6E71] rounded-full"></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/dashboard" 
                  className={`block w-full py-6 px-8 rounded-2xl font-bold text-center uppercase tracking-wide transition-all duration-300 ${
                    plan.popular 
                      ? 'premium-btn shadow-3xl hover:shadow-4xl transform hover:-translate-y-2 bg-gradient-to-r from-[#3C6E71] to-[#284B63]' 
                      : 'glass-card border-2 border-[#D9D9D9]/50 hover:bg-[#284B63]/50 hover:border-[#3C6E71]/70 hover:text-white'
                  }`}
                >
                  {plan.popular ? 'Get Started - Pro' : 'Choose ' + plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-[#D9D9D9]/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 text-[#D9D9D9]">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                AI Spend Tracker
              </h3>
              <p className="text-sm leading-relaxed mb-6">The unified platform for AI cost intelligence.</p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 glass-card rounded-xl flex items-center justify-center hover:bg-[#3C6E71]/50 transition-all" title="Twitter">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 glass-card rounded-xl flex items-center justify-center hover:bg-[#3C6E71]/50 transition-all" title="GitHub">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#D9D9D9]/20 mt-16 pt-12 text-center text-[#D9D9D9] text-sm">
            © 2024 AI Spend Tracker. Made with ❤️ for the AI economy.
          </div>
        </div>
      </footer>
    </div>
  );
}
