"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-[#353535]">
      {/* Hero - Full viewport */}
      <section className="min-h-screen flex flex-col justify-center items-center py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="glass-card p-12 rounded-3xl shadow-2xl backdrop-blur-xl max-w-3xl mx-auto border border-[#D9D9D9]/30">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8">
              Track, Control & Optimize
              <span className="block bg-gradient-to-r from-[#3C6E71] to-[#284B63] bg-clip-text text-transparent mt-4">
                Your AI Spending
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[#D9D9D9] leading-relaxed max-w-2xl mx-auto mb-12">
              Unified dashboard for monitoring AI API costs across OpenAI, Anthropic, Bedrock, 
              Vertex AI and more. Never overspend again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <div className="px-12 py-6 bg-[#3C6E71] hover:bg-[#284B63] text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  Get Started - Free
                </div>
              </Link>
              <Link href="#features" className="px-12 py-6 border-2 border-[#D9D9D9]/50 hover:bg-[#284B63]/50 text-white font-semibold text-lg rounded-2xl hover:scale-105 transition-all duration-300">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-6">
              Built for teams who spend on AI
            </h2>
            <p className="text-xl text-[#D9D9D9] leading-relaxed">
              Complete visibility and control over your AI costs in one beautiful dashboard.
            </p>
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
              <div key={i} className="glass-card p-8 rounded-2xl border border-[#D9D9D9]/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-[#D9D9D9] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-[#284B63]/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
            Ready to optimize your AI spend?
          </h2>
          <p className="text-xl text-[#D9D9D9] mb-12 leading-relaxed max-w-2xl mx-auto">
            Join 500+ teams saving 30%+ on AI costs with AI Spend Tracker.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <div className="px-12 py-6 bg-[#3C6E71] hover:bg-[#284B63] text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Start Free Trial
              </div>
            </Link>
            <Link href="#pricing" className="px-12 py-6 border-2 border-[#D9D9D9]/50 hover:bg-[#284B63]/50 text-white font-semibold text-lg rounded-2xl hover:scale-105 transition-all duration-300">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-[#D9D9D9]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-[#D9D9D9] text-sm">
            © 2024 AI Spend Tracker. Built with precision for the AI economy.
          </div>
        </div>
      </footer>
    </div>
  );
}
