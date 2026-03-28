"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#353535] text-white">
      {/* 1. HERO */}
      <section className="min-h-screen relative flex flex-col justify-center items-center py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3C6E71]/10 via-[#284B63]/5 to-transparent animate-pulse opacity-75 pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#3C6E71]/20 rounded-full blur-3xl animate-pulse opacity-60"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#284B63]/20 rounded-full blur-3xl animate-pulse delay-1000 opacity-50"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="glass-card p-12 rounded-3xl shadow-2xl backdrop-blur-xl max-w-3xl mx-auto border border-[#D9D9D9]/30 shadow-[#3C6E71]/20">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8">
              Track, Control & Optimize
              <span className="block bg-gradient-to-r from-[#3C6E71] to-[#284B63] bg-clip-text text-transparent mt-4">
                Your AI Spending
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-12">
              Unified dashboard for monitoring AI API costs across OpenAI, Anthropic, Bedrock, 
              Vertex AI and more. Never overspend again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <div className="premium-btn px-12 py-6 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                  Get Started - Free
                </div>
              </Link>
              <Link href="#features" className="px-12 py-6 border-2 border-gray-500/50 hover:bg-[#284B63]/50 text-lg font-semibold rounded-2xl hover:scale-105 transition-all duration-300">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-8 drop-shadow-2xl leading-tight">
              Built for teams who spend on AI
            </h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                Complete visibility and control over your AI costs in one beautiful dashboard.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '📊', title: 'Real-time Dashboard', desc: 'Complete overview of token usage and costs across all providers.' },
              { icon: '🔔', title: 'Smart Alerts', desc: 'Instant notifications when budgets are approached or unusual patterns detected.' },
              { icon: '🔌', title: 'All Providers', desc: 'OpenAI, Anthropic, AWS Bedrock, GCP Vertex AI and 10+ more.' },
              { icon: '⚙️', title: 'Team Budgets', desc: 'Granular budgets per team, project, or individual contributor.' },
              { icon: '📈', title: 'Cost Intelligence', desc: 'AI-powered insights and optimization recommendations.' },
              { icon: '🔗', title: 'API Ready', desc: 'Machine-to-machine SDK for seamless integration.' },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl shadow-lg border border-gray-600/50 hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer group bg-[#284B63]/80">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DASHBOARD PREVIEW */}
      <section id="dashboard-preview" className="py-20 px-6 bg-gradient-to-b from-[#284B63]/10 to-[#1e3a4a]/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-[#3C6E71] via-white to-[#284B63] bg-clip-text text-transparent mb-6 drop-shadow-2xl">
              Your Dashboard Awaits
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
              Real-time insights at a glance across all your AI providers
            </p>
          </div>

          {/* Mock Dashboard - Window UI */}
          <div className="glass-card rounded-2xl shadow-2xl border border-gray-700/50 max-w-6xl mx-auto overflow-hidden bg-[#284B63]/40 backdrop-blur-xl relative">
            {/* Window Header */}
            <div className="bg-[#284B63]/90 px-6 py-3 border-b border-gray-700/50 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-400 transition-all duration-200 cursor-pointer"></div>
                <div className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-400 transition-all duration-200 cursor-pointer"></div>
                <div className="w-3 h-3 bg-green-500/80 rounded-full hover:bg-green-400 transition-all duration-200 cursor-pointer"></div>
              </div>
              <div className="ml-4 flex-1 bg-white/5 backdrop-blur-sm rounded-full px-4 py-1 text-xs font-medium text-gray-300 truncate">
                AI Tracker Dashboard
              </div>
            </div>
            
            {/* Sidebar + Main */}
            <div className="flex lg:flex-row flex-col h-[600px]">
              {/* Fake Sidebar */}
              <div className="w-full lg:w-64 bg-[#284B63]/95 p-6 border-b lg:border-b-0 lg:border-r border-gray-700/50 shadow-lg">
                <div className="font-semibold text-lg text-white mb-8 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#3C6E71]/80 rounded-lg flex items-center justify-center text-sm font-bold">AI</div>
                  AI Tracker
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 cursor-pointer hover:bg-[#3C6E71]/60 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-[#3C6E71] rounded-lg flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">📊</div>
                    <span className="font-medium group-hover:text-white transition-colors">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-600/50 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-gray-600/80 rounded-lg flex items-center justify-center text-xs group-hover:scale-110 transition-transform">💰</div>
                    <span className="group-hover:text-white transition-colors">Budgets</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-600/50 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-gray-600/80 rounded-lg flex items-center justify-center text-xs group-hover:scale-110 transition-transform">🔌</div>
                    <span className="group-hover:text-white transition-colors">Providers</span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-8">
                {/* Top Navbar */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-600/50">
                  <div className="text-2xl font-semibold">Overview</div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#3C6E71] rounded-xl flex items-center justify-center">👤</div>
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  {[
                    { title: 'Total Spend', value: '$12,450', change: '+12%', trend: '📈', color: 'from-emerald-400 to-green-500' },
                    { title: 'Tokens Used', value: '2.4M', change: '+8%', trend: '📊', color: 'from-blue-400 to-indigo-500' },
                    { title: 'Active Providers', value: '4', change: '+1', trend: '🔌', color: 'from-purple-400 to-violet-500' },
                    { title: 'Budget Remaining', value: '$3,200', change: '-5%', trend: '⚠️', color: 'from-orange-400 to-red-500' }
                  ].map((stat, i) => (
                    <div key={i} className="glass-card p-6 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 border border-gray-600/50 bg-gradient-to-br from-[#284B63]/90 to-[#284B63]/60 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <span className={`text-2xl opacity-80`}>{stat.trend}</span>
                      </div>
                      <div className="text-sm text-gray-400 mb-3">{stat.title}</div>
                      <div className="flex items-center gap-2">
                        <span className={`bg-gradient-to-r ${stat.color} px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg`}>
                          {stat.change}
                        </span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${stat.color} rounded-full shadow-inner transition-all duration-700 animate-pulse`} 
                            style={{width: i === 3 ? '60%' : '85%'}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Fake Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                  {/* Line Chart Mock */}
                  <div className="glass-card p-6 rounded-2xl shadow-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 h-72 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-blue-500/20 animate-shimmer"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl">
                        <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                        <span className="text-indigo-200 font-semibold">Token Usage</span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                          <div className="h-2 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full animate-metric-bar" style="animation-delay: 0s"></div>
                          <div className="h-3 bg-gradient-to-r from-purple-400 to-indigo-500/70 rounded-full animate-metric-bar" style="animation-delay: 0.2s"></div>
                          <div className="h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-metric-bar" style="animation-delay: 0.4s"></div>
                          <div className="h-2.5 bg-gradient-to-r from-indigo-500 to-sky-400/80 rounded-full animate-metric-bar" style="animation-delay: 0.6s"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart Mock */}
                  <div className="glass-card p-6 rounded-2xl shadow-xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 border border-emerald-400/30 h-72 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-green-400/10 to-teal-500/20 animate-shimmer delay-1000"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                        <span className="text-emerald-200 font-semibold">Provider Split</span>
                      </div>
                      <div className="relative flex-1 flex items-center justify-center">
                        <div className="w-48 h-48 rounded-3xl bg-gradient-to-r from-emerald-400 via-green-400 to-teal-500 shadow-2xl relative animate-spin-slow"></div>
                        <div className="absolute w-32 h-32 bg-[#284B63]/90 rounded-2xl shadow-inner flex items-center justify-center">
                          <div className="text-2xl font-bold text-white">67%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <style jsx>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                  }
                  @keyframes metric-bar {
                    0%, 100% { width: 0%; }
                    50% { width: 85%; }
                  }
                  .animate-metric-bar {
                    animation: metric-bar 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                  }
                  @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                  }
                `}</style>

                {/* Fake Table */}
                <div className="glass-card rounded-2xl shadow-lg overflow-hidden border border-gray-600/50">
                  <div className="bg-[#284B63]/80 px-6 py-4 border-b border-gray-600/50">
                    <h3 className="font-semibold text-lg">Recent Usage</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600/50">
                          <th className="text-left p-6 font-semibold text-gray-200">Provider</th>
                          <th className="text-left p-6 font-semibold text-gray-200">Tokens</th>
                          <th className="text-left p-6 font-semibold text-gray-200">Cost</th>
                          <th className="text-left p-6 font-semibold text-gray-200">Model</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { provider: 'OpenAI', tokens: '1.2M', cost: '$456', model: 'gpt-4o' },
                          { provider: 'Anthropic', tokens: '450K', cost: '$189', model: 'claude-3-opus' },
                          { provider: 'AWS Bedrock', tokens: '320K', cost: '$112', model: 'llama-3' },
                          { provider: 'GCP Vertex', tokens: '180K', cost: '$67', model: 'gemini-pro' },
                          { provider: 'OpenAI', tokens: '95K', cost: '$34', model: 'gpt-4-turbo' }
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-600/30">
                            <td className="p-6 font-medium">{row.provider}</td>
                            <td className="p-6">{row.tokens}</td>
                            <td className="p-6 font-semibold text-[#3C6E71]">${row.cost}</td>
                            <td className="p-6 text-gray-400">{row.model}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRICING */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6">Simple pricing for every team</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card p-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 border border-gray-600/50 bg-[#284B63]/80 relative">
              <div className="text-3xl font-bold text-gray-400 mb-4">$0</div>
              <div className="text-2xl font-semibold mb-8">Free</div>
              <ul className="space-y-3 mb-8 text-gray-300">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> 1 User</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> 3 Providers</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Basic Charts</li>
              </ul>
              <Link href="/dashboard">
                <div className="w-full py-4 bg-transparent border-2 border-gray-500/50 hover:bg-gray-700/50 text-lg font-semibold rounded-xl hover:scale-105 transition-all duration-300 text-center">
                  Get Started
                </div>
              </Link>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="glass-card p-10 rounded-2xl shadow-2xl hover:shadow-[0_35px_60px_-15px_rgba(60,110,113,0.5)] hover:scale-105 transition-all duration-500 relative bg-gradient-to-br from-[#284B63]/95 via-[#284B63]/80 to-[#1e3a4a]/90 border-2 border-[#3C6E71]/80 ring-4 ring-[#3C6E71]/20 scale-[1.03]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#3C6E71] to-[#284B63] px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-lg shadow-[#3C6E71]/40 transform rotate-1 hover:rotate-0 transition-all duration-300">
                ⭐ Most Popular
              </div>
              <div className="text-4xl font-black mb-4 bg-gradient-to-r from-[#3C6E71] to-white bg-clip-text text-transparent drop-shadow-lg">$29</div>
              <div className="text-xl font-bold mb-8 text-[#3C6E71]/90 tracking-wide uppercase">per month</div>
              <ul className="space-y-3 mb-8 text-gray-300">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Unlimited Users</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> All Providers</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Team Budgets</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Smart Alerts</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> API Access</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Cost Intelligence</li>
              </ul>
              <Link href="/dashboard">
                <div className="premium-btn w-full py-4 text-lg font-semibold rounded-xl shadow-xl">
                  Start Pro Trial
                </div>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass-card p-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 border border-gray-600/50 bg-[#284B63]/80">
              <div className="text-3xl font-bold text-gray-400 mb-4">$99+</div>
              <div className="text-2xl font-semibold mb-8">Enterprise</div>
              <ul className="space-y-3 mb-8 text-gray-300">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Everything in Pro</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> SSO & RBAC</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Custom SLAs</li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> Dedicated Support</li>
              </ul>
              <Link href="/contact">
                <div className="w-full py-4 bg-[#3C6E71] hover:bg-[#284B63] text-lg font-semibold rounded-xl hover:scale-105 transition-all duration-300 text-center shadow-lg">
                  Contact Sales
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#284B63]/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6">Ready to take control?</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 500+ teams saving 30%+ on AI infrastructure costs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <div className="premium-btn px-12 py-6 text-lg font-semibold rounded-2xl shadow-xl">
                Start Free
              </div>
            </Link>
            <Link href="#pricing" className="px-12 py-6 border-2 border-gray-500/50 hover:bg-[#284B63]/50 text-lg font-semibold rounded-2xl hover:scale-105 transition-all duration-300">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-20 px-6 border-t border-gray-600/20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-gray-400 text-sm mb-8">
            © 2024 AI Spend Tracker. Built with ❤️ for the AI economy.
          </div>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
