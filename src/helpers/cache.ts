export const getFromCache = (key: string, defaultValue: string) => {
    return localStorage.getItem(key) || defaultValue
}

export const saveInCache = (key: string, value: string) => {
    localStorage.setItem(key, value)
}
