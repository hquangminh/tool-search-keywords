import React, { useState } from 'react'
import './App.css' // Import the CSS file
import * as XLSX from 'xlsx'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [phraseFrequency, setPhraseFrequency] = useState([])
  const [keywords, setKeywords] = useState([])
  const [matchedKeywords, setMatchedKeywords] = useState([])
  const [selectedKeywords, setSelectedKeywords] = useState([])
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(worksheet)
      const keywords = json.map((row) => ({
        original: row['Keyword'],
        formatted: removeAccentsAndFormat(row['Keyword']),
      }))
      setKeywords(keywords)
    }
    reader.readAsArrayBuffer(file)
  }

  const removeAccentsAndFormat = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/\s+/g, '-')
      .toLowerCase()
  }

  const handleSearch = async () => {
    setLoading(true) // Start loading
    try {
      const encodedQuery = encodeURIComponent(query.trim().replace(/\s+/g, '+'))
      const response = await fetch(`http://localhost:3001/search?q=${encodedQuery}`)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      setResults(data)
      calculatePhraseFrequency(data)
      matchKeywords(data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false) // Stop loading
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

  const matchKeywords = (data) => {
    const urls = data.map((result) => result.url.toLowerCase())
    const matched = keywords.filter((keyword) => {
      const normalizedKeyword = keyword.formatted
      return urls.some((url) => url.includes(normalizedKeyword))
    })
    setMatchedKeywords(matched)
  }

  const highlightMatchedKeywords = (url) => {
    let highlightedUrl = url
    matchedKeywords.forEach((keyword) => {
      const regex = new RegExp(keyword.formatted, 'gi')
      highlightedUrl = highlightedUrl.replace(regex, (match) => `<span class="highlight">${match}</span>`)
    })
    return highlightedUrl
  }

  const addKeywordToBox = (keyword) => {
    if (!selectedKeywords.includes(keyword)) {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
  }

  const removeKeywordFromBox = (keyword) => {
    setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
  }

  const downloadKeywords = () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(selectedKeywords.map((keyword) => ({ Keyword: keyword.original })))
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Keywords')
    XLSX.writeFile(workbook, 'keywords.xlsx')
  }

  return (
    <div className='container'>
      <input type='text' value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Enter search query' />
      <button onClick={handleSearch}>Search</button>
      {loading && <p>Loading...</p>}
      <input type='file' onChange={handleFileUpload} />
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
      <div className='columns-container'>
        <div className='left-column'>
          <div className='keywords-container'>
            <strong>All Keywords:</strong>
            <ul>
              {keywords.map((keyword, index) => (
                <li key={index} className={matchedKeywords.includes(keyword) ? 'highlight' : ''}>
                  {keyword.formatted}
                  {selectedKeywords.includes(keyword) ? (
                    <span style={{ color: 'green' }}>✔</span>
                  ) : (
                    <button onClick={() => addKeywordToBox(keyword)}>+</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className='right-column'>
          <ul className='results'>
            {results.map((result, index) => (
              <li key={index}>
                <span style={{ fontWeight: 'bold', color: 'green' }}>Title:</span>
                <a className='title' href={result.url} target='_blank' rel='noopener noreferrer'>
                  {result.title}
                </a>
                <p className='url'>
                  <span style={{ fontWeight: 'bold', color: 'black' }}>URL:</span>
                  <span dangerouslySetInnerHTML={{ __html: highlightMatchedKeywords(result.url) }}></span>
                </p>
                <p className='description'>
                  <span style={{ fontWeight: 'bold', color: 'black' }}>Description:</span> {result.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='footer'>
        <div className='selected-keywords-box'>
          <strong>Selected Keywords:</strong>
          <ul>
            {selectedKeywords.map((keyword, index) => (
              <li key={index}>
                {keyword.original}
                <button onClick={() => removeKeywordFromBox(keyword)}>x</button>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={downloadKeywords}>Download as Excel</button>
      </div>
    </div>
  )
}

export default App
