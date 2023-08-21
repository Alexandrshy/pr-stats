const core = require('@actions/core');
const github = require('@actions/github');
// const fs = require('fs');
// const wait = require('./wait');



// most @actions toolkit packages have async methods
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

        console.log('log - pullRequests', pullRequests);

        core.setOutput('average_comments', pullRequests);

        // const ms = core.getInput('milliseconds');
        // core.info(`Waiting ${ms} milliseconds ...`);
        //
        // core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
        // await wait(parseInt(ms));
        // core.info((new Date()).toTimeString());
        //
        // core.setOutput('time', new Date().toTimeString());
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();