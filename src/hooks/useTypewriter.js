import { useState, useEffect } from 'react'

export function useTypewriter(text, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)

    let intervalId
    const timeoutId = setTimeout(() => {
      let currentIndex = 0
      intervalId = setInterval(() => {
        currentIndex++
        setDisplayed(text.slice(0, currentIndex))
        if (currentIndex >= text.length) {
          clearInterval(intervalId)
          setDone(true)
        }
      }, speed)
    }, startDelay)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [text, speed, startDelay])

  return { displayed, done }
}
