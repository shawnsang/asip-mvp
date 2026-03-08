/**
 * 统一数据抓取器
 * 支持多数据源，带速率限制和错误处理
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * 带速率限制的 fetch 包装器
 */
async function fetchWithRateLimit(url, options = {}, delay = 1000) {
  await new Promise(resolve => setTimeout(resolve, delay));

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'ASIP-Data-Collector/1.0',
      ...options.headers,
    },
  });

  // 检查速率限制
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining === '0') {
    const waitTime = (reset - Date.now() / 1000) * 1000;
    console.log(`⚠️ 速率限制 reached，等待 ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 5000)));
  }

  return response;
}

/**
 * 获取 GitHub 仓库的 README 内容
 */
async function getRepositoryReadme(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;

  try {
    const response = await fetchWithRateLimit(url, {
      headers: {
        'Accept': 'application/vnd.github.raw+json',
      },
    }, 500); // 更快但仍有限制

    if (!response.ok) return null;

    const content = await response.text();
    return content;
  } catch (error) {
    return null;
  }
}

// 敏感词过滤列表
const SENSITIVE_KEYWORDS = [
  'dictatorship', 'dictator', 'communism', 'communists',
  'terrorism', 'terrorist', 'extremism', 'extremist',
  'porn', 'xxx', 'sex', 'adult', 'nsfw',
  'malware', 'virus', 'hack', 'exploit',
  'drug', 'weapon', 'gun', 'bomb',
];

/**
 * 检查项目是否包含敏感内容
 */
function isSensitiveProject(projectName, description, topics) {
  const text = `${projectName} ${description || ''} ${(topics || []).join(' ')}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * GitHub 数据抓取器 (无 Token 版)
 */
async function collectGitHub() {
  console.log('\n🔄 开始 GitHub 数据采集...\n');

  const results = [];
  const seenUrls = new Set();
  let filteredCount = 0;

  for (const query of config.github.searchQueries) {
    console.log(`📊 搜索: "${query}"`);

    for (let page = 1; page <= config.github.maxPages; page++) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+AI&sort=stars&order=desc&page=${page}&per_page=30`;

      try {
        const response = await fetchWithRateLimit(url, {}, config.github.rateLimitDelay);

        if (!response.ok) {
          console.log(`  ⚠️  Page ${page}: ${response.status}`);
          break;
        }

        const data = await response.json();
        const repos = data.items || [];

        if (repos.length === 0) break;

        for (const repo of repos) {
          if (seenUrls.has(repo.html_url)) continue;

          // 过滤敏感项目
          if (isSensitiveProject(repo.name, repo.description, repo.topics)) {
            console.log(`  ⚠️ 过滤敏感项目: ${repo.name}`);
            filteredCount++;
            continue;
          }

          seenUrls.add(repo.html_url);

          // 基本信息
          const projectData = {
            source: 'GitHub',
            source_type: 'repository',
            source_url: repo.html_url,
            project_name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: repo.topics || [],
            owner_type: repo.owner?.type,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            license: repo.license?.name,
            collected_at: new Date().toISOString(),
          };

          // 获取 README (限制前 80 个项目以避免超时)
          if (results.length < 80) {
            const [owner, repoName] = repo.full_name.split('/');
            if (owner && repoName) {
              try {
                const readme = await getRepositoryReadme(owner, repoName);
                projectData.readme_content = readme ? readme.substring(0, 15000) : null;
                console.log(`    ✓ ${repo.name}: ${readme ? 'README OK' : '无'}`);
              } catch (e) {
                projectData.readme_content = null;
              }
              await new Promise(r => setTimeout(r, 600));
            }
          } else {
            projectData.readme_content = null;
          }

          results.push(projectData);
        }

        console.log(`  ✓ Page ${page}: ${repos.length} repos`);

      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
      }

      // 遵守速率限制
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const withReadme = results.filter(r => r.readme_content).length;
  console.log(`\n✅ GitHub: 共采集 ${results.length} 个项目 (过滤 ${filteredCount} 个敏感项目)，其中 ${withReadme} 个包含 README`);
  return results;
}

/**
 * Hacker News 数据抓取器
 */
async function collectHackerNews() {
  console.log('\n🔄 开始 Hacker News 数据采集...\n');

  const results = [];
  const seenUrls = new Set();

  try {
    // 获取 top stories
    const topStoriesUrl = `${config.hackerNews.baseUrl}/topstories.json`;
    const response = await fetchWithRateLimit(topStoriesUrl, {}, config.hackerNews.rateLimitDelay);
    const storyIds = await response.json();

    const itemsToFetch = storyIds.slice(0, config.hackerNews.limit);

    for (let i = 0; i < itemsToFetch.length; i++) {
      const storyId = itemsToFetch[i];

      try {
        const itemUrl = `${config.hackerNews.baseUrl}/item/${storyId}.json`;
        const itemResponse = await fetchWithRateLimit(itemUrl, {}, 200);

        if (!itemResponse.ok) continue;

        const item = await itemResponse.json();

        // 检查是否包含 AI/Agent 相关关键词
        const title = (item.title || '').toLowerCase();
        const isRelevant = config.hackerNews.searchQueries.some(
          q => title.includes(q.toLowerCase())
        );

        if (!isRelevant || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        if (item.url) {
          results.push({
            source: 'HackerNews',
            source_type: 'story',
            source_url: item.url,
            project_name: item.title,
            description: item.text || item.title,
            stars: item.score || 0,
            author: item.by,
            created_at: new Date(item.time * 1000).toISOString(),
            topics: ['HackerNews', '讨论'],
            collected_at: new Date().toISOString(),
          });
        }

        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Fetched ${i + 1}/${itemsToFetch.length}`);
        }

      } catch (error) {
        console.error(`  ⚠️ Error fetching story ${storyId}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

  } catch (error) {
    console.error(`  ✗ Hacker News Error: ${error.message}`);
  }

  console.log(`\n✅ Hacker News: 共采集 ${results.length} 个项目`);
  return results;
}

/**
 * Reddit 数据抓取器 (使用 JSON API)
 */
async function collectReddit() {
  console.log('\n🔄 开始 Reddit 数据采集...\n');

  const results = [];
  const seenUrls = new Set();

  for (const subreddit of config.reddit.subreddits) {
    console.log(`📊 Subreddit: r/${subreddit}`);

    try {
      // 使用 Reddit JSON API
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
      const response = await fetchWithRateLimit(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ASIP/1.0',
        },
      }, config.reddit.rateLimitDelay);

      if (!response.ok) {
        console.log(`  ⚠️ Status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const posts = data.data?.children || [];

      for (const post of posts) {
        const p = post.data;

        // 检查是否包含 AI/Agent 相关内容
        const title = (p.title || '').toLowerCase();
        const isRelevant = config.reddit.searchQueries.some(
          q => title.includes(q.toLowerCase())
        );

        if (!isRelevant) continue;
        if (seenUrls.has(p.url)) continue;
        seenUrls.add(p.url);

        results.push({
          source: 'Reddit',
          source_type: 'post',
          source_url: `https://reddit.com${p.permalink}`,
          project_name: p.title.substring(0, 100),
          description: p.selftext || p.title,
          stars: p.score || 0,
          author: p.author,
          created_at: new Date(p.created_utc * 1000).toISOString(),
          topics: p.tags || ['Reddit', subreddit],
          num_comments: p.num_comments,
          collected_at: new Date().toISOString(),
        });
      }

      console.log(`  ✓ Found ${results.length} relevant posts`);

    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Reddit: 共采集 ${results.length} 个项目`);
  return results;
}

/**
 * Product Hunt 数据抓取器
 */
async function collectProductHunt() {
  console.log('\n🔄 开始 Product Hunt 数据采集...\n');

  const results = [];
  const seenUrls = new Set();

  // 使用 Product Hunt 的每日榜单 API
  const today = new Date().toISOString().split('T')[0];

  try {
    // 获取当日热门产品
    const url = `https://www.producthunt.com/v2/api/graphql?query={
      trendingProducts(date: "${today}", limit: 50) {
        edges {
          node {
            id
            name
            tagline
            url
            votesCount
            topics {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }`;

    const response = await fetchWithRateLimit(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ASIP/1.0',
      },
    }, config.productHunt.rateLimitDelay);

    if (!response.ok) {
      console.log(`  ⚠️ Status: ${response.status}, 尝试备用方法...`);
      // 备用：尝试简单 HTML 抓取
      return await collectProductHuntFallback();
    }

    const data = await response.json();
    const products = data?.data?.trendingProducts?.edges || [];

    for (const edge of products) {
      const p = edge.node;
      const url = `https://producthunt.com${p.url}`;

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      // 检查是否包含 AI/Agent 相关关键词
      const text = `${p.name} ${p.tagline}`.toLowerCase();
      const isRelevant = config.productHunt.searchQueries.some(
        q => text.includes(q.toLowerCase())
      );

      if (isRelevant) {
        const topics = p.topics?.edges?.map(e => e.node.name) || [];
        results.push({
          source: 'ProductHunt',
          source_type: 'product',
          source_url: url,
          project_name: p.name,
          description: p.tagline,
          stars: p.votesCount || 0,
          topics: ['ProductHunt', ...topics],
          collected_at: new Date().toISOString(),
        });
      }
    }

    console.log(`  ✓ Found ${results.length} relevant products`);

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    // 尝试备用方法
    return await collectProductHuntFallback();
  }

  console.log(`\n✅ Product Hunt: 共采集 ${results.length} 个产品`);
  return results;
}

/**
 * Product Hunt 备用抓取方法 (简单 HTML 解析)
 */
async function collectProductHuntFallback() {
  const results = [];
  const seenUrls = new Set();

  try {
    const url = 'https://www.producthunt.com';
    const response = await fetchWithRateLimit(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, 2000);

    if (!response.ok) {
      console.log(`  ⚠️ Fallback failed: ${response.status}`);
      return results;
    }

    const html = await response.text();

    // 提取产品名称和描述
    const namePattern = /"name":"([^"]+)"/g;
    const taglinePattern = /"tagline":"([^"]+)"/g;

    const names = [];
    const taglines = [];

    let match;
    while ((match = namePattern.exec(html)) !== null && names.length < 20) {
      names.push(match[1]);
    }
    while ((match = taglinePattern.exec(html)) !== null && taglines.length < 20) {
      taglines.push(match[1]);
    }

    // 组合
    const minLen = Math.min(names.length, taglines.length);
    for (let i = 0; i < minLen; i++) {
      const text = `${names[i]} ${taglines[i]}`.toLowerCase();
      const isRelevant = config.productHunt.searchQueries.some(
        q => text.includes(q.toLowerCase())
      );

      if (isRelevant) {
        results.push({
          source: 'ProductHunt',
          source_type: 'product',
          source_url: `https://producthunt.com`,
          project_name: names[i],
          description: taglines[i],
          stars: 0,
          topics: ['ProductHunt'],
          collected_at: new Date().toISOString(),
        });
      }
    }

  } catch (error) {
    console.error(`  ✗ Fallback Error: ${error.message}`);
  }

  console.log(`\n✅ Product Hunt (fallback): 共采集 ${results.length} 个产品`);
  return results;
}

