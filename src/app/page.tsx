'use client';

import { useState, useEffect, useRef } from 'react';

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
  raw_data?: any;
  // LLM 结构化抽取的新字段
  solution_approach?: string;
  business_function?: string;
  target_company?: string;
  implementation_complexity?: string;
  competitive_advantage?: string;
  use_case_summary?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '您好！我是 ASIP AI Copilot，您的AI Agent智能助手。我可以帮您搜索案例、生成销售话术、估算ROI。请问有什么可以帮您？' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ROI Calculator state
  const [isROIOpen, setIsROIOpen] = useState(false);
  const [roiIndustry, setRoiIndustry] = useState('通用');
  const [roiUseCase, setRoiUseCase] = useState('流程自动化');
  const [companySize, setCompanySize] = useState('中型企业');
  const [roiResult, setRoiResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Filter state
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [sortBy, setSortBy] = useState('quality');

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchCases() {
    try {
      const res = await fetch('/api/cases?limit=50');
      const data = await res.json();
      setCases(data.data || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.data }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，请稍后再试。' }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function calculateROI() {
    setIsCalculating(true);
    setRoiResult(null);
    try {
      const res = await fetch('/api/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: roiIndustry,
          useCase: roiUseCase,
          companySize: companySize,
        }),
      });
      const data = await res.json();
      setRoiResult(data.data);
    } catch (error) {
      console.error('ROI calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }

  const filteredCases = cases.filter((c: Case) => {
    const matchesSearch = !searchTerm ||
      c.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.use_case.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.technology.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesIndustry = !selectedIndustry || c.industry === selectedIndustry;
    const matchesUseCase = !selectedUseCase || c.use_case === selectedUseCase;

    return matchesSearch && matchesIndustry && matchesUseCase;
  }).sort((a, b) => {
    if (sortBy === 'quality') {
      return b.quality_score - a.quality_score;
    } else if (sortBy === 'name') {
      return a.project_name.localeCompare(b.project_name);
    } else {
      return 0;
    }
  });

  const industries = Array.from(
    new Set(cases.map((c: Case) => c.industry))
  );

  const useCases = Array.from(
    new Set(cases.map((c: Case) => c.use_case))
  );

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
            <div className="flex flex-wrap justify-center gap-2 mb-3">
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

            {/* Use Case Filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              <button
                onClick={() => setSelectedUseCase('')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  selectedUseCase === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                All Use Cases
              </button>
              {useCases.map((uc: any) => (
                <button
                  key={uc}
                  onClick={() => setSelectedUseCase(uc)}
                  className={`px-3 py-1.5 rounded-full text-xs ${
                    selectedUseCase === uc
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {uc}
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="quality" className="bg-gray-800">按质量评分</option>
            <option value="name" className="bg-gray-800">按名称排序</option>
          </select>
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
                onClick={() => setSelectedCase(caseItem)}
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

          <div
            onClick={() => setIsChatOpen(true)}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Copilot</h3>
            <p className="text-gray-400">
              Get personalized recommendations and generate sales scripts with AI.
            </p>
          </div>

          <div
            onClick={() => setIsROIOpen(true)}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-green-500/50 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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
              <div className="text-4xl font-bold text-white mb-2">{totalCount}</div>
              <div className="text-gray-400">Success Cases</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">{industries.length}</div>
              <div className="text-gray-400">Industries</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">
                {new Set(cases.map((c: Case) => c.use_case)).size}
              </div>
              <div className="text-gray-400">Use Cases</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">AI Assistant</div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedCase(null)}
          ></div>
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl">
            <button
              onClick={() => setSelectedCase(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-4">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-3">
                  {selectedCase.project_name}
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                    {selectedCase.industry}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
                    {selectedCase.use_case}
                  </span>
                  {selectedCase.business_function && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full">
                      {selectedCase.business_function}
                    </span>
                  )}
                </div>
              </div>

              {/* 销售信息区域 */}
              <div className="space-y-4 mb-6">
                {/* 痛点 */}
                {(selectedCase.pain_point || selectedCase.raw_data?.description) && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-red-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      解决的痛点
                    </h3>
                    <p className="text-gray-200">
                      {selectedCase.pain_point || selectedCase.raw_data?.description}
                    </p>
                  </div>
                )}

                {/* 解决方案 */}
                {selectedCase.solution_approach && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-green-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      解决方案
                    </h3>
                    <p className="text-gray-200">{selectedCase.solution_approach}</p>
                  </div>
                )}

                {/* 目标企业 */}
                {selectedCase.target_company && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      目标客户
                    </h3>
                    <p className="text-gray-200">{selectedCase.target_company}</p>
                  </div>
                )}

                {/* 竞争优势 */}
                {selectedCase.competitive_advantage && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      竞争优势
                    </h3>
                    <p className="text-gray-200">{selectedCase.competitive_advantage}</p>
                  </div>
                )}

                {/* 实施复杂度 */}
                {selectedCase.implementation_complexity && (
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">实施复杂度:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedCase.implementation_complexity === '低' ? 'bg-green-500/20 text-green-300' :
                      selectedCase.implementation_complexity === '中' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {selectedCase.implementation_complexity}
                    </span>
                  </div>
                )}
              </div>

              {/* Technology */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">技术栈</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.technology?.map((tech: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {selectedCase.raw_data?.stars?.toLocaleString() || '-'}
                  </div>
                  <div className="text-gray-400 text-xs">Stars</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {selectedCase.raw_data?.forks?.toLocaleString() || '-'}
                  </div>
                  <div className="text-gray-400 text-xs">Forks</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {selectedCase.raw_data?.language || '-'}
                  </div>
                  <div className="text-gray-400 text-xs">Language</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {Math.round(selectedCase.quality_score * 100)}%
                  </div>
                  <div className="text-gray-400 text-xs">质量</div>
                </div>
              </div>

              {/* Source Link */}
              {selectedCase.source_url && (
                <a
                  href={selectedCase.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  <span>查看源码</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROI Calculator Modal */}
      {isROIOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsROIOpen(false)}
          ></div>
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-lg w-full border border-white/10 shadow-2xl">
            <button
              onClick={() => setIsROIOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">ROI 计算器</h2>

            <div className="space-y-4 mb-6">
              {/* Industry */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">行业</label>
                <select
                  value={roiIndustry}
                  onChange={(e) => setRoiIndustry(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="通用" className="bg-gray-800">通用</option>
                  <option value="金融" className="bg-gray-800">金融</option>
                  <option value="医疗" className="bg-gray-800">医疗</option>
                  <option value="教育" className="bg-gray-800">教育</option>
                  <option value="零售" className="bg-gray-800">零售</option>
                  <option value="制造" className="bg-gray-800">制造</option>
                  <option value="物流" className="bg-gray-800">物流</option>
                  <option value="地产" className="bg-gray-800">地产</option>
                </select>
              </div>

              {/* Use Case */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">用例场景</label>
                <select
                  value={roiUseCase}
                  onChange={(e) => setRoiUseCase(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="智能客服" className="bg-gray-800">智能客服</option>
                  <option value="流程自动化" className="bg-gray-800">流程自动化</option>
                  <option value="数据分析" className="bg-gray-800">数据分析</option>
                  <option value="AI 助手" className="bg-gray-800">AI 助手</option>
                  <option value="内容生成" className="bg-gray-800">内容生成</option>
                  <option value="知识库" className="bg-gray-800">知识库</option>
                  <option value="搜索" className="bg-gray-800">搜索</option>
                  <option value="其他" className="bg-gray-800">其他</option>
                </select>
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">企业规模</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="小型企业" className="bg-gray-800">小型企业 (50人以下)</option>
                  <option value="中型企业" className="bg-gray-800">中型企业 (50-500人)</option>
                  <option value="大型企业" className="bg-gray-800">大型企业 (500人以上)</option>
                </select>
              </div>
            </div>

            <button
              onClick={calculateROI}
              disabled={isCalculating}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
            >
              {isCalculating ? '计算中...' : '计算 ROI'}
            </button>

            {/* Results */}
            {roiResult && (
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">估算结果</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{roiResult.labor_savings}</div>
                    <div className="text-gray-400 text-sm">节省人力 (人/年)</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">¥{roiResult.annual_savings?.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">年节省成本</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{roiResult.payback_period}</div>
                    <div className="text-gray-400 text-sm">投资回报期 (月)</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      roiResult.confidence === '高' ? 'text-green-400' :
                      roiResult.confidence === '中' ? 'text-yellow-400' : 'text-red-400'
                    }`}>{roiResult.confidence}</div>
                    <div className="text-gray-400 text-sm">置信度</div>
                  </div>
                </div>
                {roiResult.note && (
                  <p className="text-gray-500 text-xs mt-3 text-center">{roiResult.note}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-white/10 flex flex-col z-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Copilot</h3>
                <p className="text-gray-400 text-xs">在线</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-white/10 text-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">
          <p>ASIP MVP - Building the future of AI Agent intelligence</p>
        </div>
      </footer>
    </main>
  );
}
