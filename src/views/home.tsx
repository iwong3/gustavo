import axios from 'axios'
import { useState } from 'react'

const googleSheetCsvUrl =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

export const Home = () => {
    const [data, setData] = useState<string>()

    axios.get(googleSheetCsvUrl).then((res: any) => {
        setData(res.data)
    })

    return (
        <div>
            {/* {data} */}
            {data &&
                data.split('\n').map((row: string) => {
                    return <div>{row}</div>
                })}
        </div>
    )
}
