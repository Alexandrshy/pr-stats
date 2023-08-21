const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

function calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    values.sort((a, b) => a - b);
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return values[lower] * (1 - weight) + values[upper] * weight;
}

async function run() {
    try {
        const token = process.env.GH_TOKEN;
        const searchQuery = process.env.SEARCH_QUERY;
        const percentile = process.env.PERCENTILE || 75;

        if (!token || !searchQuery) {
            core.setFailed('GH_TOKEN and SEARCH_QUERY must be defined');
            return;
        }

        const octokit = github.getOctokit(token);

        const { data: pullRequests } = await octokit.rest.search.issuesAndPullRequests({
            q: searchQuery
        });

        if (!pullRequests.items) {
            core.setFailed('There is no data for your request');
            return;
        }

        let totalComments = 0;
        let totalRevisions = 0;

        for (const pr of pullRequests.items) {
            totalComments += pr.comments;

            if (pr.requested_reviewers) {
                totalRevisions += pr.requested_reviewers.length;
            }
        }

        const commentsCount = pullRequests.items.map(pr => pr.comments);
        const percentileComments = calculatePercentile(commentsCount, percentile);
        const averageComments = totalComments / pullRequests.items.length;
        const averageRevisions = totalRevisions / pullRequests.items.length;

        console.log('log - pullRequests.reactions', pullRequests.items[0].reactions);
        console.log('log - pullRequests.pull_request', pullRequests.items[0].pull_request);
        console.log('log - pullRequests', pullRequests);
        console.log('log - averageComments', averageComments);
        console.log('log - percentile75Comments', percentileComments);
        console.log('log - averageRevisions', averageRevisions);

        let metricsContent = `# PR Metrics
| Metric | Value |
| --- | --- |
| Среднее кол-во комментариев | ${averageComments} |
| ${percentile}% | ${percentileComments} |
| Среднее кол-во возвратов | ${averageRevisions} |

| Title | URL | Comments | Returns for revision |
| --- | --- | --- | --- |
`;

        for (const pr of pullRequests.items) {
            const title = pr.title;
            const url = pr.html_url;
            const comments = pr.comments;
            const revision = pr.requested_reviewers ? pr.requested_reviewers.length : 0;

            metricsContent += `| ${title} | ${url} | ${comments} | ${revision} |\n`;
        }

        core.setOutput('average_comments', averageComments);
        core.setOutput('percentileComments', percentileComments);
        core.setOutput('averageRevisions', averageRevisions);

        fs.writeFileSync('pr_metrics.md', metricsContent);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();