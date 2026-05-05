export interface Doc {
  id: string
  title: string
  content: string
}

// settings are stored in localstorage
export interface Settings {
  creatorUsername: string
  categoryId: number | null
}
