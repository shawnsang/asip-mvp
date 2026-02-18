'use client';

import { useState, useEffect } from 'react';

interface Case {
  id: string;
  project_name: string;
  industry: string;
  use_case: string;
  pain_point: string;
  technology: string[];
  outcome: string;
  source: string;
  source_url: string;
  quality_score: number;
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    try {
      const res = await fetch('/api/cases?limit=50');
      const data = await res.json();
      setCases(data.data || []);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCases = cases.filter((c: Case) => {
    const matchesSearch = !searchTerm ||
      c.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.use_case.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.technology.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesIndustry = !selectedIndustry || c.industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  const industries = [...new Set(cases.map((c: Case) => c.industry))];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Discover AI Agent
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {" "}Success Cases
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
              Your AI-powered copilot for finding automation success stories,
              generating sales insights, and making data-driven decisions.
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="relative flex gap-2">
                <input
                  type="text"
                  placeholder="Search for AI Agent use cases... (e.g., 'customer service', 'automation')"
                  className="flex-1 px-6 py-4 text-lg rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
                  Search
                </button>
              </div>
            </div>

            {/* Industry Filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <button
                onClick={() => setSelectedIndustry('')}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedIndustry === ''
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                All Industries
              </button>
              {industries.map((ind: any) => (
                <button
                  key={ind}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`px-4 py-2 rounded-full text-sm ${
                    selectedIndustry === ind
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cases Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">
            {filteredCases.length} Success Cases Found
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Loading cases...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((caseItem: Case) => (
              <div
                key={caseItem.id}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {caseItem.project_name}
                  </h3>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    {caseItem.industry}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {caseItem.pain_point || caseItem.outcome}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {caseItem.technology.slice(0, 4).map((tech: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {caseItem.use_case}
                  </span>
                  <a
                    href={caseItem.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View Source →
                  </a>
                </div>

                {/* Quality Score */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                        style={{ width: `${caseItem.quality_score * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round(caseItem.quality_score * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCases.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No cases found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Case Discovery</h3>
            <p className="text-gray-400">
              Search across thousands of real-world AI Agent implementation success stories.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Copilot</h3>
            <p className="text-gray-400">
              Get personalized recommendations and generate sales scripts with AI.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">ROI Analysis</h3>
            <p className="text-gray-400">
              Calculate expected returns and make data-driven investment decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl p-12 border border-white/10">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">{cases.length}+</div>
              <div className="text-gray-400">Success Cases</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">{industries.length}</div>
              <div className="text-gray-400">Industries</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-gray-400">Use Cases</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">AI Assistant</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">
          <p>ASIP MVP - Building the future of AI Agent intelligence</p>
        </div>
      </footer>
    </main>
  );
}
