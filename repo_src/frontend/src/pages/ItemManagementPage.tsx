import { useState, useEffect } from 'react'
import ItemForm from '../components/ItemForm'
import ItemList from '../components/ItemList'

interface Item {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ItemManagementPageProps {
  apiUrl: string
}

function ItemManagementPage({ apiUrl }: ItemManagementPageProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemsApiUrl = `${apiUrl}/api/items`

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(itemsApiUrl)
      if (!response.ok) {
        throw new Error(`Error fetching items: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setItems(data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching items:', err)
      setError(err.message || 'Unknown error fetching items')
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (name: string, description: string) => {
    try {
      const response = await fetch(`${itemsApiUrl}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Error creating item: ${response.status}` }))
        throw new Error(errorData.detail || `Error creating item: ${response.status}`)
      }
      fetchItems() // Refresh list
    } catch (err: any) {
      console.error('Error adding item:', err)
      setError(err.message || 'Unknown error adding item')
    }
  }

  const deleteItem = async (id: number) => {
    try {
      const response = await fetch(`${itemsApiUrl}/${id}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 204) { // 204 No Content is success for DELETE
        const errorData = await response.json().catch(() => ({ detail: `Error deleting item: ${response.status}` }))
        throw new Error(errorData.detail || `Error deleting item: ${response.status}`)
      }
      fetchItems() // Refresh list
    } catch (err: any) {
      console.error('Error deleting item:', err)
      setError(err.message || 'Unknown error deleting item')
    }
  }

  useEffect(() => {
    fetchItems()
  }, [itemsApiUrl]) // Re-fetch if apiUrl changes (though unlikely for this prop)

  return (
    <div className="page-container">
      <h1>Item Management</h1>
      <p>Create, view, and delete items stored in the backend.</p>

      <div className="card">
        <h2>Add New Item</h2>
        <ItemForm onAddItem={addItem} />
      </div>

      <div className="card">
        <h2>Current Items</h2>
        {loading ? (
          <p>Loading items...</p>
        ) : error ? (
          <p className="error">Error: {error}</p>
        ) : items.length === 0 ? (
          <p>No items found. Add some!</p>
        ) : (
          <ItemList items={items} onDeleteItem={deleteItem} />
        )}
      </div>
    </div>
  )
}

export default ItemManagementPage 