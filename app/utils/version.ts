import dayjs from 'dayjs'

const majorVersion = 1 // major version should be updated when there are breaking changes
const minorVersion = 2 // minor version should be updated when there are new features
const patchVersion = 1 // patch version should be updated when there are bug fixes

export const formattedVersion = () => {
    return `v${majorVersion}.${minorVersion}.${patchVersion}`
}

const GITHUB_REPOS_API = 'https://api.github.com/repos'
const GITHUB_USER = 'iwong3'
const GITHUB_REPO = 'gustavo'
// Vercel auto-deploys from main, so its latest commit ≈ latest deploy
const DEPLOY_BRANCH = 'main'

interface GithubCommit {
    commit?: {
        author?: {
            date?: string
        }
    }
}

export const getLatestDeployedAt = async () => {
    const res = await fetch(
        `${GITHUB_REPOS_API}/${GITHUB_USER}/${GITHUB_REPO}/commits?per_page=1&sha=${DEPLOY_BRANCH}`
    )
    if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`)
    }

    const commits: GithubCommit[] = await res.json()
    const deployedAtString = commits[0]?.commit?.author?.date
    if (!deployedAtString) {
        throw new Error('No deployedAt found')
    }

    return dayjs(deployedAtString).format('M/D h:mm A')
}
