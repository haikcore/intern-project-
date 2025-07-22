import React, { useEffect, useRef, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Checkbox } from 'primereact/checkbox'
import { OverlayPanel } from 'primereact/overlaypanel'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import type { DataTablePageEvent } from 'primereact/datatable'

import 'primereact/resources/themes/lara-light-indigo/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'

interface ArtworkData {
  id: number
  title: string
  artist_display: string
}

const App = () => {
  const [artworks, setArtworks] = useState<ArtworkData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCount, setSelectedCount] = useState(0)
  const [selectedItems, setSelectedItems] = useState(new Set<number>())
  const [unselectedItems, setUnselectedItems] = useState(new Set<number>())
  const [totalItems, setTotalItems] = useState(1000)
  
  const overlayPanelRef = useRef<OverlayPanel>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const toastRef = useRef<Toast>(null)
  const ITEMS_PER_PAGE = 12
  const itemsCache = useRef(new Map<number, ArtworkData>())

  // TODO: maybe add error handling later
  const loadArtworks = async (pageNumber: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`https://api.artic.edu/api/v1/artworks?page=${pageNumber}`)
      const data = await res.json()
      
      const processedArtworks = data.data.map((artwork: any) => {
        return {
          id: artwork.id,
          title: artwork.title || 'Untitled',
          artist_display: artwork.artist_display || 'Unknown Artist'
        }
      })
      
      // cache the items for selection stuff
      processedArtworks.forEach((item: ArtworkData) => {
        itemsCache.current.set(item.id, item)
      })
      
      setArtworks(processedArtworks)
      if (data.pagination && data.pagination.total) {
        setTotalItems(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to load artworks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadArtworks(currentPage)
  }, [currentPage])

  // auto-select logic when user specifies a number
  useEffect(() => {
    if (!selectedCount) return
    
    let currentlySelected = selectedItems.size
    if (currentlySelected >= selectedCount) return
    
    const newSelected = new Set(selectedItems)
    const availableIds = artworks.map(item => item.id)
    
    for (const id of availableIds) {
      if (!newSelected.has(id) && !unselectedItems.has(id)) {
        newSelected.add(id)
        currentlySelected++
        if (currentlySelected >= selectedCount) {
          break
        }
      }
    }
    setSelectedItems(newSelected)
  }, [artworks, selectedCount, selectedItems, unselectedItems])

  const handlePageChange = (event: DataTablePageEvent) => {
    const newPage = (event.page || 0) + 1
    setCurrentPage(newPage)
  }

  const handleRowSelect = (e: { data: ArtworkData }) => {
    const updatedSelected = new Set(selectedItems)
    updatedSelected.add(e.data.id)
    
    const updatedUnselected = new Set(unselectedItems)
    updatedUnselected.delete(e.data.id)
    
    setSelectedItems(updatedSelected)
    setUnselectedItems(updatedUnselected)
    setSelectedCount(updatedSelected.size)
  }

  const handleRowUnselect = (e: { data: ArtworkData }) => {
    const updatedSelected = new Set(selectedItems)
    updatedSelected.delete(e.data.id)
    
    const updatedUnselected = new Set(unselectedItems)
    updatedUnselected.add(e.data.id)
    
    setSelectedItems(updatedSelected)
    setUnselectedItems(updatedUnselected)
    setSelectedCount(updatedSelected.size)
  }

  const handleSelectionChange = (e: { value: ArtworkData[] }) => {
    const currentlySelected = new Set(e.value.map(artwork => artwork.id))
    const newSelectedIds = new Set(selectedItems)
    const newUnselectedIds = new Set(unselectedItems)
    
    artworks.forEach(artwork => {
      if (currentlySelected.has(artwork.id)) {
        newSelectedIds.add(artwork.id)
        newUnselectedIds.delete(artwork.id)
      } else {
        newSelectedIds.delete(artwork.id)
        newUnselectedIds.add(artwork.id)
      }
    })
    
    setSelectedItems(newSelectedIds)
    setUnselectedItems(newUnselectedIds)
    setSelectedCount(newSelectedIds.size)
  }

  const handleSubmitSelection = () => {
    const inputValue = numberInputRef.current?.value || '0'
    const targetCount = parseInt(inputValue, 10)
    
    setSelectedItems(new Set())
    setUnselectedItems(new Set())
    setSelectedCount(targetCount)
    overlayPanelRef.current?.hide()
    setCurrentPage(1)
  }

  const resetSelections = () => {
    setSelectedItems(new Set())
    setUnselectedItems(new Set())
    setSelectedCount(0)
    toastRef.current?.show({
      severity: 'info',
      summary: 'Selection Cleared',
      detail: 'All item selections have been reset'
    })
  }

  // check which items on current page are selected
  const currentPageItemIds = artworks.map(artwork => artwork.id)
  const selectedOnCurrentPage = currentPageItemIds.filter(id => 
    selectedItems.has(id) && !unselectedItems.has(id)
  )
  const areAllCurrentPageItemsSelected = selectedOnCurrentPage.length === currentPageItemIds.length && currentPageItemIds.length > 0

  const renderHeaderCheckbox = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Checkbox
        checked={areAllCurrentPageItemsSelected}
        onChange={(e) => {
          const newSelectedIds = new Set(selectedItems)
          const newUnselectedIds = new Set(unselectedItems)
          
          artworks.forEach(artwork => {
            if (e.checked) {
              newSelectedIds.add(artwork.id)
              newUnselectedIds.delete(artwork.id)
            } else {
              newSelectedIds.delete(artwork.id)
              newUnselectedIds.add(artwork.id)
            }
          })
          
          setSelectedItems(newSelectedIds)
          setUnselectedItems(newUnselectedIds)
          setSelectedCount(newSelectedIds.size)
        }}
      />
      <span 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        onClick={(e) => overlayPanelRef.current?.toggle(e)}
      >
        <ChevronDownIcon />
      </span>
    </div>
  )

  const getSelectedArtworks = () => {
    return artworks.filter(artwork => 
      selectedItems.has(artwork.id) && !unselectedItems.has(artwork.id)
    )
  }

  return (
    <div className="p-4">
      <Toast ref={toastRef} />
      
      <OverlayPanel ref={overlayPanelRef} dismissable>
        <div className="flex flex-col gap-2">
          <InputText 
            placeholder="How many rows to select?"
            type="number"
            ref={numberInputRef}
          />
          <Button 
            label="Apply Selection"
            onClick={handleSubmitSelection}
            size="small"
          />
        </div>
      </OverlayPanel>
      
      <div style={{
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Selected Items: {getSelectedArtworks().length}</span>
        <Button 
          label="Reset All" 
          onClick={resetSelections}
          severity="secondary"
          size="small"
          outlined
        />
      </div>

      <DataTable
        value={artworks}
        paginator
        rows={ITEMS_PER_PAGE}
        first={(currentPage - 1) * ITEMS_PER_PAGE}
        totalRecords={totalItems}
        lazy
        onPage={handlePageChange}
        loading={isLoading}
        dataKey="id"
        selectionMode="multiple"
        selection={getSelectedArtworks()}
        onSelectionChange={handleSelectionChange}
        onRowSelect={handleRowSelect}
        onRowUnselect={handleRowUnselect}
        className="artwork-table"
      >
        <Column 
          selectionMode="multiple"
          header={renderHeaderCheckbox()}
          style={{ width: '3rem' }}
        />
        <Column field="id" header="ID" sortable />
        <Column field="title" header="Artwork Title" />
        <Column field="artist_display" header="Artist" />
      </DataTable>
    </div>
  )
}

export default App
