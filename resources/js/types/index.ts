export interface User {
  id: number
  name: string
  email: string
}

export type WidgetIcon = 'none' | 'search' | 'sparkle' | 'search-ai' | 'arrow'

export interface WidgetFieldMap {
  title?: string
  snippet?: string
  url?: string
  image?: string
  price?: string
}

export interface WidgetConfig {
  template: 'minimal' | 'card' | 'block' | 'product'
  accent: string
  placeholder: string
  theme: 'light' | 'dark' | 'auto'
  radius: 'sharp' | 'rounded' | 'pill'
  iconLeft: WidgetIcon
  iconRight: WidgetIcon
  bgColor?: string
  fieldMap?: WidgetFieldMap
}

export interface Site {
  id: number
  name: string
  url: string
  site_id: string
  azure_index_name: string
  azure_endpoint: string
  widget_config: WidgetConfig | null
  created_at: string
  updated_at: string
}

export interface SearchResult {
  id: string
  title: string
  snippet: string
  url: string
  image: string
  price: string
  score: number
}

export interface IndexStats {
  documentCount: number
  storageSize: number
}

export interface IndexField {
  name: string
  type: string
  key: boolean
  searchable: boolean
  filterable: boolean
  sortable: boolean
  facetable: boolean
}

export interface ApiKey {
  id: number
  name: string
  key: string
  last_used_at: string | null
  created_at: string
}

export interface PageProps {
  auth: {
    user: User
  }
  [key: string]: unknown
}
