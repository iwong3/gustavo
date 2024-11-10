import axios from 'axios'
import dayjs from 'dayjs'

const majorVersion = 1 // major version should be updated when there are breaking changes
const minorVersion = 0 // minor version should be updated when there are new features
const patchVersion = 3 // patch version should be updated when there are bug fixes

export const formattedVersion = () => {
    return `v${majorVersion}.${minorVersion}.${patchVersion}`
}

const GITHUB_REPOS_API = 'https://api.github.com/repos'
const GITHUB_REPOS_API_BRANCHES_ENDPOINT = '/branches'
const GITHUB_REPOS_API_COMMITS_ENDPOINT = '/commits'

const GITHUB_USER = 'iwong3'
const GITHUB_REPO = 'gustavo'

export const getLatestDeployedAt = async () => {
    let deployedAt = ''
    try {
        const branchesRes = await axios.get(
            GITHUB_REPOS_API +
                '/' +
                GITHUB_USER +
                '/' +
                GITHUB_REPO +
                GITHUB_REPOS_API_BRANCHES_ENDPOINT
        )
        if (!branchesRes.data) {
            throw new Error('No branches found')
        }

        const GITHUB_PAGES_BRANCH_SHA = branchesRes.data.find(
            (branch: any) => branch.name === 'gh-pages'
        ).commit.sha

        const commitsRes = await axios.get(
            GITHUB_REPOS_API +
                '/' +
                GITHUB_USER +
                '/' +
                GITHUB_REPO +
                GITHUB_REPOS_API_COMMITS_ENDPOINT +
                '?per_page=1&sha=' +
                GITHUB_PAGES_BRANCH_SHA
        )
        if (!commitsRes.data || !commitsRes.data[0]) {
            throw new Error('No commits found')
        }

        const deployedAtString = commitsRes.data[0].commit?.author?.date
        if (!deployedAtString || deployedAtString === '') {
            throw new Error('No deployedAt found')
        }

        deployedAt = dayjs(deployedAtString).format('M/D h:mm A')
    } catch (err) {
        throw err
    }

    return deployedAt
}
