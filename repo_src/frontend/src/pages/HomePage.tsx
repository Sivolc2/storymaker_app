import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface HomePageProps {
  apiUrl: string;
}

function HomePage({ apiUrl }: HomePageProps) {
  const [backendMessage, setBackendMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${apiUrl}/api/hello`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        return response.json()
      })
      .then(data => {
        setBackendMessage(data.message)
        setLoading(false)
      })
      .catch(error => {
        console.error("Error fetching hello API:", error)
        setBackendMessage(`Failed to fetch message from backend: ${error.message}`)
        setLoading(false)
      })
  }, [apiUrl])

  return (
    <div className="page-container">
      <h1>Welcome to Storymaker!</h1>
      <p>
        Unleash your creativity with Storymaker, an AI-assisted platform designed to help you craft compelling narratives from concept to completion.
        Whether you're an aspiring novelist, a seasoned screenwriter, or just love telling stories, Storymaker provides the tools to structure your ideas,
        develop rich worlds, and generate engaging prose.
      </p>
      <p>Navigate to the <Link to="/storymaker" style={{color: "var(--accent-color)"}}>Storymaker</Link> tab to begin your writing journey.</p>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Backend Status</h2>
        {loading ? (
          <p>Loading status from backend...</p>
        ) : (
          <p>Message from backend (/api/hello): <strong>{backendMessage}</strong></p>
        )}
      </div>
    </div>
  )
}

export default HomePage 