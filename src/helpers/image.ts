export const getUcUrlFromOpenUrl = (openUrl: string): string => {
    const url = new URL(openUrl)
    const ucUrl = 'https://drive.google.com/thumbnail?id=' + url.searchParams.get('id')
    return ucUrl
}
