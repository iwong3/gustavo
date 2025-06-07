export const getFromCache = (key: string, defaultValue: string) => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key) || defaultValue
    }
    return defaultValue
}

export const saveInCache = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
    }
}

export const clearFromCache = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
    }
}
