import { resolve } from 'path'
import React, { useEffect, useState } from 'react'
import './index.css'

enum TaskStatus {
    IDLE = '空闲',
    IN_PROGRESS = '进行中',
    COMPLETED = '已完成',
    FAILED = '失败'
}

const fileList = Array.from(
    {
        length: 6
    },
    (_, index) => String(index + 1)
)


const Concurrency = 3
const MaxRetryNum = 3

export default function Index() {
    const [tastStatus, setTaskStatus] = useState(TaskStatus.IDLE)
    const [lists, setLists] = useState([])
    const [retryObj, setRetryObj] = useState<{
        [x: any]: number
    } | {}>({})

    const [log, setLog] = useState([])
    const [finishedNum, setFinishedNum] = useState<number>(0)

    let count = 0

    // 加载配置文件
    const loadConfig = (): Promise<string[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(fileList)
            }, 100)
        })
    }

    function simulateSuccess(successRate = 0.9) {
        return Math.random() < successRate;
    }

    const initSystem = () => {
        setTimeout(() => {
            return Promise.resolve(1)
        }, 1000)
    }


    // 加载文件
    const loadFile = (fileName: string) => {
        const isSuccess = simulateSuccess(0.9); // 90%成功率
        if (!isSuccess) {
            return new Promise((_, reject) => {
                const error = new Error('load file failed');
                error.fileName = fileName; // 直接添加属性
                error.type = 'load file failed '

                reject(error);
            })
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(fileName)
            }, ((Math.random() * 2) + 1) * 1000)
        })
    }

    const exec = async (taskUrls, taskUrl) => {
        count++
        console.log(77, taskUrl)
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    const error = new Error('load file time out');
                    error.fileName = taskUrl; // 直接添加属性
                    error.type = 'file load time out '
                    reject(error);
                }, 2500);
            });
            const res = await Promise.race([
                loadFile(taskUrl),
                timeoutPromise
            ]);
            console.log(`${res} onload success'`)
            // if (res === undefined) {
            //     debugger
            // }
            setLog(prev => {
                return [...prev, `${res} onload success`]
            })
            setFinishedNum(prev => prev + 1)
        }
        catch (error) {
            let url = error?.fileName
            if (!url) return
            setLog(prev => {
                return [...prev, `${error?.fileName} ${error?.type}`]
            })

            if (retryObj?.[url] > MaxRetryNum) {
                console.log(`${url} 已达到最大重试次数: ${MaxRetryNum}, 忽略该任务.`)
                return
            }
            setRetryObj(prev => {
                return {
                    ...prev,
                    [url]: (prev[url] || 0) + 1
                }
            })
            taskUrls.push(url)
        }
        finally {
            count--
            if (count < Concurrency && taskUrls.length > 0) {
                const tasks = taskUrls.shift()
                await exec(taskUrls, tasks)
            }
        }
    }

    const onStartBtnClick = async () => {
        setTaskStatus(TaskStatus.IN_PROGRESS)
        try {
            const lists = await loadConfig()
            setLists(lists)
            const urls = [...lists]
            for (let i = 0; i < Concurrency; i++) {
                const task2 = urls.shift()
                exec(urls, task2)
            }
        }
        catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (finishedNum === lists.length && finishedNum > 0) {
            setTaskStatus(TaskStatus.COMPLETED)
            initSystem()
        }
    }, [finishedNum, lists.length, initSystem, setTaskStatus])

    return (
        <div>
            <button onClick={onStartBtnClick} style={{
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                borderRadius: '3px'
            }}>开始处理</button>
            <div>状态:{tastStatus}</div>

            {/* <div>{finishedNum}</div>
            <div>{lists.length}</div> */}
            <div className="progress-container">
                <div className="progress-bar" id="progressBar">
                    <div className="progress-fill" style={{ width: `${Math.round((finishedNum / (lists.length || 1)) * 100)}%` }}></div>
                </div>
                <span className="progress-text" id="progressText">{Math.round((finishedNum / (lists.length || 1)) * 100)}%</span>
            </div>

            {
                log?.length > 0 &&
                <div style={{
                    border: '1px solid red',
                    padding: 10,
                    margin: 20
                }}>
                    {
                        log.map((item, index) => {
                            return <div key={index}>{item}</div>
                        })
                    }
                </div>
            }

        </div>
    )
}
