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

/**
 * GitHub 数据抓取器 (无 Token 版)
 */
async function collectGitHub() {
  console.log('\n🔄 开始 GitHub 数据采集...\n');

  const results = [];
  const seenUrls = new Set();

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

  console.log(`\n✅ GitHub: 共采集 ${results.length} 个项目`);
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
 * 主采集函数
 */
async function collectAll(sources = ['github', 'hackernews', 'reddit']) {
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
  console.log(`\n💾 已保存到: ${outputFile}`);
  console.log('='.repeat(50));

  return deduped;
}

// 如果直接运行
if (require.main === module) {
  const sources = process.argv.slice(2);
  collectAll(sources.length > 0 ? sources : ['github']).catch(console.error);
}

module.exports = { collectAll, collectGitHub, collectHackerNews, collectReddit };
