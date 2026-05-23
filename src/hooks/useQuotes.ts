import { useQuery } from '@tanstack/react-query'

export interface Quote {
  id: number
  quote: string
  author: string
}

export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: async (): Promise<Quote[]> => {
      const res = await fetch('https://dummyjson.com/quotes?limit=150')
      const data = await res.json() as { quotes: Quote[] }
      return data.quotes
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
