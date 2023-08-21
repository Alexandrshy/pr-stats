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
        const percentile75Comments = calculatePercentile(commentsCount, 75);
        const averageComments = totalComments / pullRequests.items.length;

        console.log('log - pullRequests.reactions', pullRequests.items[0].reactions);
        console.log('log - pullRequests.pull_request', pullRequests.items[0].pull_request);
        console.log('log - pullRequests', pullRequests);
        console.log('log - averageComments', averageComments);
        console.log('log - percentile75Comments', percentile75Comments);
        console.log('log - totalRevisions', totalRevisions);

        let metricsContent = `# PR Metrics
        | Metric | Value |
        | --- | ---: |
        | Среднее кол-во комментариев | ${averageComments} |
        | Среднее кол-во возвратов | ${totalRevisions} |
        | 75% | ${percentile75Comments} |
    
        | Title | URL |
        | --- | --- |
        `;

        for (const pr of pullRequests.items) {
            const title = pr.title;
            const url = pr.html_url;
            metricsContent += `| ${title} | ${url} |\n`;
        }

        core.setOutput('average_comments', averageComments);
        core.setOutput('percentile75Comments', percentile75Comments);
        core.setOutput('totalRevisions', totalRevisions);

        fs.writeFileSync('pr_metrics.md', metricsContent);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();