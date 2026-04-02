"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <span>AI Tracker</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            ✨ Track AI spending across all providers
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Monitor & Optimize
            <span className="block bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Your AI Costs
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Real-time dashboard to track AI API spending across OpenAI, Anthropic, AWS, GCP and more. Get alerts, set budgets, and never overspend again.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/signup" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center">
              Get Started Free
            </Link>
            <Link href="#features" className="px-8 py-4 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center">
              See Demo
            </Link>
          </div>
          
          <p className="text-sm text-gray-500">No credit card required • 1 month free trial</p>
        </div>

        {/* Hero Image - Dashboard Preview */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden shadow-xl">
          <div className="bg-gray-900 px-6 py-4 flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center text-gray-400 text-sm">AI Tracker Dashboard</div>
          </div>
          <div className="p-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Spend", value: "$12,450", icon: "📊" },
                { label: "This Month", value: "$8,100", icon: "💰" },
                { label: "Providers", value: "4 active", icon: "🔌" },
                { label: "Budget Used", value: "67%", icon: "⚠️" }
              ].map((stat, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{stat.icon}</span>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="h-64 bg-gradient-to-t from-gray-100 to-gray-50 rounded-lg border border-gray-200 flex items-end justify-center gap-2 p-4">
              <div className="w-8 h-24 bg-blue-200 rounded"></div>
              <div className="w-8 h-32 bg-blue-300 rounded"></div>
              <div className="w-8 h-20 bg-blue-400 rounded"></div>
              <div className="w-8 h-28 bg-blue-500 rounded"></div>
              <div className="w-8 h-36 bg-blue-600 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4">Powerful features for every team</h2>
          <p className="text-xl text-gray-600">Everything you need to control your AI spending</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "📊",
              title: "Real-Time Dashboard",
              desc: "Track spending across all AI providers in one beautiful, intuitive dashboard with instant updates.",
              features: ["Live cost tracking", "Provider breakdown", "Usage analytics"]
            },
            {
              icon: "🔔",
              title: "Smart Alerts",
              desc: "Get notified when budgets are approaching limits or unusual spending patterns are detected.",
              features: ["Budget alerts", "Anomaly detection", "Email notifications"]
            },
            {
              icon: "💬",
              title: "Multiple Providers",
              desc: "Seamless integration with OpenAI, Anthropic, AWS Bedrock, GCP Vertex AI and more.",
              features: ["4+ providers", "Easy integration", "API access"]
            },
            {
              icon: "👥",
              title: "Team Management",
              desc: "Set budgets per team, project, or individual and control spending with granular permissions.",
              features: ["Role-based control", "Team budgets", "Activity logs"]
            },
            {
              icon: "📈",
              title: "Forecasting",
              desc: "Predict month-end spending based on current trends and plan your budget accordingly.",
              features: ["Spend forecasts", "Trend analysis", "Historical data"]
            },
            {
              icon: "🔐",
              title: "Enterprise Security",
              desc: "Bank-level encryption for API keys with SOC 2 compliance and role-based access control.",
              features: ["End-to-end encryption", "SOC 2 certified", "SSO ready"]
            }
          ].map((feature, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl p-8 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-6">{feature.desc}</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {feature.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">$50M+</div>
              <div className="text-gray-600">Tracked in spending</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-gray-600">Active users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime guaranteed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Expert support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600">Choose the right plan for your team</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free */}
          <div className="border border-gray-200 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-1">$0<span className="text-lg text-gray-600">/mo</span></div>
              <p className="text-gray-600 text-sm">Forever free</p>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-gray-600">
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                1 user
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Up to 3 providers
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Basic alerts
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs"></span>
                <span className="text-gray-400">Team management</span>
              </li>
            </ul>
            <Link href="/signup" className="block w-full text-center px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="border-2 border-blue-600 rounded-2xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
              Most popular
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Professional</h3>
              <div className="text-4xl font-bold mb-1">$49<span className="text-lg text-gray-600">/mo</span></div>
              <p className="text-gray-600 text-sm">1 month free trial</p>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-gray-600">
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Up to 5 users
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Unlimited providers
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Advanced alerts & forecasting
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Team management
              </li>
            </ul>
            <Link href="/signup" className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="border border-gray-200 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-1">Custom</div>
              <p className="text-gray-600 text-sm">For large organizations</p>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-gray-600">
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Unlimited users
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                All features included
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Dedicated support
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                Custom integrations
              </li>
            </ul>
            <button className="block w-full text-center px-6 py-3 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to control your AI costs?</h2>
          <p className="text-xl mb-8 opacity-90">Start tracking your spending today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Start Free Trial
            </Link>
            <Link href="#features" className="px-8 py-4 border border-white text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 font-bold mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg"></div>
                AI Tracker
              </div>
              <p className="text-sm text-gray-600">Monitor and optimize your AI spending.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Docs</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex items-center justify-between text-sm text-gray-600">
            <p>&copy; 2024 AI Tracker. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-blue-600 transition-colors">Twitter</a>
              <a href="#" className="hover:text-blue-600 transition-colors">GitHub</a>
              <a href="#" className="hover:text-blue-600 transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
