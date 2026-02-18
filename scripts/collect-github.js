/**
 * GitHub 数据采集脚本
 * 功能：从 GitHub API 获取 AI Agent 相关项目
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

// 搜索关键词
const SEARCH_QUERIES = [
  'AI Agent',
  'AI automation',
  'Browser Agent',
  'LLM Agent',
  'GPT Agent',
  'Autonomous Agent',
  'AI chatbot',
  'RPA AI',
  'workflow automation',
  '智能代理',
];

/**
 * 搜索 GitHub 仓库
 */
async function searchRepositories(query, page = 1, perPage = 30) {
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${page}&per_page=${perPage}`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.text();
    console.error(`GitHub API Error: ${response.status}`, error);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * 获取仓库的 README 内容
 */
async function getRepositoryReadme(owner, repo) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // 解码 base64 内容
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    console.error(`Error fetching README for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * 获取仓库的主题/标签
 */
async function getRepositoryTopics(owner, repo) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/topics`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.names || [];
  } catch (error) {
    return [];
  }
}

/**
 * 主采集函数
 */
async function collectGitHubData() {
  console.log('🚀 开始采集 GitHub 数据...');

  const allProjects = [];
  const seenUrls = new Set();

  for (const query of SEARCH_QUERIES) {
    console.log(`\n📊 搜索: "${query}"`);

    // 获取前 3 页结果
    for (let page = 1; page <= 3; page++) {
      console.log(`  - Page ${page}...`);

      const repos = await searchRepositories(query, page);

      if (repos.length === 0) {
        break;
      }

      for (const repo of repos) {
        // 去重
        if (seenUrls.has(repo.html_url)) {
          continue;
        }
        seenUrls.add(repo.html_url);

        // 提取基本信息
        const project = {
          source: 'GitHub',
          source_url: repo.html_url,
          project_name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          topics: repo.topics || [],
          owner_type: repo.owner.type,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          license: repo.license?.name,
        };

        allProjects.push(project);
      }

      // 遵守 GitHub API 速率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ 共采集 ${allProjects.length} 个项目`);

  // 保存到文件供后续处理
  const fs = require('fs');
  fs.writeFileSync(
    './github_projects_raw.json',
    JSON.stringify(allProjects, null, 2)
  );

  return allProjects;
}

/**
 * 导出为 CSV 格式
 */
function exportToCSV(projects) {
  const headers = [
    'source',
    'source_url',
    'project_name',
    'full_name',
    'description',
    'stars',
    'forks',
    'language',
    'topics',
    'owner_type',
    'license',
  ];

  const rows = projects.map(p => [
    p.source,
    p.source_url,
    p.project_name,
    p.full_name,
    p.description?.replace(/"/g, '""') || '',
    p.stars,
    p.forks,
    p.language,
    p.topics?.join(', ') || '',
    p.owner_type,
    p.license || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(',')),
  ].join('\n');

  const fs = require('fs');
  fs.writeFileSync('./github_projects.csv', csv);
  console.log('📄 已导出为 github_projects.csv');
}

// 如果直接运行此脚本
if (require.main === module) {
  collectGitHubData()
    .then(projects => {
      console.log(`\n🎉 采集完成！共 ${projects.length} 个项目`);
      exportToCSV(projects);
    })
    .catch(error => {
      console.error('❌ 采集失败:', error);
      process.exit(1);
    });
}

module.exports = {
  collectGitHubData,
  searchRepositories,
  getRepositoryReadme,
  getRepositoryTopics,
};
