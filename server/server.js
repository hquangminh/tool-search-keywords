const express = require('express')
const puppeteer = require('puppeteer')
const cors = require('cors')

const app = express()
const port = 3001

app.use(cors())

app.get('/search', async (req, res) => {
  const query = req.query.q
  if (!query) {
    return res.status(400).send('Query parameter is required')
  }

  try {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'domcontentloaded' })

    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.tF2Cxc')).slice(0, 10)
      return items.map((item) => ({
        title: item.querySelector('.DKV0Md')?.innerText || '',
        url: item.querySelector('.yuRUbf a')?.href || '',
        description: item.querySelector('.VwiC3b')?.innerText || '',
      }))
    })

    await browser.close()
    res.json(results)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal server error')
  }
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
