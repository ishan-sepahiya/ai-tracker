"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FEFEFE] text-[#111111] font-sans antialiased">
      {/* 1. HERO */}
      <section className="min-h-screen relative flex flex-col justify-center items-center py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#708A83]/5 to-transparent"></div>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#708A83]/10 rounded-full blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#476E66]/10 rounded-full blur-3xl opacity-60 animate-pulse delay-1000"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold leading-tight mb-8 text-[#111111]">
              Track, Control & Optimize
              <span className="block text-[#708A83] mt-4">
                Your AI Spending
              </span>
            </h1>
            <p className="text-lg text-[#BEC0BF] leading-relaxed max-w-2xl mx-auto mb-12">
              Unified dashboard for monitoring AI API costs across OpenAI, Anthropic, Bedrock, 
              Vertex AI and more. Never overspend again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <div className="bg-[#708A83] text-white hover:bg-[#476E66] rounded-xl py-3 px-6 transition-all font-semibold text-center">
                  Get Started - Free
                </div>
              </Link>
              <Link href="#features" className="bg-[#F4F4F4] border border-[#DFDFE2] hover:bg-[#FEFEFE] rounded-xl py-3 px-6 transition-all font-semibold text-[#111111]">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES */}
      <section className="py-20 px-6 bg-[#F4F4F4]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8 text-[#111111]">
              Built for teams who spend on AI
            </h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-lg font-medium text-[#BEC0BF] leading-relaxed">
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
              <div key={i} className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer p-6 group">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-lg font-medium mb-4 text-[#111111]">{feature.title}</h3>
                <p className="text-sm text-[#BEC0BF] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DASHBOARD PREVIEW */}
      <section id="dashboard-preview" className="py-20 px-6 bg-[#FEFEFE]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-2xl font-semibold mb-6 text-[#111111]">
              Your Dashboard Awaits
            </h2>
            <p className="text-lg font-medium text-[#BEC0BF] max-w-3xl mx-auto leading-relaxed">
              Real-time insights at a glance across all your AI providers
            </p>
          </div>

          {/* Mock Dashboard - Window UI */}
          <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm max-w-6xl mx-auto overflow-hidden relative">
            {/* Window Header */}
            <div className="bg-[#F4F4F4] px-6 py-3 border-b border-[#DFDFE2] flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-400 transition-all duration-200 cursor-pointer"></div>
                <div className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-400 transition-all duration-200 cursor-pointer"></div>
                <div className="w-3 h-3 bg-green-500/80 rounded-full hover:bg-green-400 transition-all duration-200 cursor-pointer"></div>
              </div>
              <div className="ml-4 flex-1 bg-[#DFDFE2]/50 rounded-full px-4 py-1 text-xs font-medium text-[#BEC0BF] truncate">
                AI Tracker Dashboard
              </div>
            </div>
            
            {/* Sidebar + Main */}
            <div className="flex lg:flex-row flex-col h-[600px]">
              {/* Fake Sidebar */}
              <div className="w-full lg:w-64 bg-[#F4F4F4] p-6 border-b lg:border-b-0 lg:border-r border-[#DFDFE2] shadow-sm">
                <div className="font-semibold text-lg text-[#111111] mb-8 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#708A83]/80 rounded-lg flex items-center justify-center text-sm font-bold text-white">AI</div>
                  AI Tracker
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#DFDFE2]/50 cursor-pointer hover:bg-[#708A83]/20 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-[#708A83] rounded-lg flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform">📊</div>
                    <span className="font-medium text-[#111111] group-hover:text-[#708A83] transition-colors">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-[#DFDFE2]/50 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-[#DFDFE2] rounded-lg flex items-center justify-center text-xs group-hover:scale-110 transition-transform">💰</div>
                    <span className="text-[#111111] group-hover:text-[#708A83] transition-colors">Budgets</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-[#DFDFE2]/50 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-[#DFDFE2] rounded-lg flex items-center justify-center text-xs group-hover:scale-110 transition-transform">🔌</div>
                    <span className="text-[#111111] group-hover:text-[#708A83] transition-colors">Providers</span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-8">
                {/* Top Navbar */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#DFDFE2]">
                  <div className="text-xl font-semibold text-[#111111]">Overview</div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#708A83] rounded-xl flex items-center justify-center text-white">👤</div>
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
                    <div key={i} className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm hover:shadow-md transition-all duration-300 p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xl font-bold text-[#111111]">{stat.value}</div>
                        <span className="text-xl text-[#BEC0BF]">{stat.trend}</span>
                      </div>
                      <div className="text-sm text-[#BEC0BF] mb-3">{stat.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#708A83]/20 text-[#708A83] px-3 py-1 rounded-full text-xs font-bold">
                          {stat.change}
                        </span>
                        <div className="flex-1 h-2 bg-[#F4F4F4] rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-[#708A83] rounded-full transition-all duration-700`} 
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
                  <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-6 h-72 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-[#F4F4F4] rounded-xl">
                      <div className="w-3 h-3 bg-[#708A83] rounded-full"></div>
                      <span className="text-[#708A83] font-semibold">Token Usage</span>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <div className="h-2 bg-[#708A83]/30 rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
                        <div className="h-3 bg-[#708A83]/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="h-4 bg-[#708A83]/70 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        <div className="h-2.5 bg-[#708A83] rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart Mock */}
                  <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-6 h-72 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-[#F4F4F4] rounded-xl">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                      <span className="text-emerald-600 font-semibold">Provider Split</span>
                    </div>
                    <div className="relative flex-1 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-2xl bg-[#F4F4F4] animate-spin-slow relative border-4 border-[#F4F4F4]"></div>
                      <div className="absolute w-32 h-32 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-[#DFDFE2]">
                        <div className="text-xl font-bold text-[#111111]">67%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fake Table */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#DFDFE2]">
                  <div className="bg-[#F4F4F4] px-6 py-4 border-b border-[#DFDFE2]">
                    <h3 className="font-semibold text-lg text-[#111111]">Recent Usage</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#DFDFE2]">
                          <th className="text-left p-6 font-semibold text-[#BEC0BF]">Provider</th>
                          <th className="text-left p-6 font-semibold text-[#BEC0BF]">Tokens</th>
                          <th className="text-left p-6 font-semibold text-[#BEC0BF]">Cost</th>
                          <th className="text-left p-6 font-semibold text-[#BEC0BF]">Model</th>
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
                          <tr key={i} className="hover:bg-[#F4F4F4] transition-colors duration-200 border-b border-[#DFDFE2]/50">
                            <td className="p-6 font-medium text-[#111111]">{row.provider}</td>
                            <td className="p-6 text-[#BEC0BF]">{row.tokens}</td>
                            <td className="p-6 font-semibold text-[#708A83]">{row.cost}</td>
                            <td className="p-6 text-[#BEC0BF]">{row.model}</td>
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
      <section id="pricing" className="py-20 px-6 bg-[#F4F4F4]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl font-semibold mb-6 text-[#111111]">Simple pricing for every team</h2>
            <p className="text-lg text-[#BEC0BF] max-w-2xl mx-auto">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* 1 Month Trial */}
            <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-6 hover:shadow-md transition-all duration-300 relative">
              <div className="text-3xl font-semibold text-[#BEC0BF] mb-4">$0</div>
              <div className="text-lg font-medium mb-8 text-[#111111]">1 Month Trial</div>
              <ul className="space-y-3 mb-8 text-[#BEC0BF]">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">1 User</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">3 Providers</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Basic Charts</span></li>
              </ul>
              <Link href="/dashboard">
                <div className="w-full bg-[#F4F4F4] border border-[#DFDFE2] hover:bg-[#FEFEFE] text-[#111111] font-semibold rounded-xl py-3 px-6 hover:shadow-sm transition-all duration-300 text-center text-sm">
                  Get Started
                </div>
              </Link>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="bg-white rounded-2xl border-2 border-[#708A83] shadow-sm hover:shadow-lg transition-all duration-300 relative p-8 scale-[1.02]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#708A83] text-white px-6 py-2 rounded-2xl font-semibold text-sm shadow-sm">
                ⭐ Most Popular
              </div>
              <div className="text-3xl font-bold mb-2 text-[#708A83]">$29</div>
              <div className="text-lg font-semibold mb-8 text-[#BEC0BF]">/month</div>
              <ul className="space-y-3 mb-8 text-[#BEC0BF]">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Unlimited Users</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">All Providers</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Team Budgets</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Smart Alerts</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">API Access</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Cost Intelligence</span></li>
              </ul>
              <Link href="/dashboard">
                <div className="bg-[#708A83] text-white hover:bg-[#476E66] w-full font-semibold rounded-xl py-3 px-6 shadow-sm hover:shadow-md transition-all duration-300 text-center text-sm">
                  Start Pro Trial
                </div>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl border border-[#DFDFE2] shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <div className="text-3xl font-semibold text-[#BEC0BF] mb-4">$99+</div>
              <div className="text-lg font-medium mb-8 text-[#111111]">Enterprise</div>
              <ul className="space-y-3 mb-8 text-[#BEC0BF]">
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Everything in Pro</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">SSO & RBAC</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Custom SLAs</span></li>
                <li className="flex items-center gap-3"><span className="text-green-400">✅</span> <span className="text-sm">Dedicated Support</span></li>
              </ul>
              <Link href="/contact">
                <div className="bg-[#708A83] text-white hover:bg-[#476E66] w-full font-semibold rounded-xl py-3 px-6 hover:shadow-sm transition-all duration-300 text-center text-sm">
                  Contact Sales
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#F4F4F4]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-6 text-[#111111]">Ready to take control?</h2>
          <p className="text-lg text-[#BEC0BF] mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 500+ teams saving 30%+ on AI infrastructure costs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <div className="bg-[#708A83] text-white hover:bg-[#476E66] px-12 py-3 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all">
                Start Free
              </div>
            </Link>
            <Link href="#pricing" className="bg-[#F4F4F4] border border-[#DFDFE2] hover:bg-[#FEFEFE] px-12 py-3 font-semibold rounded-xl hover:shadow-sm transition-all text-[#111111]">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-20 px-6 border-t border-[#DFDFE2]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-sm text-[#BEC0BF] mb-8">
            © 2024 AI Spend Tracker. Built with ❤️ for the AI economy.
          </div>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-[#BEC0BF]">
            <Link href="/privacy" className="hover:text-[#708A83] transition-colors text-sm">Privacy</Link>
            <Link href="/terms" className="hover:text-[#708A83] transition-colors text-sm">Terms</Link>
            <Link href="/security" className="hover:text-[#708A83] transition-colors text-sm">Security</Link>
            <Link href="/contact" className="hover:text-[#708A83] transition-colors text-sm">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
