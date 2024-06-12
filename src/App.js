import React, { useState } from 'react'
import './App.css' // Import the CSS file

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [phraseFrequency, setPhraseFrequency] = useState([])

  const handleSearch = async () => {
    try {
      const encodedQuery = encodeURIComponent(query.trim().replace(/\s+/g, '+'))
      const response = await fetch(`http://localhost:3001/search?q=${encodedQuery}`)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      setResults(data)
      calculatePhraseFrequency(data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const calculatePhraseFrequency = (data) => {
    const text = data
      .reduce((acc, item) => {
        acc.push(item.title)
        acc.push(item.description)
        return acc
      }, [])
      .join(' ')
      .toLowerCase()

    const words = text
      .split(/\s+/)
      .filter((word) => word.length > 1 && !/^\d+$/.test(word) && !/\d/.test(word) && !/\d{1,2} [a-z]{3,4} \d{4}/.test(word))
    const phrases = {}

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`
      phrases[phrase] = (phrases[phrase] || 0) + 1
    }

    const frequency = Object.entries(phrases)
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)

    setPhraseFrequency(frequency)
  }

  return (
    <div className='container'>
      <input type='text' value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Enter search query' />
      <button onClick={handleSearch}>Search</button>
      <div className='phrase-frequency-box'>
        <strong>Phrase Frequency:</strong>
        <div className='phrase-frequency-scroll'>
          <ul>
            {phraseFrequency.map((item, index) => (
              <li key={index}>
                <span>{item.phrase}:</span> <span>{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ul className='results'>
        {results.map((result, index) => (
          <li key={index}>
            <span style={{ fontWeight: 'bold', color: 'green' }}>Title:</span>
            <a className='title' href={result.url} target='_blank' rel='noopener noreferrer'>
              {result.title}
            </a>
            <p className='url'>
              <span style={{ fontWeight: 'bold', color: 'black' }}>URL:</span> {result.url}
            </p>
            <p className='description'>
              <span style={{ fontWeight: 'bold', color: 'black' }}>Description:</span> {result.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