/**
 * 主采集函数
 */
async function collectAll(sources = ['github', 'hackernews', 'reddit', 'producthunt']) {
  console.log('='.repeat(50));
  console.log('🚀 ASIP 自动化数据采集开始');
  console.log('='.repeat(50));

  const allData = [];
  const timestamp = new Date().toISOString();

  // 确保输出目录存在
  const outputDir = path.join(__dirname, '../data/raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (sources.includes('github')) {
    const githubData = await collectGitHub();
    allData.push(...githubData);
  }

  if (sources.includes('hackernews')) {
    const hnData = await collectHackerNews();
    allData.push(...hnData);
  }

  if (sources.includes('reddit')) {
    const redditData = await collectReddit();
    allData.push(...redditData);
  }

  if (sources.includes('producthunt')) {
    const phData = await collectProductHunt();
    allData.push(...phData);
  }

  // 去重
  const seen = new Set();
  const deduped = allData.filter(item => {
    const key = `${item.source}:${item.source_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 保存原始数据
  const outputFile = path.join(outputDir, `raw_data_${timestamp.replace(/:/g, '-')}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deduped, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('📊 采集统计:');
  console.log(`   - 总计: ${deduped.length} 条`);
  console.log(`   - GitHub: ${deduped.filter(d => d.source === 'GitHub').length}`);
  console.log(`   - Hacker News: ${deduped.filter(d => d.source === 'HackerNews').length}`);
  console.log(`   - Reddit: ${deduped.filter(d => d.source === 'Reddit').length}`);
  console.log(`   - Product Hunt: ${deduped.filter(d => d.source === 'ProductHunt').length}`);
  console.log(`\n💾 已保存到: ${outputFile}`);
  console.log('='.repeat(50));

  return deduped;
}

// 如果直接运行
if (require.main === module) {
  const sources = process.argv.slice(2);
  collectAll(sources.length > 0 ? sources : ['github', 'hackernews', 'reddit', 'producthunt']).catch(console.error);
}

module.exports = { collectAll, collectGitHub, collectHackerNews, collectReddit, collectProductHunt };
